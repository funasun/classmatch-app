import type { BracketSlide, Court } from '../../types'
import { FitScale } from '../../components/FitScale'
import {
  BOX_H,
  BOX_W,
  COL_GAP,
  buildTree,
  layoutTree,
  tournamentRoots,
  type BracketNode,
} from '../../lib/bracket'
import { courtHeading } from '../../lib/results'

/** 子（左）から親（右）へのカギ線。勝ち上がった側はコート色で太く */
function Edge({ from, to, strong, color }: { from: BracketNode; to: BracketNode; strong: boolean; color: string }) {
  const x1 = from.x + BOX_W
  const y1 = from.y + BOX_H / 2
  const x2 = to.x
  const y2 = to.y + BOX_H / 2
  const midX = x1 + COL_GAP / 2
  const w = strong ? 6 : 3
  const bg = strong ? color : '#94a3b8'
  const top = Math.min(y1, y2)
  return (
    <>
      <div className="absolute" style={{ left: x1, top: y1 - w / 2, width: midX - x1, height: w, backgroundColor: bg }} />
      <div className="absolute" style={{ left: midX - w / 2, top: top - w / 2, width: w, height: Math.abs(y2 - y1) + w, backgroundColor: bg }} />
      <div className="absolute" style={{ left: midX, top: y2 - w / 2, width: x2 - midX, height: w, backgroundColor: bg }} />
    </>
  )
}

function NodeBox({ n, color }: { n: BracketNode; color: string }) {
  const pos = { left: n.x, top: n.y, width: BOX_W, height: BOX_H }
  if (n.kind === 'team') {
    return (
      <div
        className={`absolute flex flex-col items-center justify-center rounded-lg border-[3px] px-2 leading-tight ${
          n.pending ? 'border-dashed border-slate-400 bg-slate-50 text-slate-400' : 'border-slate-800 bg-white text-slate-900'
        }`}
        style={pos}
      >
        <span className={`${n.pending ? 'text-[20px] font-bold' : 'text-[28px] font-extrabold'}`}>{n.label}</span>
        {n.note && !n.pending && <span className="text-[13px] font-bold text-slate-400">{n.note}</span>}
        {n.loserRef && n.pending && <span className="text-[13px] font-bold">（敗者が進む）</span>}
      </div>
    )
  }
  const decided = n.winner !== 'none'
  return (
    <div
      className="absolute flex flex-col items-center justify-center rounded-lg border-[3px] border-slate-800 bg-white px-2 leading-tight"
      style={pos}
    >
      <span className="text-[13px] font-bold text-slate-500">
        {n.code}
        {n.time && <span className="ml-2">{n.time}</span>}
      </span>
      <span className={`text-[26px] font-extrabold ${decided ? '' : 'text-slate-300'}`} style={decided ? { color } : undefined}>
        {decided ? n.label : 'vs'}
      </span>
      {n.score && <span className="text-[14px] font-bold text-slate-600">{n.score}</span>}
    </div>
  )
}

/** 1コートぶんのトーナメント図（頂点ごとに1つの山）。スマホ版でも使う */
export function BracketBlock({ court, courts }: { court: Court; courts: Court[] }) {
  const trees = tournamentRoots(court, courts).map((row) => ({
    row,
    layout: layoutTree(buildTree(row, court, courts)),
  }))
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="rounded-lg px-4 py-1 text-[28px] font-extrabold text-white" style={{ backgroundColor: court.color }}>
        {court.id}コート（{courtHeading(court)}）
      </div>
      {trees.length === 0 ? (
        <div className="text-[22px] font-bold text-slate-400">
          トーナメントの試合がありません（区分に「リーグ」を含まない行が対象です）
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-14 gap-y-8" style={{ maxWidth: 1540 }}>
          {trees.map(({ row, layout }) => (
            <div key={row.code} className="flex flex-col gap-2">
              <div className="text-[24px] font-extrabold" style={{ color: court.color }}>
                {row.stage?.trim() || row.code}
              </div>
              <div className="relative" style={{ width: layout.width, height: layout.height }}>
                {layout.nodes.map((n) =>
                  n.children.map((c, i) => (
                    <Edge
                      key={`${n.key}-${c.key}`}
                      from={c}
                      to={n}
                      strong={n.winner === (i === 0 ? 'left' : 'right')}
                      color={court.color}
                    />
                  )),
                )}
                {layout.nodes.map((n) => (
                  <NodeBox key={n.key} n={n} color={court.color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** トーナメント表スライド。1ページ＝1コート */
export function BracketView({ slide, courts, page }: { slide: BracketSlide; courts: Court[]; page: number }) {
  const shown = courts.filter((c) => slide.courts.includes(c.id))
  const court = shown[page] ?? shown[0]
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center gap-6 bg-[#1e50a2] px-8 py-3 text-white">
        <span className="text-[40px] font-extrabold tracking-wider">{slide.title}</span>
        <span className="text-[20px] opacity-90">勝った側の線が太くなり、勝ち上がりが自動で埋まります</span>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <FitScale>
          {court ? (
            <BracketBlock court={court} courts={courts} />
          ) : (
            <div className="text-[32px] font-bold text-slate-400">表示するコートが選ばれていません</div>
          )}
        </FitScale>
      </div>
    </div>
  )
}
