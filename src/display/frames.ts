import type { AppState, Slide } from '../types'

/** 1ページに載せる最大行数。超えたら「1/2」「2/2」に自動分割 */
export const MAX_ROWS_PER_PAGE = 12

/** ローテーションの1コマ。表が長いスライドは複数コマに展開される */
export interface Frame {
  slide: Slide
  page: number   // 0始まり
  pages: number
  key: string
}

export function pageCount(slide: Slide, state: AppState): number {
  if (slide.type === 'matchResults') {
    const max = Math.max(
      1,
      ...state.courts
        .filter((c) => slide.courts.includes(c.id))
        .map((c) => c.rows.length),
    )
    return Math.ceil(max / MAX_ROWS_PER_PAGE)
  }
  if (slide.type === 'table') {
    return Math.max(1, Math.ceil(slide.rows.length / MAX_ROWS_PER_PAGE))
  }
  return 1
}

/** rows を pages 等分に近い形で分割したときの page 番目を返す */
export function pageSlice<T>(rows: T[], page: number, pages: number): T[] {
  const size = Math.ceil(rows.length / pages)
  return rows.slice(page * size, (page + 1) * size)
}

export function buildFrames(state: AppState): Frame[] {
  const frames: Frame[] = []
  for (const slide of state.slides) {
    if (!slide.enabled) continue
    const pages = pageCount(slide, state)
    for (let page = 0; page < pages; page++) {
      frames.push({ slide, page, pages, key: `${slide.id}-${page}` })
    }
  }
  return frames
}

/** 「今すぐ表示」用：指定スライドだけのコマ列（OFFのスライドでも表示できる） */
export function buildPinnedFrames(state: AppState, slideId: string): Frame[] {
  const slide = state.slides.find((s) => s.id === slideId)
  if (!slide) return []
  const pages = pageCount(slide, state)
  return Array.from({ length: pages }, (_, page) => ({
    slide,
    page,
    pages,
    key: `${slide.id}-${page}`,
  }))
}
