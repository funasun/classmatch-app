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

// 負け側は共通で薄いグレー。勝ち側はコート色に合わせて自動で決める
const LOSE_BG = '#eef2f6'

/** 背景色の明るさから、その上で読みやすい文字色（白 or 濃紺）を返す */
function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0f172a' : '#ffffff'
}

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

/** 勝った側につける「勝」バッジ（コート色で塗る） */
function WinTag({ bg, color }: { bg: string; color: string }) {
  return (
    <span
      className="mr-1 inline-block rounded px-1 align-middle text-[15px] font-extrabold"
      style={{ backgroundColor: bg, color }}
    >
      勝
    </span>
  )
}

export function CourtTable({ court, page, pages }: { court: Court; page: number; pages: number }) {
  const rows = pageSlice(court.rows, page, pages)
  const offset = page * Math.ceil(court.rows.length / pages)

  // 勝ち側の色はコート色から作る（点数セルはコート色ベタ塗り＋自動文字色、
  // クラスセルは少し濃いめの淡色）。負けはグレーで沈める
  const winScoreBg = court.color
  const winScoreText = contrastText(court.color)
  const winClassBg = tint(court.color, 0.5)

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
                  className={`${cellBase} py-1 ${rightWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: leftWin ? winClassBg : rightWin ? LOSE_BG : tint(court.color, 0.22), ...currentBorder(isCurrent, 'mid') }}
                >
                  {leftWin && <WinTag bg={winScoreBg} color={winScoreText} />}
                  {r.left}
                </td>
                <td
                  className={`${cellBase} relative min-w-[70px] py-1 ${leftWin ? 'font-black' : rightWin ? 'text-slate-400' : ''}`}
                  style={{
                    backgroundColor: leftWin ? winScoreBg : rightWin ? LOSE_BG : scoreBg,
                    color: leftWin ? winScoreText : undefined,
                    ...currentBorder(isCurrent, 'mid'),
                  }}
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
                  className={`${cellBase} min-w-[70px] py-1 ${rightWin ? 'font-black' : leftWin ? 'text-slate-400' : ''}`}
                  style={{
                    backgroundColor: rightWin ? winScoreBg : leftWin ? LOSE_BG : scoreBg,
                    color: rightWin ? winScoreText : undefined,
                    ...currentBorder(isCurrent, 'mid'),
                  }}
                >
                  {r.rightScore}
                </td>
                <td
                  className={`${cellBase} py-1 ${leftWin ? 'text-slate-400' : ''}`}
                  style={{ backgroundColor: rightWin ? winClassBg : leftWin ? LOSE_BG : tint(court.color, 0.22), ...currentBorder(isCurrent, 'last') }}
                >
                  {rightWin && <WinTag bg={winScoreBg} color={winScoreText} />}
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
