export interface WbgtLevel {
  name: string
  color: string   // 文字・帯の色
  bg: string      // 背景の淡色
  advice: string
}

/** WBGT値から警戒レベル（日本生気象学会の指針に準拠）を求める */
export function wbgtLevel(value: number): WbgtLevel {
  if (value >= 31) return { name: '危険', color: '#dc2626', bg: '#fee2e2', advice: '運動は原則中止' }
  if (value >= 28) return { name: '厳重警戒', color: '#ea580c', bg: '#ffedd5', advice: '激しい運動は中止' }
  if (value >= 25) return { name: '警戒', color: '#d97706', bg: '#fef3c7', advice: '積極的に休息' }
  if (value >= 21) return { name: '注意', color: '#16a34a', bg: '#dcfce7', advice: '積極的に水分補給' }
  return { name: 'ほぼ安全', color: '#2563eb', bg: '#dbeafe', advice: '適宜水分補給' }
}
