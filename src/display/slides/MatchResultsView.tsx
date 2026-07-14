import { Fragment } from 'react'
import type { Court, MatchResultsSlide } from '../../types'
import { pageSlice } from '../frames'
import { FitScale } from '../../components/FitScale'
import { isRecentlyChanged } from '../../lib/changes'

/** 16進カラーに透明度を掛けた淡色を作る */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const cellBase =
  'border border-slate-900 px-3 text-center font-bold whitespace-nowrap'

const STAGE_COLORS: Record<string, string> = {
  予選リーグ: '#305496',
  順位決定トーナメント: '#548235',
  決勝: '#bf8f00',
}

function CourtTable({ court, page, pages }: { court: Court; page: number; pages: number }) {
  const rows = pageSlice(court.rows, page, pages)
  const offset = page * Math.ceil(court.rows.length / pages)

  return (
    <table className="border-collapse text-[26px] leading-tight">
      <thead>
        <tr>
          <th
            colSpan={7}
            className="border-2 border-slate-900 py-1.5 text-[30px] font-extrabold text-white"
            style={{ backgroundColor: court.color }}
          >
            {court.id}コート（{court.label}）
          </th>
        </tr>
        <tr className="text-[20px]">
          {['時刻', 'コード', 'クラス', '点数', '', '点数', 'クラス'].map((h, i) => (
            <th key={i} className={`${cellBase} bg-white py-0.5`}>
              {i === 4 ? <span className="text-[16px]">vs</span> : h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const rowIndex = offset + i
          const isCurrent = rowIndex === court.current
          const changed = isRecentlyChanged(court.id, rowIndex)
          const showBand = r.stage && (i === 0 || rows[i - 1].stage !== r.stage)
          const scoreBg = changed ? '#fef08a' : '#ffffff'
          return (
            <Fragment key={rowIndex}>
              {showBand && (
                <tr>
                  <td
                    colSpan={7}
                    className="border border-slate-900 py-0.5 text-center text-[19px] font-extrabold tracking-widest text-white"
                    style={{ backgroundColor: STAGE_COLORS[r.stage!] ?? '#475569' }}
                  >
                    {r.stage}
                  </td>
                </tr>
              )}
              <tr className={isCurrent ? 'outline outline-4 outline-red-500' : ''}>
                <td className={`${cellBase} bg-white py-1 text-[19px]`}>{r.time}</td>
                <td className={`${cellBase} py-1`} style={{ backgroundColor: '#c6e0b4' }}>
                  {r.code}
                </td>
                <td className={`${cellBase} py-1`} style={{ backgroundColor: tint(court.color, 0.22) }}>
                  {r.left}
                </td>
                <td className={`${cellBase} relative min-w-[70px] py-1`} style={{ backgroundColor: scoreBg }}>
                  {r.leftScore}
                </td>
                <td className={`${cellBase} bg-white py-1 text-[18px]`}>
                  {changed ? (
                    <span className="rounded bg-red-600 px-1 text-[14px] font-extrabold text-white">
                      更新
                    </span>
                  ) : (
                    'vs'
                  )}
                </td>
                <td className={`${cellBase} min-w-[70px] py-1`} style={{ backgroundColor: scoreBg }}>
                  {r.rightScore}
                </td>
                <td className={`${cellBase} py-1`} style={{ backgroundColor: tint(court.color, 0.22) }}>
                  {r.right}
                </td>
              </tr>
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

export function MatchResultsView({
  slide,
  courts,
  page,
  pages,
}: {
  slide: MatchResultsSlide
  courts: Court[]
  page: number
  pages: number
}) {
  const shown = courts.filter((c) => slide.courts.includes(c.id))
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center gap-6 bg-[#1e50a2] px-8 py-3 text-white">
        <span className="text-[40px] font-extrabold tracking-wider">進行表・試合結果速報</span>
        {slide.note && <span className="text-[20px] opacity-90">{slide.note}</span>}
      </div>
      <div className="min-h-0 flex-1 p-4">
        <FitScale>
          <div className="flex items-start gap-10">
            {shown.map((c) => (
              <CourtTable key={c.id} court={c} page={page} pages={pages} />
            ))}
          </div>
        </FitScale>
      </div>
    </div>
  )
}
