import type { Court, MatchRow } from '../types'
import { leagueTables, rankedTeam } from './standings'

/** 全角数字・全角ピリオドを半角に直す */
export function toHalfWidth(s: string): string {
  return s.replace(/[０-９．]/g, (d) =>
    d === '．' ? '.' : String.fromCharCode(d.charCodeAt(0) - 0xfee0),
  )
}

/** 全角数字（０-９）を半角に直してから数値化する */
export function toNumber(s: string): number {
  return Number(toHalfWidth(s))
}

/** 点数セルに含まれる数値をすべて取り出す。
 *  「25」→[25]、「25 23 15」「25,23,15」→[25,23,15]（セットごとの点数）。数字が無ければ [] */
export function parseScores(s: string): number[] {
  return (toHalfWidth(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** 片方のセルだけに「2-1」「２－１」のように書かれていたら、左右の点数として読み替える */
function splitPair(left: string, right: string): [string, string] {
  const pair = /^\s*(\d+(?:\.\d+)?)\s*[-－−–—―ー:：]\s*(\d+(?:\.\d+)?)\s*$/
  const l = toHalfWidth(left)
  const r = toHalfWidth(right)
  if (r.trim() === '') {
    const m = pair.exec(l)
    if (m) return [m[1], m[2]]
  }
  if (l.trim() === '') {
    const m = pair.exec(r)
    if (m) return [m[1], m[2]]
  }
  return [left, right]
}

export interface ScoreResult {
  winner: 'left' | 'right' | 'none'
  /** 有効な点数が両方に入っているか（入っていれば「試合済み」） */
  played: boolean
  /** 合計点（得失点の集計用） */
  leftTotal: number
  rightTotal: number
}

/** 点数の読み方（すべての競技共通）：
 *  - 両方が数字1つ → そのまま比較（バレーの合計点、バスケ、サッカーなど）
 *  - 両方に数字が2つ以上 → セットごとに比べて、取ったセット数の多い方が勝ち
 *    （「25 23 15」vs「20 25 13」= セット 2-1 で左の勝ち）
 *  - 片方だけに「2-1」 → 左2・右1 と読む
 *  - lowerWins の競技（タイムなど）はどの比較も少ない方を勝ちとする */
export function judge(left: string, right: string, lowerWins = false): ScoreResult {
  const [l, r] = splitPair(left, right)
  const a = parseScores(l)
  const b = parseScores(r)
  if (a.length === 0 || b.length === 0) {
    return { winner: 'none', played: false, leftTotal: 0, rightTotal: 0 }
  }
  const sum = (xs: number[]) => xs.reduce((p, c) => p + c, 0)
  let winner: ScoreResult['winner']
  if (a.length >= 2 && b.length >= 2) {
    let sa = 0
    let sb = 0
    const n = Math.min(a.length, b.length)
    for (let i = 0; i < n; i++) {
      if (a[i] === b[i]) continue
      if (a[i] > b[i] !== lowerWins) sa++
      else sb++
    }
    winner = sa > sb ? 'left' : sb > sa ? 'right' : 'none'
  } else {
    const ta = sum(a)
    const tb = sum(b)
    winner = ta === tb ? 'none' : ta > tb !== lowerWins ? 'left' : 'right'
  }
  return { winner, played: true, leftTotal: sum(a), rightTotal: sum(b) }
}

/** 両方に有効な点数があり差がついていれば勝った側を返す */
export function winnerOf(
  left: string,
  right: string,
  lowerWins = false,
): 'left' | 'right' | 'none' {
  return judge(left, right, lowerWins).winner
}

/** 「A-10勝者」「C-8敗者」のような対戦相手表記（コート記号は何でもよい） */
export const MATCH_REF = /^(.+?)-(\d+)(勝者|敗者)$/
/** 「Xリーグ1位」「予選リーグ2位」のようなリーグ順位表記 */
export const LEAGUE_REF = /^(.+?)(\d+)位$/

/** 試合コードから行とそのコートを探す */
export function findMatch(code: string, courts: Court[]): { row: MatchRow; court: Court } | null {
  for (const c of courts) {
    const row = c.rows.find((r) => r.code === code)
    if (row) return { row, court: c }
  }
  return null
}

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
    const hit = findMatch(`${m[1]}-${m[2]}`, courts)
    if (!hit) return name
    const win = winnerOf(hit.row.leftScore, hit.row.rightScore, hit.court.lowerWins)
    if (win === 'none') return name
    const wantWinner = m[3] === '勝者'
    const side = wantWinner ? win : win === 'left' ? 'right' : 'left'
    const team = side === 'left' ? hit.row.left : hit.row.right
    return resolveTeam(team, courts, hit.court, depth + 1)
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

/** まだ確定していない対戦相手の表記か（勝者/敗者・リーグ順位・抽選） */
export function isPlaceholder(name: string): boolean {
  const t = name.trim()
  return MATCH_REF.test(t) || LEAGUE_REF.test(t) || t.includes('抽選')
}

/** コート見出しの括弧内。競技名があれば「バスケットボール・3年女子」のように前に付ける */
export function courtHeading(court: Court): string {
  const sport = court.sport?.trim()
  return sport ? `${sport}・${court.label}` : court.label
}
