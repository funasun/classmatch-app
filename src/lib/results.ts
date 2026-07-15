import type { Court, MatchRow } from '../types'

/** 全角数字（０-９）を半角に直してから数値化する */
export function toNumber(s: string): number {
  const half = s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
  return Number(half)
}

/** 両方に有効な点数があり差がついていれば勝った側を返す */
export function winnerOf(left: string, right: string): 'left' | 'right' | 'none' {
  if (left.trim() === '' || right.trim() === '') return 'none'
  const a = toNumber(left)
  const b = toNumber(right)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'none'
  return a > b ? 'left' : 'right'
}

/** 「A-10勝者」「C-8敗者」のような対戦相手表記だけにマッチする。
 *  リーグ順位（例: 3年女子Xリーグ1位）は抽選が絡むため対象外＝手入力のまま。 */
const REF = /^([A-F])-(\d+)(勝者|敗者)$/

/** 対戦相手セルの表示用に文字列を解決する。
 *  - 「◯-◯勝者/敗者」で、その試合の勝敗が確定していれば実際のクラス名へ置き換える。
 *  - まだ未確定・該当試合が無い・パターン外（手入力済み／リーグ順位）はそのまま返す。
 *    → 管理画面でセルに実際のクラス名を入れれば、そちらが優先される（手動上書き）。
 *  - 勝者が次の試合へ連鎖する場合もたどる（循環・深すぎは打ち切ってそのまま返す）。 */
export function resolveTeam(name: string, courts: Court[], depth = 0): string {
  if (depth >= 10) return name
  const m = REF.exec(name.trim())
  if (!m) return name
  const code = `${m[1]}-${m[2]}`
  let row: MatchRow | undefined
  for (const c of courts) {
    const found = c.rows.find((r) => r.code === code)
    if (found) {
      row = found
      break
    }
  }
  if (!row) return name
  const win = winnerOf(row.leftScore, row.rightScore)
  if (win === 'none') return name
  const wantWinner = m[3] === '勝者'
  const side = wantWinner ? win : win === 'left' ? 'right' : 'left'
  const team = side === 'left' ? row.left : row.right
  return resolveTeam(team, courts, depth + 1)
}
