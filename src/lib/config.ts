/** Firebase 設定。未設定ならローカルモード（同一ブラウザ内での同期・開発用）で動く。
 *  学校ネットワークでも通りやすい firestore.googleapis.com（HTTPS 443のみ）を使う */
export const FIREBASE_API_KEY: string = import.meta.env.VITE_FIREBASE_API_KEY ?? ''
export const FIREBASE_PROJECT_ID: string = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? ''

/** 管理画面ログイン用の Firebase ユーザーのメールアドレス。
 *  管理画面の「合言葉」はこのユーザーのパスワード */
export const FIREBASE_ADMIN_EMAIL: string =
  import.meta.env.VITE_FIREBASE_ADMIN_EMAIL ?? 'admin@classmatch.local'

export const FIREBASE_ENABLED = FIREBASE_API_KEY !== '' && FIREBASE_PROJECT_ID !== ''

/** ローカルモードでの管理画面の合言葉（Firebase モードでは Firebase のパスワードを使う） */
export const ADMIN_PASSCODE: string = import.meta.env.VITE_ADMIN_PASSCODE ?? 'classmatch'

/** WBGT 更新間隔（ms）。環境省の実況値は20分毎更新なので5分あれば十分 */
export const WBGT_INTERVAL_MS = 5 * 60 * 1000

/** WBGT 観測地点番号（高松） */
export const WBGT_SPOT = '72086'
