import type { AppState, Court, CourtId, MatchRow, Slide } from '../types'

function row(code: string, left: string, right: string): MatchRow {
  return { code, left, leftScore: '', rightScore: '', right }
}

function court(
  id: CourtId,
  label: string,
  color: string,
  pairs: [string, string][],
): Court {
  return {
    id,
    label,
    color,
    current: 0,
    rows: pairs.map(([l, r], i) => row(`${id}-${i + 1}`, l, r)),
  }
}

// スクリーンショットのExcel「試合結果速報」の内容を初期データとして再現
export const initialCourts: Court[] = [
  court('A', '3年女子', '#f4600c', [
    ['3-1', '3-3'], ['3-4', '3-5'], ['3-2', '3-7'], ['3-1', '3-4'],
    ['3-6', '3-7'], ['3-3', '3-5'], ['3-2', '3-6'],
    ['3-', '3-'], ['3-', '3-'], ['3-', '3-'], ['3-', '3-'], ['3-', '3-'],
    ['1-', '1-'], ['2-', '2-'], ['3-', '3-'],
  ]),
  court('B', '3年男子', '#29abe2', [
    ['3-3', '3-2'], ['3-6', '3-5'], ['3-4', '3-1'], ['3-3', '3-6'],
    ['3-1', '3-7'], ['3-2', '3-5'], ['3-4', '3-7'],
    ['3-', '3-'], ['3-', '3-'], ['3-', '3-'], ['3-', '3-'], ['3-', '3-'],
    ['1-', '1-'], ['2-', '2-'], ['3-', '3-'],
  ]),
  court('C', '2年女子', '#ffc000', [
    ['2-6', '2-3'], ['2-5', '2-2'], ['2-4', '2-1'], ['2-3', '2-2'],
    ['2-1', '2-7'], ['2-6', '2-5'], ['2-4', '2-7'],
    ['2-', '2-'], ['2-', '2-'], ['2-', '2-'], ['2-', '2-'], ['2-', '2-'],
  ]),
  court('D', '2年男子', '#22b04c', [
    ['2-1', '2-7'], ['2-6', '2-4'], ['2-2', '2-5'], ['2-1', '2-6'],
    ['2-5', '2-3'], ['2-4', '2-7'], ['2-2', '2-3'],
    ['2-', '2-'], ['2-', '2-'], ['2-', '2-'], ['2-', '2-'], ['2-', '2-'],
  ]),
  court('E', '1年女子', '#f79646', [
    ['1-2', '1-4'], ['1-5', '1-3'], ['1-7', '1-1'], ['1-2', '1-5'],
    ['1-1', '1-6'], ['1-3', '1-4'], ['1-7', '1-6'],
    ['1-', '1-'], ['1-', '1-'], ['1-', '1-'], ['1-', '1-'], ['1-', '1-'],
  ]),
  court('F', '1年男子', '#e75bc0', [
    ['1-4', '1-1'], ['1-2', '1-3'], ['1-5', '1-6'], ['1-4', '1-2'],
    ['1-6', '1-7'], ['1-2', '1-4'], ['1-5', '1-7'],
    ['1-', '1-'], ['1-', '1-'], ['1-', '1-'], ['1-', '1-'], ['1-', '1-'],
  ]),
]

export const initialSlides: Slide[] = [
  { id: 'slide-current', type: 'current', title: '現在の試合', duration: 12, enabled: true },
  { id: 'slide-wbgt', type: 'wbgt', title: '暑さ指数', duration: 10, enabled: true },
  { id: 'slide-results-ab', type: 'matchResults', title: '試合結果速報（A・B）', duration: 14, enabled: true, courts: ['A', 'B'] },
  { id: 'slide-results-cd', type: 'matchResults', title: '試合結果速報（C・D）', duration: 14, enabled: true, courts: ['C', 'D'] },
  { id: 'slide-results-ef', type: 'matchResults', title: '試合結果速報（E・F）', duration: 14, enabled: true, courts: ['E', 'F'] },
  {
    id: 'slide-notice',
    type: 'notice',
    title: 'お知らせ',
    duration: 10,
    enabled: false,
    heading: '本部からのお知らせ',
    body: 'こまめに水分補給をしましょう。',
  },
]

export function createInitialState(): AppState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    alert: 'normal',
    courts: initialCourts,
    slides: initialSlides,
  }
}
