import { Fragment, type CSSProperties } from 'react'
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
  'border-2 border-slate-900 px-3 text-center font-bold whitespace-nowrap'

/** 現在の試合の行を囲む赤枠。border-collapse でも分断されないよう、
 *  outline ではなく各セルの罫線（幅の広い方が勝つ）として描く */
const RED = '4px solid #ef4444'
function currentBorder(
  isCurrent: boolean,
  pos: 'first' | 'last' | 'mid',
): CSSProperties {
  if (!isCurrent) return {}
  const s: CSSProperties = { borderTop: RED, borderBottom: RED }
  if (pos === 'first') s.borderLeft = RED
  if (pos === 'last') s.borderRight = RED
  return s
}

const STAGE_COLORS: Record<string, string> = {
  予選リーグ: '#305496',
  順位決定トーナメント: '#548235',
  決勝: '#bf8f00',
}

// 勝ち・負けの色分け（両方に点数が入った試合のみ）
const WIN_SCORE_BG = '#bbf7d0' // 勝った点数セル（緑）
const WIN_CLASS_BG = '#dcfce7' // 勝ったクラスセル（薄緑）
const LOSE_BG = '#eef2f6' // 負け側（薄いグレー）

/** 全角数字（０-９）を半角に直してから数値化する */
function toNumber(s: string): number {
  const half = s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
  return Number(half)
}

/** 両方に有効な点数があり差がついていれば勝った側を返す */
function winnerOf(left: string, right: string): 'left' | 'right' | 'none' {
  if (left.trim() === '' || right.trim() === '') return 'none'
  const a = toNumber(left)
  const b = toNumber(right)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'none'
  return a > b ? 'left' : 'right'
}

/** 勝った側につける「勝」バッジ */
function WinTag() {
  return (
    <span className="mr-1 inline-block rounded bg-emerald-600 px-1 align-middle text-[15px] font-extrabold text-white">
      勝
    </span>
  )
}

export function CourtTable({ court, page, pages }: { court: Court; page: number; pages: number }) {
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
          const win = winnerOf(r.leftScore, r.rightScore)
          const leftWin = win === 'left'
          const rightWin = win === 'right'
          return (
            <Fragment key={rowIndex}>
              {showBand && (
                <tr>
                  <td
                    colSpan={7}
                    className="border-2 border-slate-900 py-0.5 text-center text-[19px] font-extrabold tracking-widest text-white"
                    style={{ backgroundColor: STAGE_COLORS[r.stage!] ?? '#475569' }}
                  >
                    {r.stage}
                  </td>
                </tr>
              )}
              <tr>
                <td
                  className={`${cellBase} bg-white py-1 text-[19px]`}
                  style={currentBorder(isCurrent, 'first')}
                >
                  {r.time}
                </td>
                <td className={`${cellBase} py-1`} style={{ backgroundColor: '#c6e0b4', ...currentBorder(isCurrent, 'mid') }}>
                  {r.code}
                </td>
                <td
                  className={`${cellBase} py-1 ${leftWin ? 'text-emerald-800' : rightWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: leftWin ? WIN_CLASS_BG : rightWin ? LOSE_BG : tint(court.color, 0.22), ...currentBorder(isCurrent, 'mid') }}
                >
                  {leftWin && <WinTag />}
                  {r.left}
                </td>
                <td
                  className={`${cellBase} relative min-w-[70px] py-1 ${leftWin ? 'font-black text-emerald-800' : rightWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: leftWin ? WIN_SCORE_BG : rightWin ? LOSE_BG : scoreBg, ...currentBorder(isCurrent, 'mid') }}
                >
                  {r.leftScore}
                </td>
                <td className={`${cellBase} bg-white py-1 text-[18px]`} style={currentBorder(isCurrent, 'mid')}>
                  {changed ? (
                    <span className="rounded bg-red-600 px-1 text-[14px] font-extrabold text-white">
                      更新
                    </span>
                  ) : (
                    'vs'
                  )}
                </td>
                <td
                  className={`${cellBase} min-w-[70px] py-1 ${rightWin ? 'font-black text-emerald-800' : leftWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: rightWin ? WIN_SCORE_BG : leftWin ? LOSE_BG : scoreBg, ...currentBorder(isCurrent, 'mid') }}
                >
                  {r.rightScore}
                </td>
                <td
                  className={`${cellBase} py-1 ${rightWin ? 'text-emerald-800' : leftWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: rightWin ? WIN_CLASS_BG : leftWin ? LOSE_BG : tint(court.color, 0.22), ...currentBorder(isCurrent, 'last') }}
                >
                  {rightWin && <WinTag />}
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
