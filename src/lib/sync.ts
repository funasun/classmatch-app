import type { AppState } from '../types'
import { createInitialState, normalizeState } from '../data/initialState'
import { API_BASE, POLL_INTERVAL_MS } from './config'
import { debugLog } from './debug'

const CACHE_KEY = 'classmatch-state-cache'

export interface SyncBackend {
  /** 状態の変更を購読する。初回は即座に現在値が届く */
  subscribe(cb: (state: AppState) => void): () => void
  /** 保存（管理画面から）。成功したら true */
  save(state: AppState, passcode: string): Promise<boolean>
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
 *  Xserver 未設定でも同一PC内で管理画面→表示画面の同期を確認できる */
class LocalBackend implements SyncBackend {
  readonly mode = 'local' as const
  private channel = new BroadcastChannel('classmatch-sync')

  subscribe(cb: (state: AppState) => void): () => void {
    const current = normalizeState(readCache() ?? createInitialState())
    writeCache(current)
    cb(current)
    debugLog('同期: ローカルモードで開始（VITE_API_BASE 未設定）')
    const handler = (ev: MessageEvent) => cb(normalizeState(ev.data as AppState))
    this.channel.addEventListener('message', handler)
    return () => this.channel.removeEventListener('message', handler)
  }

  async save(state: AppState): Promise<boolean> {
    writeCache(state)
    this.channel.postMessage(state)
    return true
  }
}

/** リモートモード：Xserver の state.php を1.5秒間隔でポーリング。
 *  失敗時は最後に取得した内容（キャッシュ）で表示を継続する */
class RemoteBackend implements SyncBackend {
  readonly mode = 'remote' as const
  private lastVersion = 0
  private failureLogged = false

  subscribe(cb: (state: AppState) => void): () => void {
    const cached = readCache()
    if (cached) {
      this.lastVersion = cached.version
      cb(normalizeState(cached))
      debugLog(`同期: キャッシュから復元 (v${cached.version})`)
    }

    let stopped = false
    const poll = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/state.php?known=${this.lastVersion}`,
          { cache: 'no-store' },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        if (this.failureLogged) {
          this.failureLogged = false
          debugLog('同期: 通信が回復しました')
        }
        if (!body.unchanged) {
          const state = normalizeState(body as AppState)
          this.lastVersion = state.version
          writeCache(state)
          if (!stopped) cb(state)
          debugLog(`同期: 更新を受信 (v${state.version})`)
        }
      } catch (e) {
        if (!this.failureLogged) {
          this.failureLogged = true
          debugLog(`同期: 取得失敗、キャッシュ表示を継続 (${String(e)})`)
        }
      }
    }
    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }

  async save(state: AppState, passcode: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/state.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, state }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      this.lastVersion = state.version
      writeCache(state)
      debugLog(`同期: 保存成功 (v${state.version})`)
      return true
    } catch (e) {
      debugLog(`同期: 保存失敗 (${String(e)})`)
      return false
    }
  }
}

export const backend: SyncBackend = API_BASE ? new RemoteBackend() : new LocalBackend()
