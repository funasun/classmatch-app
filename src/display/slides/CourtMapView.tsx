import type { Court, CourtId } from '../../types'

/** パンフレット「試合コートについて」の図を再現。
 *  各コート枠は state のコート情報（色・学年名）から描く */

function CourtBox({
  court,
  id,
  hideLabel = false,
}: {
  court: Court | undefined
  id: CourtId
  hideLabel?: boolean
}) {
  return (
    <div
      className="flex min-w-[200px] flex-1 flex-col items-center justify-center rounded-2xl border-4 border-slate-800 px-4 py-5 text-white shadow"
      style={{ backgroundColor: court?.color ?? '#64748b' }}
    >
      <span className="text-[64px] font-black leading-none drop-shadow">{id}</span>
      {!hideLabel && (
        <span className="mt-2 text-[30px] font-extrabold">{court?.label ?? id}</span>
      )}
    </div>
  )
}

/** ゾーンの見出し（体育館 / 野外） */
function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 rounded-lg border-2 border-slate-400 bg-slate-100 px-4 py-1 text-center text-[26px] font-extrabold text-slate-700">
      {children}
    </div>
  )
}

export function CourtMapView({ courts }: { courts: Court[] }) {
  const byId = (id: CourtId) => courts.find((c) => c.id === id)
  const box = (id: CourtId) => <CourtBox id={id} court={byId(id)} />

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="bg-[#1e50a2] px-8 py-3 text-center text-[44px] font-extrabold tracking-widest text-white">
        コート配置図
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        {/* ＜決勝以外＞ */}
        <div className="flex flex-1 flex-col">
          <div className="mb-2 text-[28px] font-extrabold text-slate-800">＜決勝以外＞</div>
          <div className="flex flex-1 gap-8">
            {/* 体育館ゾーン：B/D・A/C の2×2 */}
            <div className="flex flex-[2] flex-col">
              <ZoneLabel>体育館</ZoneLabel>
              <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-4">
                {box('B')}
                {box('D')}
                {box('A')}
                {box('C')}
              </div>
            </div>
            {/* 野外（ハンドボールコート）ゾーン：E/F の縦2 */}
            <div className="flex flex-1 flex-col">
              <ZoneLabel>ハンドボールコート（野外）</ZoneLabel>
              <div className="grid flex-1 grid-rows-2 gap-4">
                {box('E')}
                {box('F')}
              </div>
            </div>
          </div>
        </div>

        {/* ＜決勝＞ */}
        <div className="flex flex-col">
          <div className="mb-2 text-[28px] font-extrabold text-slate-800">＜決勝＞</div>
          <div className="flex flex-col">
            <ZoneLabel>体育館</ZoneLabel>
            <div className="grid h-[150px] grid-cols-2 gap-4">
              <CourtBox id="B" court={byId('B')} hideLabel />
              <CourtBox id="A" court={byId('A')} hideLabel />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
