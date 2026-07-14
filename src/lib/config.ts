/** Xserver 上の API ベースURL（例: https://funasun273.xsrv.jp/classmatch）。
 *  未設定ならローカルモード（同一ブラウザ内での同期・開発用）で動く。 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

/** 管理画面の合言葉 */
export const ADMIN_PASSCODE: string = import.meta.env.VITE_ADMIN_PASSCODE ?? 'classmatch'

/** 同期ポーリング間隔（ms） */
export const POLL_INTERVAL_MS = 1500

/** WBGT 更新間隔（ms）。環境省の実況値は20分毎更新なので5分あれば十分 */
export const WBGT_INTERVAL_MS = 5 * 60 * 1000

/** WBGT 観測地点番号（高松） */
export const WBGT_SPOT = '72086'
