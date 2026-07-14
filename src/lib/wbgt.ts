import { API_BASE, WBGT_SPOT } from './config'
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
  source: 'direct' | 'proxy'
  dataType: '実測値' | '実況推定値'
}

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

interface ApiRow {
  date?: string
  time?: string
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

/** 環境省API直接 → Xserverプロキシ の順で試し、
 *  それぞれ実測値(data_type=1) → 実況推定値(data_type=0) にフォールバックする */
export async function fetchWbgt(): Promise<WbgtResult> {
  const bases: { base: string; source: WbgtResult['source'] }[] = [
    { base: 'https://www.wbgt.env.go.jp/api/v1/getSurveyData', source: 'direct' },
  ]
  if (API_BASE) bases.push({ base: `${API_BASE}/wbgt.php`, source: 'proxy' })

  let lastError: unknown = null
  for (const { base, source } of bases) {
    for (const dataType of [1, 0] as const) {
      const label = dataType === 1 ? '実測値' : '実況推定値'
      try {
        const body = await fetchJson(`${base}?${buildQuery(dataType)}`)
        const latest = pickLatest(body)
        if (!latest) {
          debugLog(`WBGT: ${source}/${label} はデータ空、次を試行`)
          continue
        }
        const value = Number(latest.wbgt_WO)
        const measuredAt = [latest.date, latest.time].filter(Boolean).join(' ')
        debugLog(`WBGT: ${source}/${label} から取得成功 (${value})`)
        return { value, measuredAt, source, dataType: label }
      } catch (e) {
        lastError = e
        debugLog(`WBGT: ${source}/${label} 失敗 (${String(e)})`)
      }
    }
  }
  throw lastError ?? new Error('WBGTデータなし')
}
