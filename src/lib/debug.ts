export interface DebugEntry {
  time: string
  message: string
}

type Listener = (entries: DebugEntry[]) => void

const entries: DebugEntry[] = []
const listeners = new Set<Listener>()

export function debugLog(message: string) {
  const time = new Date().toLocaleTimeString('ja-JP')
  entries.push({ time, message })
  if (entries.length > 50) entries.shift()
  listeners.forEach((l) => l([...entries]))
  if (isDebugMode()) console.info(`[debug ${time}] ${message}`)
}

export function subscribeDebug(listener: Listener): () => void {
  listeners.add(listener)
  listener([...entries])
  return () => listeners.delete(listener)
}

export function isDebugMode(): boolean {
  // HashRouter では「/#/?debug=1」の形になるため、search と hash 内の両方を見る
  if (new URLSearchParams(window.location.search).has('debug')) return true
  const hashQuery = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(hashQuery).has('debug')
}
