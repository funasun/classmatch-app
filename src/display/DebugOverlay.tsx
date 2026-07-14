import { useEffect, useState } from 'react'
import { subscribeDebug, type DebugEntry } from '../lib/debug'

export function DebugOverlay() {
  const [entries, setEntries] = useState<DebugEntry[]>([])
  useEffect(() => subscribeDebug(setEntries), [])

  return (
    <div className="absolute bottom-4 right-2 z-[60] max-h-[40vh] w-[420px] overflow-y-auto rounded-lg bg-black/75 p-2 font-mono text-[11px] leading-snug text-green-300">
      <div className="mb-1 font-bold text-white">デバッグログ (?debug=1)</div>
      {entries.slice(-20).map((e, i) => (
        <div key={i}>
          <span className="text-slate-400">{e.time}</span> {e.message}
        </div>
      ))}
    </div>
  )
}
