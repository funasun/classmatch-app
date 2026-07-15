import { useState, type ReactNode } from 'react'
import type {
  AppState,
  Court,
  CourtId,
  LiveStreamSlide,
  MatchResultsSlide,
  NoticeSlide,
  Slide,
  TableSlide,
  WbgtSlide,
} from '../types'
import { EditableGrid } from './EditableGrid'
import { youtubeEmbedSrc } from '../display/slides/LiveStreamView'

type Update = (mutate: (draft: AppState) => void) => void

/* ---------- 試合データ（コート別）の編集 ---------- */

function courtToGrid(court: Court): string[][] {
  return court.rows.map((r) => [
    r.code,
    r.stage ?? '',
    r.time ?? '',
    r.left,
    r.leftScore,
    r.rightScore,
    r.right,
  ])
}

function gridToRows(grid: string[][]) {
  return grid.map((r) => ({
    code: r[0] ?? '',
    stage: r[1] ?? '',
    time: r[2] ?? '',
    left: r[3] ?? '',
    leftScore: r[4] ?? '',
    rightScore: r[5] ?? '',
    right: r[6] ?? '',
  }))
}

/** 全コートの進行をワンタッチで進めるパネル。コートごとに進捗が違ってもOK */
function AllCourtsPanel({ state, update }: { state: AppState; update: Update }) {
  const advance = (id: CourtId, delta: number) =>
    update((d) => {
      const c = d.courts.find((c) => c.id === id)!
      c.current = Math.max(-1, Math.min(c.rows.length, c.current + delta))
    })

  return (
    <div className="mb-4 rounded-xl border-2 border-slate-200 bg-white p-3">
      <div className="mb-2 font-bold text-slate-600">
        全コートの進行（押すとすぐ全エルモに反映）
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {state.courts.map((c) => {
          const m = c.rows[c.current]
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <span
                className="w-8 shrink-0 rounded-md py-1 text-center font-extrabold text-white"
                style={{ backgroundColor: c.color }}
              >
                {c.id}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                {c.current < 0
                  ? '開始前'
                  : c.current >= c.rows.length
                    ? '全試合終了'
                    : `${m?.code} ${m?.left} vs ${m?.right}`}
              </span>
              <button
                onClick={() => advance(c.id, -1)}
                title="ひとつ戻る"
                className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-bold hover:bg-slate-100"
              >
                ←
              </button>
              <button
                onClick={() => advance(c.id, 1)}
                className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                次へ →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CourtDataEditor({ state, update }: { state: AppState; update: Update }) {
  const [activeId, setActiveId] = useState<CourtId>('A')
  const court = state.courts.find((c) => c.id === activeId)!
  const currentMatch = court.rows[court.current]

  const setCurrent = (value: number) =>
    update((d) => {
      const c = d.courts.find((c) => c.id === activeId)!
      c.current = Math.max(-1, Math.min(c.rows.length, value))
    })

  return (
    <div>
      <AllCourtsPanel state={state} update={update} />

      <div className="mb-3 flex gap-1">
        {state.courts.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`rounded-t-lg px-4 py-2 font-bold text-white transition ${
              c.id === activeId ? '' : 'opacity-40 hover:opacity-70'
            }`}
            style={{ backgroundColor: c.color }}
          >
            {c.id}（{c.label}）
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
        <span className="font-bold text-slate-600">今の試合:</span>
        {court.current < 0 ? (
          <span className="font-bold text-slate-500">開始前</span>
        ) : court.current >= court.rows.length ? (
          <span className="font-bold text-slate-500">全試合終了</span>
        ) : (
          <span className="rounded-lg bg-yellow-200 px-3 py-1 text-lg font-extrabold">
            {currentMatch?.code} {currentMatch?.left} vs {currentMatch?.right}
          </span>
        )}
        <button
          onClick={() => setCurrent(court.current - 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold hover:bg-slate-100"
        >
          ← ひとつ戻る
        </button>
        <button
          onClick={() => setCurrent(court.current + 1)}
          className="rounded-lg bg-blue-600 px-5 py-1.5 text-lg font-extrabold text-white shadow hover:bg-blue-700"
        >
          次の試合へ →
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="font-bold text-slate-600">コート名:</span>
        <input
          value={court.label}
          onChange={(e) =>
            update((d) => {
              d.courts.find((c) => c.id === activeId)!.label = e.target.value
            })
          }
          className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
        />
        <span className="text-xs text-slate-400">表示画面の見出しに使われます</span>
      </div>

      <EditableGrid
        columnLabels={['コード', '区分', '時刻', 'クラス(左)', '点数(左)', '点数(右)', 'クラス(右)']}
        data={courtToGrid(court)}
        highlightRow={court.current}
        onChange={(grid) =>
          update((d) => {
            d.courts.find((c) => c.id === activeId)!.rows = gridToRows(grid)
          })
        }
      />
    </div>
  )
}

/* ---------- 試合結果速報スライド：表示コート選択 ---------- */

export function MatchResultsEditor({
  slide,
  state,
  update,
}: {
  slide: MatchResultsSlide
  state: AppState
  update: Update
}) {
  const toggleCourt = (id: CourtId) =>
    update((d) => {
      const s = d.slides.find((s) => s.id === slide.id) as MatchResultsSlide
      s.courts = s.courts.includes(id)
        ? s.courts.filter((c) => c !== id)
        : [...s.courts, id].sort()
    })

  return (
    <div>
      <div className="mb-4">
        <div className="mb-1 font-bold text-slate-600">このスライドに表示するコート</div>
        <div className="flex gap-2">
          {state.courts.map((c) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 font-bold ${
                slide.courts.includes(c.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <input
                type="checkbox"
                checked={slide.courts.includes(c.id)}
                onChange={() => toggleCourt(c.id)}
              />
              {c.id}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">2コートまでが見やすいです</p>
      </div>
      <label className="mb-4 block font-bold text-slate-600">
        タイトル帯の補足文（自由に変更できます）
        <input
          value={slide.note ?? ''}
          onChange={(e) =>
            update((d) => {
              ;(d.slides.find((s) => s.id === slide.id) as MatchResultsSlide).note = e.target.value
            })
          }
          className="mt-1 w-full max-w-xl rounded-lg border border-slate-300 px-3 py-2 font-semibold"
        />
      </label>
      <div className="mb-1 font-bold text-slate-600">試合データの編集（全スライド共通）</div>
      <CourtDataEditor state={state} update={update} />
    </div>
  )
}

/* ---------- 汎用の表スライド ---------- */

export function TableEditor({
  slide,
  update,
}: {
  slide: TableSlide
  update: Update
}) {
  const mutateSlide = (fn: (s: TableSlide) => void) =>
    update((d) => fn(d.slides.find((s) => s.id === slide.id) as TableSlide))

  const addColumn = () =>
    mutateSlide((s) => {
      s.header.push(`列${s.header.length + 1}`)
      s.rows.forEach((r) => r.push(''))
    })

  const removeColumn = () =>
    mutateSlide((s) => {
      if (s.header.length <= 1) return
      s.header.pop()
      s.rows.forEach((r) => r.pop())
    })

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="font-bold text-slate-600">見出し行:</span>
        {slide.header.map((h, i) => (
          <input
            key={i}
            value={h}
            onChange={(e) =>
              mutateSlide((s) => {
                s.header[i] = e.target.value
              })
            }
            className="w-28 rounded border border-slate-300 px-2 py-1 text-center font-bold"
          />
        ))}
        <button
          onClick={addColumn}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          ＋ 列
        </button>
        <button
          onClick={removeColumn}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold hover:bg-slate-50"
        >
          − 列
        </button>
      </div>
      <EditableGrid
        columnLabels={slide.header}
        data={slide.rows}
        onChange={(rows) => mutateSlide((s) => (s.rows = rows))}
      />
    </div>
  )
}

/* ---------- お知らせスライド ---------- */

export function NoticeEditor({
  slide,
  update,
}: {
  slide: NoticeSlide
  update: Update
}) {
  const mutateSlide = (fn: (s: NoticeSlide) => void) =>
    update((d) => fn(d.slides.find((s) => s.id === slide.id) as NoticeSlide))

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <label className="font-bold text-slate-600">
        見出し
        <input
          value={slide.heading}
          onChange={(e) => mutateSlide((s) => (s.heading = e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold"
        />
      </label>
      <label className="font-bold text-slate-600">
        本文
        <textarea
          value={slide.body}
          onChange={(e) => mutateSlide((s) => (s.body = e.target.value))}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg"
        />
      </label>
    </div>
  )
}

/* ---------- 暑さ指数スライド：測定値の手入力 ---------- */

export function WbgtEditor({
  slide,
  update,
}: {
  slide: WbgtSlide
  update: Update
}) {
  const mutateSlide = (fn: (s: WbgtSlide) => void) =>
    update((d) => fn(d.slides.find((s) => s.id === slide.id) as WbgtSlide))

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-slate-500">
        自分たちで測定したWBGTの値を入力してください。入力するとすぐ全エルモに反映されます。
        値に応じて色とレベル（注意・警戒など）が自動で切り替わります。
      </p>

      {slide.readings.map((r, i) => (
        <div
          key={i}
          className="flex items-end gap-3 rounded-xl border-2 border-slate-200 bg-white p-3"
        >
          <label className="flex-1 font-bold text-slate-600">
            測定場所
            <input
              value={r.label}
              onChange={(e) =>
                mutateSlide((s) => {
                  s.readings[i].label = e.target.value
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-bold"
            />
          </label>
          <label className="w-32 font-bold text-slate-600">
            WBGT値
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={r.value}
              placeholder="例: 28.5"
              onChange={(e) =>
                mutateSlide((s) => {
                  s.readings[i].value = e.target.value
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-extrabold"
            />
          </label>
          {slide.readings.length > 1 && (
            <button
              onClick={() =>
                mutateSlide((s) => {
                  s.readings.splice(i, 1)
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              削除
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() =>
          mutateSlide((s) => {
            s.readings.push({ label: '測定場所', value: '' })
          })
        }
        className="self-start rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
      >
        ＋ 測定場所を追加
      </button>

      <label className="font-bold text-slate-600">
        測定時刻（任意・例: 10:20）
        <input
          value={slide.measuredAt}
          placeholder="空欄なら表示しません"
          onChange={(e) => mutateSlide((s) => (s.measuredAt = e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
        />
      </label>
    </div>
  )
}

/* ---------- ライブ映像スライド：YouTube URLの入力 ---------- */

/** 配信ページ（この端末以外＝配信端末で開くURL）を組み立てる */
function broadcastUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base}#/broadcast`
}

function SourceTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-bold ${
        active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

export function LiveStreamEditor({
  slide,
  update,
}: {
  slide: LiveStreamSlide
  update: Update
}) {
  const mutateSlide = (fn: (s: LiveStreamSlide) => void) =>
    update((d) => fn(d.slides.find((s) => s.id === slide.id) as LiveStreamSlide))

  const source = slide.source ?? 'youtube'
  const [copied, setCopied] = useState(false)
  const url = broadcastUrl()

  const copy = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  const trimmed = slide.url.trim()
  const embed = youtubeEmbedSrc(slide.url)
  const status =
    trimmed === ''
      ? { text: '未入力（このスライドは何も表示しません）', cls: 'text-slate-400' }
      : embed
        ? { text: '✓ このURLを埋め込めます', cls: 'text-green-600' }
        : { text: '⚠ YouTubeのURLとして認識できません', cls: 'text-red-600' }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <div className="mb-1 font-bold text-slate-600">配信方法</div>
        <div className="flex gap-2">
          <SourceTab active={source === 'inApp'} onClick={() => mutateSlide((s) => (s.source = 'inApp'))}>
            📷 アプリで配信（カメラ直結・おすすめ）
          </SourceTab>
          <SourceTab active={source === 'youtube'} onClick={() => mutateSlide((s) => (s.source = 'youtube'))}>
            ▶ YouTubeライブ
          </SourceTab>
        </div>
      </div>

      {source === 'inApp' ? (
        <>
          <p className="text-sm text-slate-500">
            配信端末（ギガスクール端末など）のカメラ映像を、外部サービスなしでそのまま観戦端末へ届けます。
            アカウント資格や登録者数は不要です。
          </p>
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
            <div className="mb-1 font-bold text-slate-700">配信のはじめかた</div>
            <ol className="ml-4 list-decimal text-sm text-slate-600">
              <li>配信端末で下のURL（配信ページ）を開く</li>
              <li>「カメラを起動」→「配信を開始」を押す</li>
              <li>このスライドをON（または「今すぐ表示」）にする</li>
            </ol>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={url}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              />
              <button
                onClick={copy}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                {copied ? 'コピー済' : 'コピー'}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg border border-blue-600 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                開く
              </a>
            </div>
          </div>
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            ※ 学校ネットワークが端末どうしの直接通信を遮断していると映像が届かないことがあります。
            本番前に、配信端末＋観戦端末1台で一度テストしてください。うまくいかない場合は中継サーバー(TURN)の設定が必要です。
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            配信端末でYouTubeライブを開始し、その視聴URLをここに貼ると、スライドとして映像を流せます。
            観戦端末では音声ミュートで自動再生されます。
          </p>
          <label className="font-bold text-slate-600">
            YouTubeライブのURL
            <input
              value={slide.url}
              onChange={(e) => mutateSlide((s) => (s.url = e.target.value))}
              placeholder="例: https://www.youtube.com/watch?v=xxxxxxxxxxx"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
            />
            <span className={`mt-1 block text-sm font-bold ${status.cls}`}>{status.text}</span>
          </label>
          {embed && (
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-2">
              <div className="mb-1 text-xs font-bold text-slate-500">プレビュー</div>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe
                  key={embed}
                  src={embed}
                  title="ライブ映像プレビュー"
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
            ※ ライブ配信にはアカウントの資格（電話番号認証・登録者数など）が必要で、学校アカウントでは使えないことがあります。
          </p>
        </>
      )}

      <label className="font-bold text-slate-600">
        映像の下に出す補足文（任意）
        <input
          value={slide.caption ?? ''}
          onChange={(e) => mutateSlide((s) => (s.caption = e.target.value))}
          placeholder="例: A・Bコート（体育館）の様子"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
        />
      </label>
    </div>
  )
}

/* ---------- スライド種類ごとのエディタ振り分け ---------- */

export function SlideEditor({
  slide,
  state,
  update,
}: {
  slide: Slide
  state: AppState
  update: Update
}) {
  switch (slide.type) {
    case 'current':
      return (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            「次の試合へ」を押すと、表示中の全エルモに即反映されます。
          </p>
          <CourtDataEditor state={state} update={update} />
        </div>
      )
    case 'wbgt':
      return <WbgtEditor slide={slide} update={update} />
    case 'matchResults':
      return <MatchResultsEditor slide={slide} state={state} update={update} />
    case 'courtMap':
      return (
        <p className="text-slate-500">
          パンフレットの「試合コートについて」の図をもとに、どのコート（A〜F）がどの学年かを表示します。
          コート名と色は「試合データ」の各コート設定がそのまま使われるため、ここでの編集項目はありません。
          <br />
          右のプレビューで実際の表示を確認できます。
        </p>
      )
    case 'table':
      return <TableEditor slide={slide} update={update} />
    case 'notice':
      return <NoticeEditor slide={slide} update={update} />
    case 'liveStream':
      return <LiveStreamEditor slide={slide} update={update} />
  }
}
