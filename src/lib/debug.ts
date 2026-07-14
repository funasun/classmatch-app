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
  return new URLSearchParams(window.location.search).has('debug')
}
