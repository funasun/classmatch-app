import type { Court, StandingsSlide } from '../../types'
import { FitScale } from '../../components/FitScale'
import { leagueTables, rankRuleLabel, rankRuleOf, type LeagueTable } from '../../lib/standings'
import { courtHeading } from '../../lib/results'

const cell = 'border-2 border-slate-900 px-3 py-1 text-center font-bold whitespace-nowrap'

function LeagueTableView({ table, court }: { table: LeagueTable; court: Court }) {
  const usePoints = rankRuleOf(court) === 'points'
  const headers = ['順位', 'クラス', '試合', '勝', '負', '分', ...(usePoints ? ['勝点'] : []), '得点', '失点', '得失差']
  return (
    <table className="border-collapse text-[24px] leading-tight">
      <thead>
        <tr>
          <th
            colSpan={headers.length}
            className="border-2 border-slate-900 py-1 text-[24px] font-extrabold text-white"
            style={{ backgroundColor: court.color }}
          >
            {table.name}
            <span className="ml-3 text-[18px] font-bold opacity-90">
              {table.complete ? '全試合終了' : `${table.done}/${table.total}試合`}
            </span>
          </th>
        </tr>
        <tr className="text-[18px]">
          {headers.map((h) => (
            <th key={h} className={`${cell} bg-white py-0.5`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((r) => (
          <tr key={r.team} className={r.rank === 1 && table.complete ? 'bg-yellow-100' : 'bg-white'}>
            <td className={cell}>{r.rank}</td>
            <td className={`${cell} text-[26px]`}>{r.team}</td>
            <td className={cell}>{r.played}</td>
            <td className={cell}>{r.won}</td>
            <td className={cell}>{r.lost}</td>
            <td className={cell}>{r.drawn}</td>
            {usePoints && <td className={`${cell} text-[26px]`}>{r.pts}</td>}
            <td className={cell}>{r.pf}</td>
            <td className={cell}>{r.pa}</td>
            <td className={cell}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
          </tr>
        ))}
        {table.rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} className={`${cell} text-slate-400`}>
              まだ試合がありません
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

/** 1コートぶんの順位表（リーグが複数あれば横に並べる）。スマホ版でも使う */
export function StandingsBlock({ court }: { court: Court }) {
  const tables = leagueTables(court)
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-baseline gap-4">
        <div className="rounded-lg px-4 py-1 text-[28px] font-extrabold text-white" style={{ backgroundColor: court.color }}>
          {court.id}コート（{courtHeading(court)}）
        </div>
        <span className="text-[16px] font-bold text-slate-500">{rankRuleLabel(court)} の順</span>
      </div>
      {tables.length === 0 ? (
        <div className="text-[22px] font-bold text-slate-400">
          リーグ戦の行がありません（区分に「リーグ」を含めるか、リーグ列に名前を入れてください）
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          {tables.map((t) => (
            <LeagueTableView key={t.name} table={t} court={court} />
          ))}
        </div>
      )}
    </div>
  )
}

export function StandingsView({ slide, courts }: { slide: StandingsSlide; courts: Court[] }) {
  const shown = courts.filter((c) => slide.courts.includes(c.id))
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center gap-6 bg-[#1e50a2] px-8 py-3 text-white">
        <span className="text-[40px] font-extrabold tracking-wider">{slide.title}</span>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <FitScale>
          <div className="flex items-start gap-12">
            {shown.map((c) => (
              <StandingsBlock key={c.id} court={c} />
            ))}
            {shown.length === 0 && (
              <div className="text-[32px] font-bold text-slate-400">表示するコートが選ばれていません</div>
            )}
          </div>
        </FitScale>
      </div>
    </div>
  )
}
