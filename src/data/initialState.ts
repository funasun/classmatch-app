import type { AppState, Court, CourtId, DisplayTexts, MatchRow, Slide } from '../types'

/** パンフレットの進行表（試合番号 1〜15 の予定時刻） */
const TIMES = [
  '9:05~9:20',   // 1 予選①
  '9:25~9:40',   // 2 予選②
  '9:45~10:00',  // 3 予選③
  '10:05~10:20', // 4 予選④
  '10:25~10:40', // 5 予選⑤
  '10:45~11:00', // 6 予選⑥
  '11:05~11:20', // 7 予選⑦
  '12:00~12:15', // 8 準決勝①
  '12:20~12:35', // 9 準決勝②
  '12:40~12:55', // 10 7位決定戦
  '13:00~13:15', // 11 5位決定戦
  '13:20~13:35', // 12 3位決定戦
  '14:00~14:25', // 13 1年生決勝
  '14:30~14:55', // 14 2年生決勝
  '15:00~15:25', // 15 3年生決勝
]

/** 試合番号（1始まり）から区分を決める。1〜7 予選 / 8〜12 順位決定 / 13〜 決勝 */
function stageOf(no: number): string {
  if (no <= 7) return '予選リーグ'
  if (no <= 12) return '順位決定トーナメント'
  return '決勝'
}

function court(
  id: CourtId,
  label: string,
  color: string,
  pairs: [string, string][],
): Court {
  const rows: MatchRow[] = pairs.map(([l, r], i) => ({
    code: `${id}-${i + 1}`,
    time: TIMES[i],
    stage: stageOf(i + 1),
    left: l,
    leftScore: '',
    rightScore: '',
    right: r,
  }))
  return { id, label, color, current: 0, rows }
}

/** 予選後の順位決定トーナメント枠（8〜12試合目、全コート共通の形） */
function tournament(id: CourtId): [string, string][] {
  return [
    ['Xリーグ1位', 'Yリーグ2位'],   // 8 準決勝①
    ['Xリーグ2位', 'Yリーグ1位'],   // 9 準決勝②
    ['抽選で決定', '抽選で決定'],    // 10 7位決定戦
    [`${id}-10勝者`, '抽選で決定'],  // 11 5位決定戦
    [`${id}-8敗者`, `${id}-9敗者`],  // 12 3位決定戦
  ]
}

// パンフレット（試合コード表）の内容を初期データとして再現
export const initialCourts: Court[] = [
  court('A', '3年女子', '#f4600c', [
    ['3-1', '3-3'], ['3-4', '3-5'], ['3-2', '3-7'], ['3-1', '3-4'],
    ['3-6', '3-7'], ['3-3', '3-5'], ['3-2', '3-6'],
    ...tournament('A'),
    ['E-8勝者', 'E-9勝者'],  // 13 1年生決勝
    ['C-8勝者', 'C-9勝者'],  // 14 2年生決勝
    ['A-8勝者', 'A-9勝者'],  // 15 3年生決勝
  ]),
  court('B', '3年男子', '#29abe2', [
    ['3-3', '3-2'], ['3-6', '3-5'], ['3-4', '3-1'], ['3-3', '3-6'],
    ['3-1', '3-7'], ['3-2', '3-5'], ['3-4', '3-7'],
    ...tournament('B'),
    ['F-8勝者', 'F-9勝者'],  // 13 1年生決勝
    ['D-8勝者', 'D-9勝者'],  // 14 2年生決勝
    ['B-8勝者', 'B-9勝者'],  // 15 3年生決勝
  ]),
  court('C', '2年女子', '#ffc000', [
    ['2-6', '2-3'], ['2-5', '2-2'], ['2-4', '2-1'], ['2-3', '2-2'],
    ['2-1', '2-7'], ['2-6', '2-5'], ['2-4', '2-7'],
    ...tournament('C'),
  ]),
  court('D', '2年男子', '#22b04c', [
    ['2-1', '2-7'], ['2-6', '2-4'], ['2-2', '2-5'], ['2-1', '2-6'],
    ['2-5', '2-3'], ['2-4', '2-7'], ['2-2', '2-3'],
    ...tournament('D'),
  ]),
  court('E', '1年女子', '#f79646', [
    ['1-2', '1-4'], ['1-5', '1-3'], ['1-7', '1-1'], ['1-2', '1-5'],
    ['1-1', '1-6'], ['1-3', '1-4'], ['1-7', '1-6'],
    ...tournament('E'),
  ]),
  court('F', '1年男子', '#e75bc0', [
    ['1-4', '1-1'], ['1-2', '1-3'], ['1-5', '1-6'], ['1-4', '1-2'],
    ['1-6', '1-7'], ['1-3', '1-4'], ['1-5', '1-7'],
    ...tournament('F'),
  ]),
]

export const DEFAULT_RESULTS_NOTE = '点数は前後半の合計点を表示。詳細は体育館ステージ横に掲示。'

export const initialSlides: Slide[] = [
  { id: 'slide-current', type: 'current', title: '現在の試合', duration: 12, enabled: true },
  { id: 'slide-wbgt', type: 'wbgt', title: '暑さ指数', duration: 10, enabled: true },
  { id: 'slide-results-ab', type: 'matchResults', title: '進行表・試合結果速報（A・B）', duration: 14, enabled: true, courts: ['A', 'B'], note: DEFAULT_RESULTS_NOTE },
  { id: 'slide-results-cd', type: 'matchResults', title: '進行表・試合結果速報（C・D）', duration: 14, enabled: true, courts: ['C', 'D'], note: DEFAULT_RESULTS_NOTE },
  { id: 'slide-results-ef', type: 'matchResults', title: '進行表・試合結果速報（E・F）', duration: 14, enabled: true, courts: ['E', 'F'], note: DEFAULT_RESULTS_NOTE },
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

export const defaultTexts: DisplayTexts = {
  cautionBanner: '⚠ 熱中症注意 ― こまめに水分・塩分をとってください（保健室より）',
  cancelTitle: '熱中症警戒のため\n試合中止',
  cancelSub: '保健室の指示があるまでお待ちください',
}

export function createInitialState(): AppState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    alert: 'normal',
    pinnedSlideId: null,
    texts: { ...defaultTexts },
    courts: initialCourts,
    slides: initialSlides,
  }
}

/** サーバやキャッシュに残っている旧形式のデータに新フィールドを補う */
export function normalizeState(state: AppState): AppState {
  state.pinnedSlideId ??= null
  state.texts = { ...defaultTexts, ...(state.texts ?? {}) }
  for (const slide of state.slides) {
    if (slide.type === 'matchResults') slide.note ??= DEFAULT_RESULTS_NOTE
  }
  return state
}
