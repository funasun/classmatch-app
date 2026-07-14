import type { AppState, Court, CourtId, DisplayTexts, MatchRow, Slide, Ticker } from '../types'

/** 試合順（5試合順.pdf 改訂版）の予定時刻。A・Bは16試合まで、C・Dは10試合、E・Fは7試合。
 *  各コートは先頭から自分の試合数ぶんだけ使う（時刻は10試合目まで全コート共通） */
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
  '12:40~12:55', // 10 準決勝（1年の②）
  '13:15~13:30', // 11 （A・Bのみ）
  '13:35~13:50', // 12
  '13:55~14:10', // 13
  '14:20~14:45', // 14
  '14:50~15:15', // 15
  '15:20~15:45', // 16
]

/** 試合番号（1始まり）から区分を決める。1〜7 予選 / 8〜 順位決定トーナメント（決勝含む） */
function stageOf(no: number): string {
  if (no <= 7) return '予選リーグ'
  return '順位決定トーナメント'
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

// 5試合順.pdf（改訂版・2026-07-14）の内容を初期データとして再現。
// 決勝トーナメントはコートA・B（体育館）に集約し、C・Dで1試合ずつ準決勝を行う形。
// ※ 印: 元PDFに矛盾（同一試合の勝者vs敗者、同コード同士など）があり、論理的に正しい値へ補正した箇所。
export const initialCourts: Court[] = [
  court('A', '3年女子', '#f4600c', [
    ['3-1', '3-3'], ['3-4', '3-5'], ['3-2', '3-7'], ['3-1', '3-4'],
    ['3-6', '3-7'], ['3-3', '3-5'], ['3-2', '3-6'],
    ['3年女子Xリーグ1位', '3年女子Yリーグ2位'],  // 8  3年女子 準決勝①
    ['3年女子Xリーグ2位', '3年女子Yリーグ1位'],  // 9  3年女子 準決勝②
    ['1年女子Xリーグ1位', '1年女子Yリーグ2位'],  // 10 1年女子 準決勝①
    ['A-10敗者', 'C-10敗者'],  // 11 1年女子 3位決定戦
    ['C-8敗者', 'C-9敗者'],    // 12 2年女子 3位決定戦
    ['A-8敗者', 'A-9敗者'],    // 13 3年女子 3位決定戦 ※PDFは「A-9敗者 vs A-9勝者」
    ['A-10勝者', 'C-10勝者'],  // 14 1年女子 決勝
    ['C-8勝者', 'C-9勝者'],    // 15 2年女子 決勝
    ['A-8勝者', 'A-9勝者'],    // 16 3年女子 決勝
  ]),
  court('B', '3年男子', '#29abe2', [
    ['3-3', '3-2'], ['3-6', '3-5'], ['3-4', '3-1'], ['3-3', '3-6'],
    ['3-1', '3-7'], ['3-2', '3-5'], ['3-4', '3-7'],
    ['3年男子Xリーグ1位', '3年男子Yリーグ2位'],  // 8  3年男子 準決勝①
    ['3年男子Xリーグ2位', '3年男子Yリーグ1位'],  // 9  3年男子 準決勝②
    ['1年男子Xリーグ1位', '1年男子Yリーグ2位'],  // 10 1年男子 準決勝①
    ['B-10敗者', 'D-10敗者'],  // 11 1年男子 3位決定戦 ※PDFは「B-10敗者 vs B-10敗者」
    ['D-8敗者', 'D-9敗者'],    // 12 2年男子 3位決定戦
    ['B-8敗者', 'B-9敗者'],    // 13 3年男子 3位決定戦 ※PDFは「B-9敗者 vs B-9勝者」
    ['B-10勝者', 'D-10勝者'],  // 14 1年男子 決勝 ※PDFは「A-10勝者 vs C-10勝者」
    ['D-8勝者', 'D-9勝者'],    // 15 2年男子 決勝 ※PDFは「C-8勝者 vs C-9勝者」
    ['B-8勝者', 'B-9勝者'],    // 16 3年男子 決勝 ※PDFは「A-8勝者 vs A-9勝者」
  ]),
  court('C', '2年女子', '#ffc000', [
    ['2-6', '2-3'], ['2-5', '2-2'], ['2-4', '2-1'], ['2-3', '2-2'],
    ['2-1', '2-7'], ['2-6', '2-5'], ['2-4', '2-7'],
    ['2年女子Xリーグ1位', '2年女子Yリーグ2位'],  // 8  2年女子 準決勝①
    ['2年女子Xリーグ2位', '2年女子Yリーグ1位'],  // 9  2年女子 準決勝②
    ['1年女子Xリーグ2位', '1年女子Yリーグ1位'],  // 10 1年女子 準決勝②
  ]),
  court('D', '2年男子', '#22b04c', [
    ['2-1', '2-7'], ['2-6', '2-4'], ['2-2', '2-5'], ['2-1', '2-6'],
    ['2-5', '2-3'], ['2-4', '2-7'], ['2-2', '2-3'],
    ['2年男子Xリーグ1位', '2年男子Yリーグ2位'],  // 8  2年男子 準決勝①
    ['2年男子Xリーグ2位', '2年男子Yリーグ1位'],  // 9  2年男子 準決勝②
    ['1年男子Xリーグ2位', '1年男子Yリーグ1位'],  // 10 1年男子 準決勝②
  ]),
  court('E', '1年女子', '#f79646', [
    ['1-2', '1-4'], ['1-5', '1-3'], ['1-7', '1-1'], ['1-2', '1-5'],
    ['1-1', '1-6'], ['1-3', '1-4'], ['1-7', '1-6'],
    // 1年女子の決勝トーナメントはコートA・Cで実施（このコートは予選のみ）
  ]),
  court('F', '1年男子', '#e75bc0', [
    ['1-4', '1-1'], ['1-2', '1-3'], ['1-5', '1-6'], ['1-4', '1-2'],
    ['1-6', '1-7'], ['1-3', '1-4'], ['1-5', '1-7'],
    // 1年男子の決勝トーナメントはコートB・Dで実施（このコートは予選のみ）
  ]),
]

export const DEFAULT_RESULTS_NOTE = '点数は前後半の合計点を表示。詳細は体育館ステージ横に掲示。'

export const initialSlides: Slide[] = [
  { id: 'slide-current', type: 'current', title: '現在の試合', duration: 12, enabled: true },
  { id: 'slide-courtmap', type: 'courtMap', title: 'コート配置図', duration: 10, enabled: true },
  {
    id: 'slide-wbgt',
    type: 'wbgt',
    title: '暑さ指数',
    duration: 10,
    enabled: true,
    readings: [
      { label: '体育館', value: '' },
      { label: 'ハンドボールコート', value: '' },
    ],
    measuredAt: '',
  },
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
  {
    id: 'slide-live',
    type: 'liveStream',
    title: 'ライブ映像',
    duration: 30,
    enabled: false,
    url: '',
    caption: '',
  },
]

export const defaultTicker: Ticker = {
  enabled: false,
  text: '',
  speed: 'normal',
  blink: false,
  blinkColor: '#facc15',
  repeat: 0,
  bg: '#0f172a',
  color: '#ffffff',
}

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
    ticker: { ...defaultTicker },
    courts: initialCourts,
    slides: initialSlides,
  }
}

/** サーバやキャッシュに残っている旧形式のデータに新フィールドを補う */
export function normalizeState(state: AppState): AppState {
  state.pinnedSlideId ??= null
  state.texts = { ...defaultTexts, ...(state.texts ?? {}) }
  state.ticker = { ...defaultTicker, ...(state.ticker ?? {}) }
  for (const slide of state.slides) {
    if (slide.type === 'matchResults') slide.note ??= DEFAULT_RESULTS_NOTE
    if (slide.type === 'wbgt') {
      slide.readings ??= [
        { label: '体育館', value: '' },
        { label: 'ハンドボールコート', value: '' },
      ]
      slide.measuredAt ??= ''
    }
    if (slide.type === 'liveStream') {
      slide.url ??= ''
      slide.caption ??= ''
    }
  }
  // 旧データにライブ映像スライドが無ければ末尾に補う（初期はOFF）
  if (!state.slides.some((s) => s.type === 'liveStream')) {
    state.slides.push({
      id: 'slide-live',
      type: 'liveStream',
      title: 'ライブ映像',
      duration: 30,
      enabled: false,
      url: '',
      caption: '',
    })
  }
  return state
}
