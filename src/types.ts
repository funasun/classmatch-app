export type CourtId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

/** 1試合分の行（Excelの1行に対応） */
export interface MatchRow {
  code: string       // 例: A-1
  time?: string      // 例: 9:05~9:20（パンフレットの予定時刻）
  left: string       // 例: 3-1（クラス）
  leftScore: string
  rightScore: string
  right: string      // 例: 3-3（クラス）
}

export interface Court {
  id: CourtId
  label: string      // 例: 3年女子
  color: string      // ヘッダー帯の色
  rows: MatchRow[]
  /** 現在の試合の行番号（-1 = 開始前, rows.length = 全試合終了） */
  current: number
}

export type SlideType = 'current' | 'wbgt' | 'matchResults' | 'table' | 'notice'

interface SlideBase {
  id: string
  type: SlideType
  title: string
  duration: number   // 表示秒数
  enabled: boolean
}

/** 現在の試合（全コートの「今の試合」を一覧表示） */
export interface CurrentSlide extends SlideBase {
  type: 'current'
}

/** 暑さ指数 */
export interface WbgtSlide extends SlideBase {
  type: 'wbgt'
}

/** 試合結果速報（Excel再現。表示するコートを選ぶ） */
export interface MatchResultsSlide extends SlideBase {
  type: 'matchResults'
  courts: CourtId[]
  /** タイトル帯の右に出る補足文 */
  note?: string
}

/** 汎用の表（リーグ結果・確定試合順など） */
export interface TableSlide extends SlideBase {
  type: 'table'
  header: string[]
  rows: string[][]
}

/** お知らせ／自由テキスト */
export interface NoticeSlide extends SlideBase {
  type: 'notice'
  heading: string
  body: string
}

export type Slide =
  | CurrentSlide
  | WbgtSlide
  | MatchResultsSlide
  | TableSlide
  | NoticeSlide

/** 試合状態：通常／注意／中止 */
export type AlertStatus = 'normal' | 'caution' | 'canceled'

/** 表示画面の固定文言（管理画面から自由に編集できる） */
export interface DisplayTexts {
  cautionBanner: string  // 注意バナー
  cancelTitle: string    // 中止画面の大見出し（改行可）
  cancelSub: string      // 中止画面の補足
}

export interface AppState {
  /** 保存のたびに +1。同期の差分判定に使う */
  version: number
  updatedAt: string
  alert: AlertStatus
  /** 「今すぐ表示」で固定中のスライドID。null なら通常ローテーション */
  pinnedSlideId: string | null
  texts: DisplayTexts
  courts: Court[]
  slides: Slide[]
}
