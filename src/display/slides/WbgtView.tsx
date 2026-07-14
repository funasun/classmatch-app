import { useEffect, useState } from 'react'
import { fetchWbgtCached, wbgtLevel, type WbgtResult } from '../../lib/wbgt'
import { WBGT_INTERVAL_MS } from '../../lib/config'

const SCALE = [
  { label: 'ほぼ安全', range: '〜21', color: '#2563eb' },
  { label: '注意', range: '21〜', color: '#16a34a' },
  { label: '警戒', range: '25〜', color: '#d97706' },
  { label: '厳重警戒', range: '28〜', color: '#ea580c' },
  { label: '危険', range: '31〜', color: '#dc2626' },
]

export function WbgtView() {
  const [result, setResult] = useState<WbgtResult | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = () =>
      fetchWbgtCached()
        .then((r) => {
          if (!mounted) return
          setResult(r)
          setFailed(false)
        })
        .catch(() => {
          if (mounted) setFailed(true)
        })
    load()
    const timer = setInterval(load, WBGT_INTERVAL_MS)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  const level = result ? wbgtLevel(result.value) : null

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-6"
      style={{ backgroundColor: level?.bg ?? '#f1f5f9' }}
    >
      <div className="text-[40px] font-extrabold tracking-widest text-slate-700">
        暑さ指数（WBGT）高松
      </div>

      {result && level ? (
        <>
          <div className="flex items-baseline gap-8">
            <span className="text-[200px] font-extrabold leading-none" style={{ color: level.color }}>
              {result.value.toFixed(1)}
            </span>
            <span
              className="rounded-2xl px-10 py-4 text-[72px] font-extrabold text-white"
              style={{ backgroundColor: level.color }}
            >
              {level.name}
            </span>
          </div>
          <div className="text-[34px] font-bold text-slate-700">{level.advice}</div>
          <div className="flex gap-2">
            {SCALE.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-lg px-5 py-2 text-white"
                style={{
                  backgroundColor: s.color,
                  outline: level.name === s.label ? '5px solid #0f172a' : 'none',
                }}
              >
                <span className="text-[22px] font-bold">{s.label}</span>
                <span className="text-[16px]">{s.range}</span>
              </div>
            ))}
          </div>
          <div className="text-[20px] text-slate-500">
            {result.measuredAt} 時点の{result.dataType}（環境省 熱中症予防情報サイト）
          </div>
        </>
      ) : failed ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-[56px] font-extrabold text-slate-600">取得できません</div>
          <div className="text-[36px] font-bold text-red-600">保健室の指示を優先してください</div>
        </div>
      ) : (
        <div className="text-[40px] font-bold text-slate-400">取得中...</div>
      )}

      <div className="rounded-xl border-4 border-slate-400 bg-white/80 px-8 py-2 text-[24px] font-bold text-slate-600">
        ※この値は参考です。中止・中断の最終判断は保健室が行います。
      </div>
    </div>
  )
}
