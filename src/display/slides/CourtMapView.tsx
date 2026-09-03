import type { Court } from '../../types'

/** コート配置図。コートを「場所」ごとにまとめて並べる。
 *  各コート枠は state のコート情報（色・名前・競技）から描くので、
 *  コートを増やしたり場所を変えたりしてもそのまま追従する */

function CourtBox({ court }: { court: Court }) {
  return (
    <div
      className="flex min-w-[160px] flex-1 flex-col items-center justify-center rounded-2xl border-4 border-slate-800 px-4 py-4 text-white shadow"
      style={{ backgroundColor: court.color || '#64748b' }}
    >
      <span className="text-[64px] font-black leading-none drop-shadow">{court.id}</span>
      <span className="mt-2 text-[30px] font-extrabold">{court.label || court.id}</span>
      {court.sport?.trim() && (
        <span className="text-[22px] font-bold opacity-90">{court.sport}</span>
      )}
    </div>
  )
}

/** ゾーンの見出し（体育館 / 野外 など） */
function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded-lg border-2 border-slate-400 bg-slate-100 px-4 py-1 text-center text-[26px] font-extrabold text-slate-700">
      {children}
    </div>
  )
}

export function CourtMapView({ courts }: { courts: Court[] }) {
  // 場所が未設定のコートは「会場」にまとめる
  const zones = new Map<string, Court[]>()
  for (const c of courts) {
    const key = c.place?.trim() || '会場'
    const list = zones.get(key)
    if (list) list.push(c)
    else zones.set(key, [c])
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="bg-[#1e50a2] px-8 py-3 text-center text-[44px] font-extrabold tracking-widest text-white">
        コート配置図
      </div>

      <div className="flex min-h-0 flex-1 gap-8 p-6">
        {[...zones].map(([place, list]) => {
          // 2コートまでは縦1列、6コートまでは2列、それ以上は3列
          const cols = list.length <= 2 ? 1 : list.length <= 6 ? 2 : 3
          return (
            <div key={place} className="flex min-w-0 flex-col" style={{ flex: cols }}>
              <ZoneLabel>{place}</ZoneLabel>
              <div
                className="grid flex-1 gap-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {list.map((c) => (
                  <CourtBox key={c.id} court={c} />
                ))}
              </div>
            </div>
          )
        })}
        {courts.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-[32px] font-bold text-slate-400">
            コートが登録されていません
          </div>
        )}
      </div>
    </div>
  )
}
