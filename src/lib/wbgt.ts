import { FIREBASE_ENABLED, WBGT_SPOT } from './config'
import { debugLog } from './debug'

export interface WbgtLevel {
  name: string
  color: string   // 文字・帯の色
  bg: string      // 背景の淡色
  advice: string
}

export function wbgtLevel(value: number): WbgtLevel {
  if (value >= 31) return { name: '危険', color: '#dc2626', bg: '#fee2e2', advice: '運動は原則中止' }
  if (value >= 28) return { name: '厳重警戒', color: '#ea580c', bg: '#ffedd5', advice: '激しい運動は中止' }
  if (value >= 25) return { name: '警戒', color: '#d97706', bg: '#fef3c7', advice: '積極的に休息' }
  if (value >= 21) return { name: '注意', color: '#16a34a', bg: '#dcfce7', advice: '積極的に水分補給' }
  return { name: 'ほぼ安全', color: '#2563eb', bg: '#dbeafe', advice: '適宜水分補給' }
}

export interface WbgtResult {
  value: number
  measuredAt: string          // 例: 2026-07-14 10:20
  source: 'direct' | 'shared'
  dataType: '実測値' | '実況推定値'
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

interface ApiRow {
  wbgt_date?: string
  wbgt_WO?: string | number
  [key: string]: unknown
}

async function fetchJson(url: string): Promise<{ data?: ApiRow[] }> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function buildQuery(dataType: 0 | 1): string {
  const now = new Date()
  const from = new Date(now)
  from.setHours(now.getHours() - 6)
  return (
    `data_type=${dataType}&location_type=1&wbgt_nos=${WBGT_SPOT}` +
    `&date_from=${fmt(from)}&date_to=${fmt(now)}`
  )
}

function pickLatest(body: { data?: ApiRow[] }): ApiRow | null {
  const rows = (body.data ?? []).filter(
    (r) => r.wbgt_WO !== undefined && r.wbgt_WO !== null && String(r.wbgt_WO) !== '',
  )
  return rows.length > 0 ? rows[rows.length - 1] : null
}

let cache: { at: number; promise: Promise<WbgtResult> } | null = null

/** 管理画面のサムネイル等で同時に何枚も表示しても、APIへの取得は1分に1回に抑える */
export function fetchWbgtCached(): Promise<WbgtResult> {
  const now = Date.now()
  if (cache && now - cache.at < 60_000) return cache.promise
  const promise = fetchWbgt()
  cache = { at: now, promise }
  promise.catch(() => {
    if (cache?.promise === promise) cache = null
  })
  return promise
}

/** 取得成功時に Firestore へ共有（管理画面＝ログイン済みの端末のみ書ける）。
 *  エルモ側で env.go.jp が弾かれても、本部PCが取得した値で表示を継続できる */
async function publishShared(result: WbgtResult) {
  if (!FIREBASE_ENABLED) return
  try {
    const [{ doc, setDoc }, { getFirebase }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase'),
    ])
    const { db, auth } = getFirebase()
    await auth.authStateReady()
    if (!auth.currentUser) return
    await setDoc(doc(db, 'classmatch', 'wbgt'), {
      value: result.value,
      measuredAt: result.measuredAt,
      dataType: result.dataType,
      sharedAt: Date.now(),
    })
    debugLog('WBGT: 取得値を Firestore に共有')
  } catch {
    /* 共有は補助機能なので失敗しても無視 */
  }
}

/** 直接取得できない端末向け：他の端末が共有した最新値を読む（3時間以内のみ有効） */
async function fetchShared(): Promise<WbgtResult> {
  if (!FIREBASE_ENABLED) throw new Error('Firebase未設定')
  const [{ doc, getDoc }, { getFirebase }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase'),
  ])
  const snap = await getDoc(doc(getFirebase().db, 'classmatch', 'wbgt'))
  const data = snap.data()
  if (!data) throw new Error('共有データなし')
  if (Date.now() - (data.sharedAt as number) > 3 * 60 * 60 * 1000) {
    throw new Error('共有データが古い')
  }
  return {
    value: data.value as number,
    measuredAt: data.measuredAt as string,
    source: 'shared',
    dataType: data.dataType as WbgtResult['dataType'],
  }
}

/** 環境省APIを直接取得（実測値 → 実況推定値の順）。
 *  失敗したら他端末が Firestore に共有した値へフォールバックする */
export async function fetchWbgt(): Promise<WbgtResult> {
  let lastError: unknown = null
  for (const dataType of [1, 0] as const) {
    const label = dataType === 1 ? '実測値' : '実況推定値'
    try {
      const body = await fetchJson(
        `https://www.wbgt.env.go.jp/api/v1/getSurveyData?${buildQuery(dataType)}`,
      )
      const latest = pickLatest(body)
      if (!latest) {
        debugLog(`WBGT: ${label} はデータ空、次を試行`)
        continue
      }
      const value = Number(latest.wbgt_WO)
      const measuredAt = (latest.wbgt_date ?? '').replace(/:00$/, '')
      debugLog(`WBGT: ${label} から取得成功 (${value})`)
      const result: WbgtResult = { value, measuredAt, source: 'direct', dataType: label }
      publishShared(result)
      return result
    } catch (e) {
      lastError = e
      debugLog(`WBGT: ${label} 失敗 (${String(e)})`)
    }
  }

  try {
    const shared = await fetchShared()
    debugLog(`WBGT: 直接取得できないため共有値を使用 (${shared.value})`)
    return shared
  } catch (e) {
    debugLog(`WBGT: 共有値も取得できず (${String(e)})`)
  }
  throw lastError ?? new Error('WBGTデータなし')
}
