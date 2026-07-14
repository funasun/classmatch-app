import { useState } from 'react'
import type {
  AppState,
  Court,
  CourtId,
  MatchResultsSlide,
  NoticeSlide,
  Slide,
  TableSlide,
} from '../types'
import { EditableGrid } from './EditableGrid'

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
      return (
        <p className="text-slate-500">
          暑さ指数は環境省のデータから自動取得されるため、編集項目はありません。
          <br />
          右のプレビューで実際の表示を確認できます。
        </p>
      )
    case 'matchResults':
      return <MatchResultsEditor slide={slide} state={state} update={update} />
    case 'table':
      return <TableEditor slide={slide} update={update} />
    case 'notice':
      return <NoticeEditor slide={slide} update={update} />
  }
}
