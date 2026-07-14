import type { AppState } from '../types'

/** 点数が更新された行を一定時間「更新」マークで目立たせるための記録。
 *  端末ローカルの目印なので同期はしない */
const changedAt = new Map<string, number>()

export const CHANGE_HIGHLIGHT_MS = 5 * 60 * 1000

export function recordChanges(prev: AppState | null, next: AppState) {
  if (!prev || prev.version === next.version) return
  const now = Date.now()
  for (const court of next.courts) {
    const before = prev.courts.find((c) => c.id === court.id)
    if (!before) continue
    court.rows.forEach((row, i) => {
      const old = before.rows[i]
      if (!old) return
      if (old.leftScore !== row.leftScore || old.rightScore !== row.rightScore) {
        changedAt.set(`${court.id}-${i}`, now)
      }
    })
  }
}

export function isRecentlyChanged(courtId: string, rowIndex: number): boolean {
  const at = changedAt.get(`${courtId}-${rowIndex}`)
  return at !== undefined && Date.now() - at < CHANGE_HIGHLIGHT_MS
}
