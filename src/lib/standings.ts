import type { Court, MatchRow } from '../types'
import { toNumber } from './results'

export interface StandingRow {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  /** 得点（lowerWins の競技でもそのまま合計） */
  pf: number
  /** 失点 */
  pa: number
  /** 得失差（lowerWins の競技は失点−得点） */
  diff: number
  /** 順位（同率は同じ順位） */
  rank: number
}

export interface LeagueTable {
  name: string
  rows: StandingRow[]
  /** リーグの全試合が終わったか */
  complete: boolean
  total: number
  done: number
}

/** リーグ戦とみなす行：リーグ名が入っているか、区分に「リーグ」を含む行 */
function isLeagueRow(r: MatchRow): boolean {
  return !!r.league?.trim() || !!r.stage?.includes('リーグ')
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨'

/** 同じ区分の中で「対戦でつながっているクラス同士」をひとまとまり（＝1リーグ）にする。
 *  夏のように X/Y リーグが同じ「予選リーグ」区分に混在していても自動で分けられる */
function splitByOpponents(rows: MatchRow[]): MatchRow[][] {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    const p = parent.get(x)
    if (p === undefined || p === x) return x
    const root = find(p)
    parent.set(x, root)
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const r of rows) {
    parent.set(r.left, parent.get(r.left) ?? r.left)
    parent.set(r.right, parent.get(r.right) ?? r.right)
    union(r.left, r.right)
  }
  const groups = new Map<string, MatchRow[]>()
  for (const r of rows) {
    const root = find(r.left)
    const list = groups.get(root)
    if (list) list.push(r)
    else groups.set(root, [r])
  }
  return [...groups.values()]
}

/** コート内のリーグ戦の行をリーグごとに分ける（リーグ名 → 行の配列） */
export function groupLeagues(court: Court): { name: string; rows: MatchRow[] }[] {
  const named = new Map<string, MatchRow[]>()
  const unnamed = new Map<string, MatchRow[]>()
  for (const r of court.rows) {
    if (!isLeagueRow(r)) continue
    const league = r.league?.trim()
    const target = league ? named : unnamed
    const key = league || (r.stage?.trim() || 'リーグ')
    const list = target.get(key)
    if (list) list.push(r)
    else target.set(key, [r])
  }
  const out = [...named].map(([name, rows]) => ({ name, rows }))
  for (const [stage, rows] of unnamed) {
    const parts = splitByOpponents(rows)
    parts.forEach((part, i) => {
      out.push({ name: parts.length > 1 ? `${stage}${CIRCLED[i] ?? i + 1}` : stage, rows: part })
    })
  }
  return out
}

/** 並び順のキー。勝ち数 → 得失差 → 得点 の順で比べる。同じキー＝同率 */
function sortKey(r: StandingRow): [number, number, number] {
  return [r.won, r.diff, r.pf]
}

function compareRows(a: StandingRow, b: StandingRow): number {
  const ka = sortKey(a)
  const kb = sortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return kb[i] - ka[i]
  }
  return 0
}

function buildTable(name: string, rows: MatchRow[], lowerWins: boolean): LeagueTable {
  const stats = new Map<string, StandingRow>()
  const get = (team: string) => {
    let s = stats.get(team)
    if (!s) {
      s = { team, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, diff: 0, rank: 0 }
      stats.set(team, s)
    }
    return s
  }
  let done = 0
  for (const r of rows) {
    const L = get(r.left)
    const R = get(r.right)
    const a = toNumber(r.leftScore)
    const b = toNumber(r.rightScore)
    const valid =
      r.leftScore.trim() !== '' && r.rightScore.trim() !== '' && Number.isFinite(a) && Number.isFinite(b)
    if (!valid) continue
    done++
    L.played++
    R.played++
    L.pf += a
    L.pa += b
    R.pf += b
    R.pa += a
    if (a === b) {
      L.drawn++
      R.drawn++
    } else if (a > b === !lowerWins) {
      L.won++
      R.lost++
    } else {
      R.won++
      L.lost++
    }
  }
  const list = [...stats.values()]
  for (const s of list) s.diff = lowerWins ? s.pa - s.pf : s.pf - s.pa
  list.sort(compareRows)
  list.forEach((s, i) => {
    s.rank = i > 0 && compareRows(list[i - 1], s) === 0 ? list[i - 1].rank : i + 1
  })
  return { name, rows: list, complete: rows.length > 0 && done === rows.length, total: rows.length, done }
}

/** コートのリーグ順位表をすべて計算する */
export function leagueTables(court: Court): LeagueTable[] {
  return groupLeagues(court).map((g) => buildTable(g.name, g.rows, !!court.lowerWins))
}

/** 確定した「N位」のクラス名。全試合が終わり、その順位が同率で割れていないときだけ返す */
export function rankedTeam(table: LeagueTable, rank: number): string | null {
  if (!table.complete) return null
  const hit = table.rows.filter((r) => r.rank === rank)
  return hit.length === 1 ? hit[0].team : null
}
