import type { AppState, Court, CourtId, DisplayTexts, MatchRow, Slide, Ticker } from '../types'

/** 予定時刻（パンフレット改訂版 p.9 時程表）。
 *  1〜7=予選, 8=準決勝①, 9=準決勝②, 10=7位決定戦, 11=5位決定戦, 12=3位決定戦,
 *  13=1年決勝, 14=2年決勝, 15=3年決勝。C〜Fは12試合まで、A・Bは決勝も担うので15試合。
 *  各コートは先頭から自分の試合数ぶんだけ使う。 */
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
  '14:00~14:25', // 13 1年決勝（A・Bのみ）
  '14:30~14:55', // 14 2年決勝（A・Bのみ）
  '15:00~15:25', // 15 3年決勝（A・Bのみ）
]

/** 1試合分の定義。[左クラス, 右クラス, 区分]。区分を省略すると「予選リーグ」。 */
type MatchDef = [string, string, string?]

function court(
  id: CourtId,
  label: string,
  color: string,
  matches: MatchDef[],
): Court {
  const rows: MatchRow[] = matches.map(([l, r, stage], i) => ({
    code: `${id}-${i + 1}`,
    time: TIMES[i],
    stage: stage ?? '予選リーグ',
    left: l,
    leftScore: '',
    rightScore: '',
    right: r,
  }))
  return { id, label, color, current: 0, rows }
}

// パンフレット（改訂版・2026）p.6-7 組み合わせ / p.9 時程表 / p.10-15 試合順を忠実に再現。
// 予選（1〜7）は各コート内のX・Yリーグ総当たり。8以降は順位決定トーナメント。
// 決勝は体育館のA・Bコートに集約（A=女子・B=男子、各学年の決勝を実施）。
// 「抽選で決定」は予選後の休憩中に抽選で相手が決まる枠。抽選後に手入力で確定する。
export const initialCourts: Court[] = [
  court('A', '3年女子', '#f4600c', [
    ['3-1', '3-3'], ['3-4', '3-5'], ['3-2', '3-7'], ['3-1', '3-4'],
    ['3-6', '3-7'], ['3-3', '3-5'], ['3-2', '3-6'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // A-8  3年女子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // A-9  3年女子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // A-10 3年女子 7位決定戦
    ['A-10勝者', '抽選で決定', '5位決定戦'],     // A-11 3年女子 5位決定戦
    ['A-8敗者', 'A-9敗者', '3位決定戦'],         // A-12 3年女子 3位決定戦
    ['E-8勝者', 'E-9勝者', '1年女子決勝'],       // A-13 1年女子 決勝
    ['C-8勝者', 'C-9勝者', '2年女子決勝'],       // A-14 2年女子 決勝
    ['A-8勝者', 'A-9勝者', '3年女子決勝'],       // A-15 3年女子 決勝
  ]),
  court('B', '3年男子', '#29abe2', [
    ['3-3', '3-2'], ['3-6', '3-5'], ['3-4', '3-1'], ['3-3', '3-6'],
    ['3-1', '3-7'], ['3-2', '3-5'], ['3-4', '3-7'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // B-8  3年男子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // B-9  3年男子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // B-10 3年男子 7位決定戦
    ['B-10勝者', '抽選で決定', '5位決定戦'],     // B-11 3年男子 5位決定戦
    ['B-8敗者', 'B-9敗者', '3位決定戦'],         // B-12 3年男子 3位決定戦
    ['F-8勝者', 'F-9勝者', '1年男子決勝'],       // B-13 1年男子 決勝
    ['D-8勝者', 'D-9勝者', '2年男子決勝'],       // B-14 2年男子 決勝
    ['B-8勝者', 'B-9勝者', '3年男子決勝'],       // B-15 3年男子 決勝
  ]),
  court('C', '2年女子', '#ffc000', [
    ['2-6', '2-3'], ['2-5', '2-2'], ['2-4', '2-1'], ['2-3', '2-2'],
    ['2-1', '2-7'], ['2-6', '2-5'], ['2-4', '2-7'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // C-8  2年女子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // C-9  2年女子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // C-10 2年女子 7位決定戦
    ['C-10勝者', '抽選で決定', '5位決定戦'],     // C-11 2年女子 5位決定戦
    ['C-8敗者', 'C-9敗者', '3位決定戦'],         // C-12 2年女子 3位決定戦（決勝はAコート）
  ]),
  court('D', '2年男子', '#22b04c', [
    ['2-1', '2-7'], ['2-6', '2-4'], ['2-2', '2-5'], ['2-1', '2-6'],
    ['2-5', '2-3'], ['2-4', '2-7'], ['2-2', '2-3'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // D-8  2年男子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // D-9  2年男子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // D-10 2年男子 7位決定戦
    ['D-10勝者', '抽選で決定', '5位決定戦'],     // D-11 2年男子 5位決定戦
    ['D-8敗者', 'D-9敗者', '3位決定戦'],         // D-12 2年男子 3位決定戦（決勝はBコート）
  ]),
  court('E', '1年女子', '#f79646', [
    ['1-2', '1-4'], ['1-5', '1-3'], ['1-7', '1-1'], ['1-2', '1-5'],
    ['1-1', '1-6'], ['1-3', '1-4'], ['1-7', '1-6'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // E-8  1年女子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // E-9  1年女子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // E-10 1年女子 7位決定戦
    ['E-10勝者', '抽選で決定', '5位決定戦'],     // E-11 1年女子 5位決定戦
    ['E-8敗者', 'E-9敗者', '3位決定戦'],         // E-12 1年女子 3位決定戦（決勝はAコート）
  ]),
  court('F', '1年男子', '#e75bc0', [
    ['1-4', '1-1'], ['1-2', '1-3'], ['1-5', '1-6'], ['1-4', '1-2'],
    ['1-6', '1-7'], ['1-3', '1-4'], ['1-5', '1-7'],
    ['Xリーグ1位', 'Yリーグ2位', '準決勝①'],   // F-8  1年男子 準決勝①
    ['Xリーグ2位', 'Yリーグ1位', '準決勝②'],   // F-9  1年男子 準決勝②
    ['抽選で決定', '抽選で決定', '7位決定戦'],   // F-10 1年男子 7位決定戦
    ['F-10勝者', '抽選で決定', '5位決定戦'],     // F-11 1年男子 5位決定戦
    ['F-8敗者', 'F-9敗者', '3位決定戦'],         // F-12 1年男子 3位決定戦（決勝はBコート）
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
    source: 'youtube',
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
      slide.source ??= 'youtube'
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
      source: 'youtube',
      url: '',
      caption: '',
    })
  }
  return state
}
