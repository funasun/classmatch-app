import { type CSSProperties, type ReactNode } from 'react'
import { useSyncedState } from '../lib/useSyncedState'
import type { AppState, Court, LiveStreamSlide, MatchResultsSlide, NoticeSlide, Slide, Ticker, WbgtSlide } from '../types'
import { CourtTable } from '../display/slides/MatchResultsView'
import { youtubeEmbedSrc, InAppLiveVideo } from '../display/slides/LiveStreamView'
import { CourtMapView } from '../display/slides/CourtMapView'
import { TableView } from '../display/slides/TableView'
import { wbgtLevel } from '../lib/wbgt'
import { FitWidth } from './FitWidth'
import { TickerMarquee } from '../components/TickerMarquee'

/** スマホ縦画面（観戦者向け）。表示画面と同じ同期データを、
 *  16:9のまま縮めず縦に積み直して読みやすくする */
export function MobileView() {
  const state = useSyncedState()

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-2xl font-bold text-white">
        接続中...
      </div>
    )
  }

  if (state.alert === 'canceled') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-red-600 px-6 py-16">
        <div className="animate-blink whitespace-pre-line text-center text-5xl font-extrabold leading-tight text-white drop-shadow">
          {state.texts.cancelTitle}
        </div>
        <div className="whitespace-pre-line text-center text-xl font-bold text-white">
          {state.texts.cancelSub}
        </div>
      </div>
    )
  }

  const enabled = state.slides.filter((s) => s.enabled)

  return (
    <div className="min-h-screen bg-slate-100 pb-10">
      {/* ヘッダー・流し文字・注意バナーは上部に固定し、スクロールしても常に見えるようにする */}
      <div className="sticky top-0 z-30 shadow">
        <header className="bg-[#1e50a2] px-4 py-2.5 text-center text-lg font-extrabold tracking-wide text-white">
          夏季クラスマッチ 2026
        </header>

        {state.ticker.enabled && state.ticker.text.trim() && (
          <MobileTicker ticker={state.ticker} />
        )}

        {state.alert === 'caution' && (
          <div className="bg-yellow-400 px-3 py-2 text-center text-sm font-extrabold text-slate-900">
            {state.texts.cautionBanner}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 p-3">
        {enabled.map((slide) => (
          <MobileSection key={slide.id} slide={slide} state={state} />
        ))}
        {enabled.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            表示できる情報がありません
          </div>
        )}
      </div>
    </div>
  )
}

function MobileTicker({ ticker }: { ticker: Ticker }) {
  const unitSeconds = (ticker.text.length + 2) * 0.36
  const textStyle: CSSProperties = ticker.blink
    ? ({
        '--blink-a': ticker.color,
        '--blink-b': ticker.blinkColor,
        animation: 'ticker-blink 0.8s linear infinite',
      } as CSSProperties)
    : { color: ticker.color }
  return (
    <div
      className="flex h-12 items-center overflow-hidden"
      style={{ backgroundColor: ticker.bg }}
    >
      <TickerMarquee
        text={ticker.text}
        unitSeconds={unitSeconds}
        iteration="infinite"
        textStyle={textStyle}
        textClassName="text-2xl font-extrabold tracking-wide"
      />
    </div>
  )
}

function Card({ title, color, children }: { title: string; color?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div
        className="px-4 py-2 text-base font-extrabold text-white"
        style={{ backgroundColor: color ?? '#1e50a2' }}
      >
        {title}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function MobileSection({ slide, state }: { slide: Slide; state: AppState }) {
  switch (slide.type) {
    case 'current':
      return (
        <Card title="現在の試合">
          <div className="flex flex-col gap-3">
            {state.courts.map((c) => (
              <MobileCourtCard key={c.id} court={c} />
            ))}
          </div>
        </Card>
      )
    case 'matchResults':
      return <MobileResults slide={slide} courts={state.courts} />
    case 'wbgt':
      return <MobileWbgt slide={slide} />
    case 'notice':
      return <MobileNotice slide={slide} />
    case 'liveStream':
      return <MobileLive slide={slide} />
    case 'courtMap':
      return (
        <Card title={slide.title}>
          <FitWidth>
            <div style={{ width: 1600, height: 900 }} className="overflow-hidden">
              <CourtMapView courts={state.courts} />
            </div>
          </FitWidth>
        </Card>
      )
    case 'table':
      return (
        <Card title={slide.title}>
          <FitWidth>
            <div style={{ width: 1600, height: 900 }} className="overflow-hidden bg-white">
              <TableView slide={slide} page={0} pages={1} />
            </div>
          </FitWidth>
        </Card>
      )
  }
}

function MobileCourtCard({ court }: { court: Court }) {
  const match = court.rows[court.current]
  const next = court.rows[court.current + 1]
  const finished = court.current >= court.rows.length
  const notStarted = court.current < 0

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
      <div
        className="px-3 py-1 text-center text-base font-extrabold text-white"
        style={{ backgroundColor: court.color }}
      >
        {court.id}コート（{court.label}）
      </div>
      <div className="flex flex-col items-center gap-1 px-3 py-2.5">
        {finished ? (
          <div className="py-2 text-xl font-bold text-slate-400">全試合終了</div>
        ) : notStarted || !match ? (
          <div className="py-2 text-xl font-bold text-slate-400">開始前</div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-bold text-white">
                {match.code}
              </span>
              {match.time && (
                <span className="text-xs font-bold text-slate-500">{match.time}</span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-slate-900">{match.left}</span>
              <span className="text-base font-bold text-slate-400">vs</span>
              <span className="text-4xl font-extrabold text-slate-900">{match.right}</span>
            </div>
            {next && (
              <div className="text-center text-xs font-semibold text-slate-500">
                次: {next.code} {next.left} vs {next.right}
                {next.time && `（${next.time}）`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MobileResults({ slide, courts }: { slide: MatchResultsSlide; courts: Court[] }) {
  const shown = courts.filter((c) => slide.courts.includes(c.id))
  return (
    <Card title="進行表・試合結果速報">
      <div className="flex flex-col gap-4">
        {shown.map((c) => (
          <FitWidth key={c.id}>
            <CourtTable court={c} page={0} pages={1} />
          </FitWidth>
        ))}
        {slide.note && <p className="text-xs text-slate-500">{slide.note}</p>}
      </div>
    </Card>
  )
}

const WBGT_SCALE = [
  { label: 'ほぼ安全', range: '〜21', color: '#2563eb' },
  { label: '注意', range: '21〜', color: '#16a34a' },
  { label: '警戒', range: '25〜', color: '#d97706' },
  { label: '厳重警戒', range: '28〜', color: '#ea580c' },
  { label: '危険', range: '31〜', color: '#dc2626' },
]

function MobileWbgt({ slide }: { slide: WbgtSlide }) {
  return (
    <Card title="暑さ指数（WBGT）" color="#0f766e">
      <div className="flex flex-col gap-3">
        {slide.readings.map((r, i) => {
          const num = Number(r.value)
          const hasValue = r.value.trim() !== '' && Number.isFinite(num)
          const level = hasValue ? wbgtLevel(num) : null
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border-4 px-4 py-3"
              style={{
                backgroundColor: level?.bg ?? '#f1f5f9',
                borderColor: level?.color ?? '#cbd5e1',
              }}
            >
              <span className="text-lg font-extrabold text-slate-700">{r.label}</span>
              {hasValue && level ? (
                <span className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold leading-none" style={{ color: level.color }}>
                    {num.toFixed(1)}
                  </span>
                  <span
                    className="rounded-lg px-3 py-1 text-base font-extrabold text-white"
                    style={{ backgroundColor: level.color }}
                  >
                    {level.name}
                  </span>
                </span>
              ) : (
                <span className="text-lg font-bold text-slate-400">未測定</span>
              )}
            </div>
          )
        })}
        <div className="flex flex-wrap gap-1.5">
          {WBGT_SCALE.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded px-2 py-1 text-white"
              style={{ backgroundColor: s.color }}
            >
              <span className="text-xs font-bold">{s.label}</span>
              <span className="text-[10px]">{s.range}</span>
            </div>
          ))}
        </div>
        {slide.measuredAt.trim() !== '' && (
          <p className="text-xs text-slate-500">{slide.measuredAt} 時点の測定値</p>
        )}
        <p className="rounded-lg border-2 border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
          ※この値は参考です。中止・中断の最終判断は保健室が行います。
        </p>
      </div>
    </Card>
  )
}

function MobileLive({ slide }: { slide: LiveStreamSlide }) {
  const isInApp = slide.source === 'inApp'
  const src = youtubeEmbedSrc(slide.url)
  return (
    <Card title={`📹 ${slide.title}`} color="#c00">
      {isInApp ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <InAppLiveVideo />
        </div>
      ) : src ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            key={src}
            src={src}
            title={slide.title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg bg-slate-900 text-center text-slate-300">
          <span className="text-lg font-extrabold">配信の準備中です</span>
        </div>
      )}
      {slide.caption?.trim() && (
        <p className="mt-2 text-center text-sm font-bold text-slate-600">{slide.caption}</p>
      )}
    </Card>
  )
}

function MobileNotice({ slide }: { slide: NoticeSlide }) {
  return (
    <Card title={slide.heading || 'お知らせ'} color="#f59e0b">
      <p className="whitespace-pre-wrap text-lg font-bold leading-relaxed text-slate-800">
        {slide.body}
      </p>
    </Card>
  )
}
