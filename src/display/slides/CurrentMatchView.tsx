import type { Court } from '../../types'
import { resolveTeam } from '../../lib/results'

function CourtCard({ court, courts }: { court: Court; courts: Court[] }) {
  const match = court.rows[court.current]
  const next = court.rows[court.current + 1]
  const finished = court.current >= court.rows.length
  const notStarted = court.current < 0

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-4 border-slate-800 bg-white shadow-lg">
      <div
        className="px-4 py-2 text-center text-[28px] font-extrabold text-white"
        style={{ backgroundColor: court.color }}
      >
        {court.id}コート（{court.label}）
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-4">
        {finished ? (
          <div className="text-[36px] font-bold text-slate-500">全試合終了</div>
        ) : notStarted || !match ? (
          <div className="text-[36px] font-bold text-slate-500">開始前</div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-slate-800 px-4 py-0.5 text-[20px] font-bold text-white">
                {match.code}
              </div>
              {match.time && (
                <div className="text-[20px] font-bold text-slate-500">{match.time}</div>
              )}
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-[64px] font-extrabold text-slate-900">{resolveTeam(match.left, courts)}</span>
              <span className="text-[28px] font-bold text-slate-400">vs</span>
              <span className="text-[64px] font-extrabold text-slate-900">{resolveTeam(match.right, courts)}</span>
            </div>
            {next && (
              <div className="text-[20px] font-semibold text-slate-500">
                次の試合: {next.code} {resolveTeam(next.left, courts)} vs {resolveTeam(next.right, courts)}
                {next.time && `（${next.time}）`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function CurrentMatchView({ courts }: { courts: Court[] }) {
  return (
    <div className="flex h-full w-full flex-col bg-slate-100">
      <div className="bg-[#1e50a2] px-8 py-3 text-center text-[44px] font-extrabold tracking-widest text-white">
        現在の試合
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-5 p-6">
        {courts.map((c) => (
          <CourtCard key={c.id} court={c} courts={courts} />
        ))}
      </div>
    </div>
  )
}
