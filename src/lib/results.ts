import type { Court, MatchRow } from '../types'
import { leagueTables, rankedTeam } from './standings'

/** 全角数字（０-９）を半角に直してから数値化する */
export function toNumber(s: string): number {
  const half = s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
  return Number(half)
}

/** 両方に有効な点数があり差がついていれば勝った側を返す。
 *  lowerWins の競技（タイムなど）は少ない方を勝ちとする */
export function winnerOf(
  left: string,
  right: string,
  lowerWins = false,
): 'left' | 'right' | 'none' {
  if (left.trim() === '' || right.trim() === '') return 'none'
  const a = toNumber(left)
  const b = toNumber(right)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'none'
  return a > b === !lowerWins ? 'left' : 'right'
}

/** 「A-10勝者」「C-8敗者」のような対戦相手表記（コート記号は何でもよい） */
const MATCH_REF = /^(.+?)-(\d+)(勝者|敗者)$/
/** 「Xリーグ1位」「予選リーグ2位」のようなリーグ順位表記 */
const LEAGUE_REF = /^(.+?)(\d+)位$/

/** 対戦相手セルの表示用に文字列を解決する。
 *  - 「◯-◯勝者/敗者」で、その試合の勝敗が確定していれば実際のクラス名へ置き換える。
 *  - 「◯リーグN位」で、そのリーグの全試合が終わり順位が確定していればクラス名へ置き換える
 *    （同率で並んでいる＝抽選が必要なときは置き換えない）。
 *  - まだ未確定・該当なし・パターン外（手入力済み）はそのまま返す。
 *    → 管理画面でセルに実際のクラス名を入れれば、そちらが優先される（手動上書き）。
 *  - 勝者が次の試合へ連鎖する場合もたどる（循環・深すぎは打ち切ってそのまま返す）。
 *  court は「この表記が書かれているコート」。リーグ名はコート内で探し、無ければ全コートから探す */
export function resolveTeam(name: string, courts: Court[], court?: Court, depth = 0): string {
  if (depth >= 10) return name
  const trimmed = name.trim()

  const m = MATCH_REF.exec(trimmed)
  if (m) {
    const code = `${m[1]}-${m[2]}`
    let row: MatchRow | undefined
    let owner: Court | undefined
    for (const c of courts) {
      const found = c.rows.find((r) => r.code === code)
      if (found) {
        row = found
        owner = c
        break
      }
    }
    if (!row) return name
    const win = winnerOf(row.leftScore, row.rightScore, owner?.lowerWins)
    if (win === 'none') return name
    const wantWinner = m[3] === '勝者'
    const side = wantWinner ? win : win === 'left' ? 'right' : 'left'
    const team = side === 'left' ? row.left : row.right
    return resolveTeam(team, courts, owner, depth + 1)
  }

  const l = LEAGUE_REF.exec(trimmed)
  if (l) {
    // 「Xリーグ1位」でも「X1位」でも、リーグ名「X」「Xリーグ」のどちらにも合うようにする
    const wanted = stripLeague(l[1])
    const rank = Number(l[2])
    const scope = court ? [court, ...courts.filter((c) => c !== court)] : courts
    for (const c of scope) {
      const table = leagueTables(c).find((t) => stripLeague(t.name) === wanted)
      if (!table) continue
      const team = rankedTeam(table, rank)
      return team ?? name
    }
  }

  return name
}

function stripLeague(s: string): string {
  return s.trim().replace(/リーグ$/, '')
}

/** コート見出しの括弧内。競技名があれば「バスケットボール・3年女子」のように前に付ける */
export function courtHeading(court: Court): string {
  const sport = court.sport?.trim()
  return sport ? `${sport}・${court.label}` : court.label
}
