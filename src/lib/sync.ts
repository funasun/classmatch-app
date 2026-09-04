import type { AppState } from '../types'
import { createInitialState, normalizeState } from '../data/initialState'
import { ADMIN_PASSCODE, FIREBASE_ADMIN_EMAIL, FIREBASE_ENABLED, SYNC_ENABLED, SYNC_URL } from './config'
import { debugLog } from './debug'

const CACHE_KEY = 'classmatch-state-cache'
/** Cloudflare モードで、ログイン済みの合言葉を同じタブの間だけ覚えておくキー */
const PASS_KEY = 'classmatch-sync-pass'

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

/** Cloudflare モード：worker/ の同期サーバに WebSocket でつなぎ、更新を push で受け取る。
 *  WebSocket が通らない環境では 90 秒ごとのポーリングに自動で切り替える。
 *  保存は合言葉つきの POST（12 秒で打ち切り＝赤バッジ）。 */
class CloudflareBackend implements SyncBackend {
  readonly mode = 'remote' as const
  private lastSentJson: string | null = null
  private sentJson = new Set<string>()
  private passcode: string | null = sessionStorage.getItem(PASS_KEY)

  subscribe(cb: (state: AppState) => void): () => void {
    const cached = readCache()
    if (cached) {
      cb(normalizeState(cached))
      debugLog(`同期: キャッシュから復元 (v${cached.version})`)
    }

    let stopped = false
    let ws: WebSocket | null = null
    let retry = 0
    let pollTimer: number | null = null

    const handleJson = (json: string | null) => {
      if (json == null) {
        debugLog('同期: サーバにデータ未作成（管理画面での初回保存で作られます）')
        if (!cached) cb(normalizeState(createInitialState()))
        return
      }
      // 自分が保存した古い折り返し（echo）は無視する（新しい編集の巻き戻り防止）
      if (json !== this.lastSentJson && this.sentJson.has(json)) return
      try {
        const state = normalizeState(JSON.parse(json) as AppState)
        writeCache(state)
        cb(state)
        debugLog(`同期: 更新を受信 (v${state.version})`)
      } catch (e) {
        debugLog(`同期: 受信データの解析に失敗 (${String(e)})`)
      }
    }

    const poll = async () => {
      try {
        const r = await fetch(`${SYNC_URL}/state`, { cache: 'no-store' })
        const d = (await r.json()) as { json?: string | null }
        handleJson(d.json ?? null)
      } catch (e) {
        debugLog(`同期: ポーリング失敗 (${String(e)})`)
      }
    }
    // ポーリングは WebSocket がつながらない間だけ（無料枠を守るため間隔は長め）
    const startPolling = () => {
      if (pollTimer !== null) return
      void poll()
      pollTimer = window.setInterval(poll, 90_000)
    }
    const stopPolling = () => {
      if (pollTimer === null) return
      clearInterval(pollTimer)
      pollTimer = null
    }

    const scheduleRetry = () => {
      if (stopped) return
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(retry++, 5))
      debugLog(`同期: 切断、${Math.round(delay / 1000)}秒後に再接続します`)
      startPolling()
      setTimeout(connect, delay)
    }

    const connect = () => {
      if (stopped) return
      try {
        ws = new WebSocket(`${SYNC_URL.replace(/^http/, 'ws')}/ws`)
      } catch (e) {
        debugLog(`同期: 接続できません (${String(e)})`)
        scheduleRetry()
        return
      }
      ws.onopen = () => {
        retry = 0
        stopPolling()
        debugLog('同期: サーバに接続しました（WebSocket）')
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; json?: string | null }
          if (msg.type === 'state') handleJson(msg.json ?? null)
        } catch {
          /* pong など */
        }
      }
      ws.onclose = () => {
        ws = null
        scheduleRetry()
      }
      ws.onerror = () => {
        ws?.close()
      }
    }

    // 中継機器に切られないよう 25 秒ごとに keepalive
    const pingTimer = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send('ping')
    }, 25_000)
    // タブが復帰したときに切れていればすぐつなぎ直す
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !ws) connect()
    }
    document.addEventListener('visibilitychange', onVisible)

    connect()
    return () => {
      stopped = true
      clearInterval(pingTimer)
      stopPolling()
      document.removeEventListener('visibilitychange', onVisible)
      ws?.close()
    }
  }

  async save(state: AppState): Promise<boolean> {
    const json = JSON.stringify(state)
    this.lastSentJson = json
    this.sentJson.add(json)
    if (this.sentJson.size > 40) {
      this.sentJson = new Set([...this.sentJson].slice(-20))
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12_000)
    try {
      const r = await fetch(`${SYNC_URL}/state`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.passcode ?? ''}`,
        },
        body: JSON.stringify({ version: state.version, updatedAt: state.updatedAt, json }),
        signal: ctrl.signal,
      })
      if (!r.ok) {
        debugLog(`同期: 保存失敗 (HTTP ${r.status}${r.status === 401 ? '・合言葉が違います' : ''})`)
        return false
      }
      writeCache(state)
      debugLog(`同期: 保存成功 (v${state.version})`)
      return true
    } catch (e) {
      debugLog(`同期: 保存失敗 (${ctrl.signal.aborted ? '保存タイムアウト（サーバへ届いていません）' : String(e)})`)
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async verifyPasscode(passcode: string): Promise<boolean> {
    try {
      const r = await fetch(`${SYNC_URL}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (!r.ok) return false
      this.passcode = passcode
      sessionStorage.setItem(PASS_KEY, passcode)
      return true
    } catch (e) {
      debugLog(`認証: サーバに接続できません (${String(e)})`)
      return false
    }
  }
}

export const backend: SyncBackend = SYNC_ENABLED
  ? new CloudflareBackend()
  : FIREBASE_ENABLED
    ? new FirebaseBackend()
    : new LocalBackend()
