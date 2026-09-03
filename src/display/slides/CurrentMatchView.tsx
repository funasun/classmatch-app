import type { Court } from '../../types'
import { courtHeading, resolveTeam } from '../../lib/results'

function CourtCard({
  court,
  courts,
  dense,
}: {
  court: Court
  courts: Court[]
  /** コート数が多いときは文字を小さめにして収める */
  dense: boolean
}) {
  const match = court.rows[court.current]
  const next = court.rows[court.current + 1]
  const empty = court.rows.length === 0
  const finished = !empty && court.current >= court.rows.length
  const notStarted = court.current < 0
  const teamCls = dense ? 'text-[44px]' : 'text-[64px]'
  const stateCls = dense ? 'text-[28px]' : 'text-[36px]'

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border-4 border-slate-800 bg-white shadow-lg">
      <div
        className={`px-4 py-2 text-center font-extrabold text-white ${dense ? 'text-[22px]' : 'text-[28px]'}`}
        style={{ backgroundColor: court.color }}
      >
        {court.id}コート（{courtHeading(court)}）
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-3">
        {empty ? (
          <div className={`${stateCls} font-bold text-slate-400`}>試合未登録</div>
        ) : finished ? (
          <div className={`${stateCls} font-bold text-slate-500`}>全試合終了</div>
        ) : notStarted || !match ? (
          <div className={`${stateCls} font-bold text-slate-500`}>開始前</div>
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
              <span className={`${teamCls} font-extrabold text-slate-900`}>
                {resolveTeam(match.left, courts, court)}
              </span>
              <span className="text-[28px] font-bold text-slate-400">vs</span>
              <span className={`${teamCls} font-extrabold text-slate-900`}>
                {resolveTeam(match.right, courts, court)}
              </span>
            </div>
            {next && (
              <div className={`${dense ? 'text-[16px]' : 'text-[20px]'} font-semibold text-slate-500`}>
                次の試合: {next.code} {resolveTeam(next.left, courts, court)} vs{' '}
                {resolveTeam(next.right, courts, court)}
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
  // コート数に応じて格子の列数を決める（6コートまでは3列×2行）
  const n = courts.length
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 6 ? 3 : 4
  const rows = Math.max(1, Math.ceil(n / cols))
  return (
    <div className="flex h-full w-full flex-col bg-slate-100">
      <div className="bg-[#1e50a2] px-8 py-3 text-center text-[44px] font-extrabold tracking-widest text-white">
        現在の試合
      </div>
      <div
        className="grid min-h-0 flex-1 gap-5 p-6"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {courts.map((c) => (
          <CourtCard key={c.id} court={c} courts={courts} dense={n > 6} />
        ))}
        {n === 0 && (
          <div className="flex items-center justify-center text-[32px] font-bold text-slate-400">
            コートが登録されていません
          </div>
        )}
      </div>
    </div>
  )
}
