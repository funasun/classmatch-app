import { wbgtLevel } from '../../lib/wbgt'
import type { WbgtSlide } from '../../types'

const SCALE = [
  { label: 'ほぼ安全', range: '〜21', color: '#2563eb' },
  { label: '注意', range: '21〜', color: '#16a34a' },
  { label: '警戒', range: '25〜', color: '#d97706' },
  { label: '厳重警戒', range: '28〜', color: '#ea580c' },
  { label: '危険', range: '31〜', color: '#dc2626' },
]

/** 1測定地点のカード（大きな数値＋レベル） */
function ReadingCard({ label, value }: { label: string; value: string }) {
  const num = Number(value)
  const hasValue = value.trim() !== '' && Number.isFinite(num)
  const level = hasValue ? wbgtLevel(num) : null

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 px-8 py-8"
      style={{
        backgroundColor: level?.bg ?? '#f1f5f9',
        borderColor: level?.color ?? '#cbd5e1',
      }}
    >
      <div className="text-[40px] font-extrabold text-slate-700">{label}</div>
      {hasValue && level ? (
        <>
          <div className="flex items-baseline gap-4">
            <span className="text-[140px] font-extrabold leading-none" style={{ color: level.color }}>
              {num.toFixed(1)}
            </span>
          </div>
          <span
            className="rounded-2xl px-8 py-3 text-[52px] font-extrabold text-white"
            style={{ backgroundColor: level.color }}
          >
            {level.name}
          </span>
          <div className="text-[28px] font-bold text-slate-700">{level.advice}</div>
        </>
      ) : (
        <div className="py-10 text-[44px] font-bold text-slate-400">未測定</div>
      )}
    </div>
  )
}

export function WbgtView({ slide }: { slide: WbgtSlide }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-100 px-10 py-8">
      <div className="text-[44px] font-extrabold tracking-widest text-slate-700">
        暑さ指数（WBGT）
      </div>

      <div className="flex w-full flex-1 items-stretch gap-8">
        {slide.readings.map((r, i) => (
          <ReadingCard key={i} label={r.label} value={r.value} />
        ))}
      </div>

      <div className="flex gap-2">
        {SCALE.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-lg px-5 py-2 text-white"
            style={{ backgroundColor: s.color }}
          >
            <span className="text-[22px] font-bold">{s.label}</span>
            <span className="text-[16px]">{s.range}</span>
          </div>
        ))}
      </div>

      {slide.measuredAt.trim() !== '' && (
        <div className="text-[22px] text-slate-500">{slide.measuredAt} 時点の測定値</div>
      )}

      <div className="rounded-xl border-4 border-slate-400 bg-white/80 px-8 py-2 text-[24px] font-bold text-slate-600">
        ※この値は参考です。中止・中断の最終判断は保健室が行います。
      </div>
    </div>
  )
}
