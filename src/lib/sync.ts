import type { AppState } from '../types'
import { createInitialState, normalizeState } from '../data/initialState'
import { ADMIN_PASSCODE, FIREBASE_ADMIN_EMAIL, FIREBASE_ENABLED } from './config'
import { debugLog } from './debug'

const CACHE_KEY = 'classmatch-state-cache'

export interface SyncBackend {
  /** 状態の変更を購読する。初回は即座に現在値が届く */
  subscribe(cb: (state: AppState) => void): () => void
  /** 保存（管理画面から）。成功したら true */
  save(state: AppState): Promise<boolean>
  /** 管理画面に入る合言葉の確認（Firebaseモードではログインを兼ねる） */
  verifyPasscode(passcode: string): Promise<boolean>
  readonly mode: 'remote' | 'local'
}

function readCache(): AppState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AppState) : null
  } catch {
    return null
  }
}

function writeCache(state: AppState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state))
  } catch {
    /* 容量超過などは無視（表示継続を優先） */
  }
}

/** ローカルモード：localStorage + BroadcastChannel。
 *  Firebase 未設定でも同一PC内で管理画面→表示画面の同期を確認できる */
class LocalBackend implements SyncBackend {
  readonly mode = 'local' as const
  private channel = new BroadcastChannel('classmatch-sync')

  subscribe(cb: (state: AppState) => void): () => void {
    const current = normalizeState(readCache() ?? createInitialState())
    writeCache(current)
    cb(current)
    debugLog('同期: ローカルモードで開始（Firebase 未設定）')
    const handler = (ev: MessageEvent) => cb(normalizeState(ev.data as AppState))
    this.channel.addEventListener('message', handler)
    return () => this.channel.removeEventListener('message', handler)
  }

  async save(state: AppState): Promise<boolean> {
    writeCache(state)
    this.channel.postMessage(state)
    return true
  }

  async verifyPasscode(passcode: string): Promise<boolean> {
    return passcode === ADMIN_PASSCODE
  }
}

/** リモートモード：Firestore のリアルタイム購読。
 *  更新は1秒未満でエルモ側へ push 配信され、切断時はキャッシュ表示を継続する。
 *  Firestore はネストした配列を保存できないため、状態は JSON 文字列1フィールドで持つ */
class FirebaseBackend implements SyncBackend {
  readonly mode = 'remote' as const
  private failureLogged = false
  /** 直近に自分が保存した JSON 文字列。最新の折り返し（echo）を見分ける */
  private lastSentJson: string | null = null
  /** 自分が保存した JSON の履歴。古い自分の echo を見分けて無視するのに使う。
   *  json には updatedAt が含まれ毎回一意なので、他端末の保存と衝突しない。 */
  private sentJson = new Set<string>()

  private async docRef() {
    const [{ doc }, { getFirebase }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase'),
    ])
    return doc(getFirebase().db, 'classmatch', 'state')
  }

  subscribe(cb: (state: AppState) => void): () => void {
    const cached = readCache()
    if (cached) {
      cb(normalizeState(cached))
      debugLog(`同期: キャッシュから復元 (v${cached.version})`)
    }

    let unsub: (() => void) | null = null
    let stopped = false

    ;(async () => {
      const [{ onSnapshot }, ref] = await Promise.all([
        import('firebase/firestore'),
        this.docRef(),
      ])
      if (stopped) return
      unsub = onSnapshot(
        ref,
        (snap) => {
          this.failureLogged = false
          const data = snap.data()
          if (!data?.json) {
            debugLog('同期: サーバにデータ未作成（管理画面での初回保存で作られます）')
            if (!cached) cb(normalizeState(createInitialState()))
            return
          }
          const json = data.json as string
          // 自分が保存した「古い」折り返し（echo）なら無視する（新しい編集の巻き戻り防止）。
          // 自分が出したものでない保存（＝他端末の更新）は常に受け入れるので、
          // 二台で編集しても確実に反映される（後勝ち）。
          if (json !== this.lastSentJson && this.sentJson.has(json)) {
            return
          }
          try {
            const state = normalizeState(JSON.parse(json) as AppState)
            writeCache(state)
            cb(state)
            debugLog(`同期: 更新を受信 (v${state.version})`)
          } catch (e) {
            debugLog(`同期: 受信データの解析に失敗 (${String(e)})`)
          }
        },
        (e) => {
          if (!this.failureLogged) {
            this.failureLogged = true
            debugLog(`同期: 接続エラー、キャッシュ表示を継続 (${String(e)})`)
          }
        },
      )
      debugLog('同期: Firestore のリアルタイム購読を開始')
    })()

    return () => {
      stopped = true
      unsub?.()
    }
  }

  async save(state: AppState): Promise<boolean> {
    try {
      const [{ setDoc }, { getFirebase }, ref] = await Promise.all([
        import('firebase/firestore'),
        import('./firebase'),
        this.docRef(),
      ])
      await getFirebase().auth.authStateReady()
      const json = JSON.stringify(state)
      // 保存前に「自分が出した JSON」として記録しておく。折り返しで戻ってきたときに
      // 自分の echo だと判別でき、古い echo なら無視して新しい編集を守れる。
      this.lastSentJson = json
      this.sentJson.add(json)
      // 覚えすぎないよう、直近ぶんだけ保持する
      if (this.sentJson.size > 40) {
        this.sentJson = new Set([...this.sentJson].slice(-20))
      }
      // 通信が遮断されていると setDoc は成功も失敗もせずに保留のままになり、
      // 「保存できている」と誤解する。一定時間で打ち切って失敗として扱い、
      // 画面に「保存できていません」を出して気づけるようにする。
      await Promise.race([
        setDoc(ref, {
          version: state.version,
          updatedAt: state.updatedAt,
          json,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('保存タイムアウト（サーバへ届いていません）')), 12000),
        ),
      ])
      writeCache(state)
      debugLog(`同期: 保存成功 (v${state.version})`)
      return true
    } catch (e) {
      debugLog(`同期: 保存失敗 (${String(e)})`)
      return false
    }
  }

  /** 合言葉 = Firebase の管理ユーザーのパスワード。ログイン成功＝合言葉一致 */
  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const [{ signInWithEmailAndPassword }, { getFirebase }] = await Promise.all([
        import('firebase/auth'),
        import('./firebase'),
      ])
      await signInWithEmailAndPassword(getFirebase().auth, FIREBASE_ADMIN_EMAIL, passcode)
      return true
    } catch (e) {
      debugLog(`認証: ログイン失敗 (${String(e)})`)
      return false
    }
  }
}

export const backend: SyncBackend = FIREBASE_ENABLED ? new FirebaseBackend() : new LocalBackend()
