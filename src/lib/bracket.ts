import type { Court, MatchRow } from '../types'
import { MATCH_REF, findMatch, isPlaceholder, judge, resolveTeam } from './results'
import { isLeagueRow } from './standings'

/** 描画サイズ（1600×900のキャンバス上の px。FitScale で画面に合わせて縮む） */
export const BOX_W = 188
export const BOX_H = 64
export const COL_GAP = 52
export const ROW_GAP = 12

export interface BracketNode {
  key: string
  kind: 'team' | 'match'
  /** team: クラス名（解決済み）／match: 勝ち上がったクラス名（未確定なら空） */
  label: string
  /** team: 解決前の表記（「Xリーグ1位」など）。クラス名に置き換わったあとも小さく出す */
  note?: string
  /** まだ確定していない枠（リーグ順位待ち・抽選待ちなど） */
  pending: boolean
  code?: string
  time?: string
  score?: string
  winner: 'left' | 'right' | 'none'
  /** 「◯-◯敗者」から進んできた枠（3位決定戦など） */
  loserRef: boolean
  children: BracketNode[]
  round: number
  x: number
  y: number
}

function leaf(key: string, text: string, courts: Court[], court: Court): BracketNode {
  const t = text.trim()
  const resolved = resolveTeam(t, courts, court)
  const m = MATCH_REF.exec(t)
  return {
    key,
    kind: 'team',
    label: resolved || '（未定）',
    note: resolved !== t ? t : undefined,
    pending: resolved === t && isPlaceholder(t),
    winner: 'none',
    loserRef: !!m && m[3] === '敗者',
    children: [],
    round: 0,
    x: 0,
    y: 0,
  }
}

/** 「◯-◯勝者」のつながりをたどって、この試合を頂点とする山を組み立てる。
 *  「◯-◯敗者」は展開せず、負けた側のクラス名を葉として置く（3位決定戦など） */
export function buildTree(
  row: MatchRow,
  court: Court,
  courts: Court[],
  depth = 0,
  seen = new Set<string>(),
): BracketNode {
  seen.add(row.code)
  const res = judge(row.leftScore, row.rightScore, court.lowerWins)
  const children = [row.left, row.right].map((text, i) => {
    const t = text.trim()
    const m = MATCH_REF.exec(t)
    if (m && m[3] === '勝者' && depth < 8) {
      const hit = findMatch(`${m[1]}-${m[2]}`, courts)
      if (hit && !seen.has(hit.row.code)) {
        return buildTree(hit.row, hit.court, courts, depth + 1, seen)
      }
    }
    return leaf(`${row.code}:${i}`, t, courts, court)
  })
  const winnerText = res.winner === 'left' ? row.left : res.winner === 'right' ? row.right : ''
  return {
    key: row.code,
    kind: 'match',
    label: winnerText ? resolveTeam(winnerText, courts, court) : '',
    pending: false,
    code: row.code,
    time: row.time,
    score: res.played ? `${row.leftScore.trim()} - ${row.rightScore.trim()}` : '',
    winner: res.winner,
    loserRef: false,
    children,
    round: 0,
    x: 0,
    y: 0,
  }
}

/** トーナメントの頂点＝他の試合から「勝者」として参照されていない、リーグ戦以外の試合 */
export function tournamentRoots(court: Court, courts: Court[]): MatchRow[] {
  const referenced = new Set<string>()
  for (const c of courts) {
    for (const r of c.rows) {
      for (const t of [r.left, r.right]) {
        const m = MATCH_REF.exec(t.trim())
        if (m && m[3] === '勝者') referenced.add(`${m[1]}-${m[2]}`)
      }
    }
  }
  return court.rows.filter((r) => !isLeagueRow(r) && !referenced.has(r.code))
}

export interface BracketLayout {
  root: BracketNode
  nodes: BracketNode[]
  width: number
  height: number
}

/** 葉を上から順に並べ、試合は子の中間の高さに置く。頂点が右端、1つ手前の試合はその1列左 */
export function layoutTree(root: BracketNode): BracketLayout {
  const nodes: BracketNode[] = []
  let leafIndex = 0
  const visit = (n: BracketNode): number => {
    nodes.push(n)
    if (n.children.length === 0) {
      n.round = 0
      n.y = leafIndex++ * (BOX_H + ROW_GAP)
      return 0
    }
    const rounds = n.children.map(visit)
    n.round = 1 + Math.max(...rounds)
    n.y = n.children.reduce((s, c) => s + c.y, 0) / n.children.length
    return n.round
  }
  const rounds = visit(root)
  const place = (n: BracketNode, col: number) => {
    n.x = col * (BOX_W + COL_GAP)
    n.children.forEach((c) => place(c, col - 1))
  }
  place(root, rounds)
  return {
    root,
    nodes,
    width: (rounds + 1) * (BOX_W + COL_GAP) - COL_GAP,
    height: Math.max(leafIndex, 1) * (BOX_H + ROW_GAP) - ROW_GAP,
  }
}
