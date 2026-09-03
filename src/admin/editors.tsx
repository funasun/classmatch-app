import { useEffect, useState, type ReactNode } from 'react'
import type {
  AppState,
  Court,
  CourtId,
  LiveStreamSlide,
  MatchResultsSlide,
  NoticeSlide,
  Slide,
  StandingsSlide,
  TableSlide,
  WbgtSlide,
} from '../types'
import { EditableGrid } from './EditableGrid'
import { youtubeEmbedSrc } from '../display/slides/LiveStreamView'
import { resolveTeam } from '../lib/results'

type Update = (mutate: (draft: AppState) => void) => void

/* ---------- 試合データ（コート別）の編集 ---------- */

function courtToGrid(court: Court): string[][] {
  return court.rows.map((r) => [
    r.code,
    r.stage ?? '',
    r.league ?? '',
    r.time ?? '',
    r.left,
    r.leftScore,
    r.rightScore,
    r.right,
  ])
}

/** '9:05~9:20' のような文字列中の「H:MM」全部に delta 分を足す。
 *  時刻の形をしていない文字（'抽選で決定'など）はそのまま */
function shiftTime(time: string, delta: number): string {
  return time.replace(/(\d{1,2}):(\d{2})/g, (_, h: string, m: string) => {
    const t = (((+h * 60 + +m + delta) % 1440) + 1440) % 1440
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  })
}

function gridToRows(grid: string[][]) {
  return grid.map((r) => ({
    code: r[0] ?? '',
    stage: r[1] ?? '',
    league: r[2] ?? '',
    time: r[3] ?? '',
    left: r[4] ?? '',
    leftScore: r[5] ?? '',
    rightScore: r[6] ?? '',
    right: r[7] ?? '',
  }))
}

const COURT_COLORS = [
  '#f4600c', '#29abe2', '#ffc000', '#22b04c', '#f79646', '#e75bc0',
  '#7030a0', '#00b0f0', '#c00000', '#92d050', '#0070c0', '#ff66cc',
]

/** 未使用のコート記号（A, B, C…）を返す */
function nextCourtId(courts: Court[]): string {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!courts.some((c) => c.id === ch)) return ch
  }
  return `コート${courts.length + 1}`
}

/** コート記号の編集欄。空・重複は確定させない（確定は Enter か欄を離れたとき） */
function CourtIdEditor({
  id,
  taken,
  onCommit,
}: {
  id: string
  taken: string[]
  onCommit: (next: string) => void
}) {
  const [draft, setDraft] = useState(id)
  useEffect(() => setDraft(id), [id])
  const commit = () => {
    const next = draft.trim()
    if (next === '' || next === id || taken.includes(next)) {
      setDraft(id)
      return
    }
    onCommit(next)
  }
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-center font-extrabold"
    />
  )
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
                    : `${m?.code} ${resolveTeam(m?.left ?? '', state.courts, c)} vs ${resolveTeam(m?.right ?? '', state.courts, c)}`}
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
  const [activeId, setActiveId] = useState<CourtId>(state.courts[0]?.id ?? 'A')
  const [shiftAll, setShiftAll] = useState(true)
  // 選択中のコートが消えていたら先頭のコートに切り替える
  const court = state.courts.find((c) => c.id === activeId) ?? state.courts[0]

  const addCourt = () => {
    const id = nextCourtId(state.courts)
    update((d) => {
      d.courts.push({
        id,
        label: '',
        color: COURT_COLORS[d.courts.length % COURT_COLORS.length],
        sport: '',
        place: '',
        rows: [],
        current: 0,
      })
    })
    setActiveId(id)
  }

  if (!court) {
    return (
      <div>
        <AllCourtsPanel state={state} update={update} />
        <p className="mb-3 text-slate-500">
          コートがありません。「コートを追加」して、試合データを入力（Excelから貼り付け）してください。
        </p>
        <button
          onClick={addCourt}
          className="rounded-lg bg-blue-600 px-4 py-2 font-extrabold text-white hover:bg-blue-700"
        >
          ＋ コートを追加
        </button>
      </div>
    )
  }

  const id = court.id
  const currentMatch = court.rows[court.current]
  const mutateCourt = (fn: (c: Court) => void) =>
    update((d) => {
      const c = d.courts.find((c) => c.id === id)
      if (c) fn(c)
    })

  const setCurrent = (value: number) =>
    mutateCourt((c) => {
      c.current = Math.max(-1, Math.min(c.rows.length, value))
    })

  /** 進行の遅れ対応：今の試合から後ろの時刻をまとめて delta 分ずらす */
  const shift = (delta: number) =>
    update((d) => {
      const targets = shiftAll ? d.courts : d.courts.filter((c) => c.id === id)
      for (const c of targets) {
        for (let i = Math.max(c.current, 0); i < c.rows.length; i++) {
          c.rows[i].time = shiftTime(c.rows[i].time ?? '', delta)
        }
      }
    })

  /** コート記号を変える。スライドの表示コート指定も追従させる（試合コードは変えない） */
  const renameCourt = (next: string) => {
    update((d) => {
      const c = d.courts.find((c) => c.id === id)
      if (!c) return
      c.id = next
      for (const s of d.slides) {
        if (s.type === 'matchResults' || s.type === 'standings') {
          s.courts = s.courts.map((x) => (x === id ? next : x))
        }
      }
    })
    setActiveId(next)
  }

  const removeCourt = () => {
    if (!window.confirm(`${id}コート（${court.label}）を試合データごと削除します。よろしいですか？`)) {
      return
    }
    const remaining = state.courts.filter((c) => c.id !== id)
    update((d) => {
      d.courts = d.courts.filter((c) => c.id !== id)
      for (const s of d.slides) {
        if (s.type === 'matchResults' || s.type === 'standings') {
          s.courts = s.courts.filter((x) => x !== id)
        }
      }
    })
    setActiveId(remaining[0]?.id ?? '')
  }

  /** 試合コードを「記号-連番」で上から付け直す */
  const renumber = () =>
    mutateCourt((c) => {
      c.rows.forEach((r, i) => {
        r.code = `${c.id}-${i + 1}`
      })
    })

  return (
    <div>
      <AllCourtsPanel state={state} update={update} />

      <div className="mb-3 flex flex-wrap items-end gap-1">
        {state.courts.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`rounded-t-lg px-4 py-2 font-bold text-white transition ${
              c.id === id ? '' : 'opacity-40 hover:opacity-70'
            }`}
            style={{ backgroundColor: c.color }}
          >
            {c.id}（{c.label || '名称未設定'}）
          </button>
        ))}
        <button
          onClick={addCourt}
          className="rounded-t-lg border-2 border-dashed border-slate-300 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
        >
          ＋ コート追加
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
        <span className="font-bold text-slate-600">今の試合:</span>
        {court.current < 0 ? (
          <span className="font-bold text-slate-500">開始前</span>
        ) : court.current >= court.rows.length ? (
          <span className="font-bold text-slate-500">全試合終了</span>
        ) : (
          <span className="rounded-lg bg-yellow-200 px-3 py-1 text-lg font-extrabold">
            {currentMatch?.code} {resolveTeam(currentMatch?.left ?? '', state.courts, court)} vs{' '}
            {resolveTeam(currentMatch?.right ?? '', state.courts, court)}
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

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-3">
        <span className="font-bold text-slate-600">
          ⏰ 進行が遅れたら — 今の試合から後ろの時刻をまとめてずらす:
        </span>
        {[-10, -5, 5, 10].map((d) => (
          <button
            key={d}
            onClick={() => shift(d)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-bold hover:bg-slate-100"
          >
            {d > 0 ? `+${d}分` : `${d}分`}
          </button>
        ))}
        <label className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={shiftAll}
            onChange={(e) => setShiftAll(e.target.checked)}
          />
          全コートまとめて
        </label>
        <span className="w-full text-xs text-slate-400">
          1試合だけ直したいときは、下の表の「時刻」のマスを直接書き換えられます
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-slate-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-1.5 font-bold text-slate-600">
          記号
          <CourtIdEditor id={id} taken={state.courts.map((c) => c.id)} onCommit={renameCourt} />
        </label>
        <label className="flex items-center gap-1.5 font-bold text-slate-600">
          コート名
          <input
            value={court.label}
            onChange={(e) => mutateCourt((c) => (c.label = e.target.value))}
            placeholder="例: 3年女子"
            className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
          />
        </label>
        <label className="flex items-center gap-1.5 font-bold text-slate-600">
          競技
          <input
            value={court.sport ?? ''}
            onChange={(e) => mutateCourt((c) => (c.sport = e.target.value))}
            placeholder="例: バスケットボール（空欄可）"
            className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
          />
        </label>
        <label className="flex items-center gap-1.5 font-bold text-slate-600">
          場所
          <input
            value={court.place ?? ''}
            onChange={(e) => mutateCourt((c) => (c.place = e.target.value))}
            placeholder="例: 体育館"
            className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 font-bold"
          />
        </label>
        <label className="flex items-center gap-1.5 font-bold text-slate-600">
          色
          <input
            type="color"
            value={court.color}
            onChange={(e) => mutateCourt((c) => (c.color = e.target.value))}
            className="h-8 w-10 cursor-pointer rounded border border-slate-300"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 font-bold text-slate-600">
          <input
            type="checkbox"
            checked={!!court.lowerWins}
            onChange={(e) => mutateCourt((c) => (c.lowerWins = e.target.checked))}
          />
          点数が少ない方が勝ち（タイム競技など）
        </label>
        <button
          onClick={removeCourt}
          className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 font-bold text-red-600 hover:bg-red-50"
        >
          このコートを削除
        </button>
        <span className="w-full text-xs text-slate-400">
          コート名・競技は表示画面の見出しに、場所はコート配置図のまとまりに使われます
        </span>
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-600">試合の一覧</span>
        <button
          onClick={renumber}
          title="コードを上から順に 記号-1, 記号-2… に付け直します"
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          コードを連番で付け直す
        </button>
        <span className="text-xs text-slate-400">
          区分に「リーグ」を含む行は順位表に集計されます（リーグ列に X/Y などを入れると、その単位で集計）。
          トーナメントは「A-8勝者」「Xリーグ1位」のように書くと結果確定後に自動でクラス名になります
        </span>
      </div>

      <EditableGrid
        columnLabels={['コード', '区分', 'リーグ', '時刻', 'クラス(左)', '点数(左)', '点数(右)', 'クラス(右)']}
        data={courtToGrid(court)}
        highlightRow={court.current}
        onChange={(grid) => mutateCourt((c) => (c.rows = gridToRows(grid)))}
      />
    </div>
  )
}

/* ---------- リーグ順位表スライド：表示コート選択 ---------- */

export function StandingsEditor({
  slide,
  state,
  update,
}: {
  slide: StandingsSlide
  state: AppState
  update: Update
}) {
  const toggleCourt = (id: CourtId) =>
    update((d) => {
      const s = d.slides.find((s) => s.id === slide.id) as StandingsSlide
      s.courts = s.courts.includes(id)
        ? s.courts.filter((c) => c !== id)
        : [...s.courts, id].sort()
    })

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        リーグ戦（区分に「リーグ」を含む行、またはリーグ列に名前を入れた行）の点数から、
        勝敗・得失点差を自動で集計して順位を出します。全試合が終わって順位が確定すると、
        「Xリーグ1位」のような対戦相手表記も自動でクラス名に置き換わります（同率＝抽選が必要なときはそのまま）。
      </p>
      <div className="mb-4">
        <div className="mb-1 font-bold text-slate-600">このスライドに表示するコート</div>
        <div className="flex flex-wrap gap-2">
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
      <div className="mb-1 font-bold text-slate-600">試合データの編集（全スライド共通）</div>
      <CourtDataEditor state={state} update={update} />
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
    case 'standings':
      return <StandingsEditor slide={slide} state={state} update={update} />
    case 'courtMap':
      return (
        <p className="text-slate-500">
          各コートの「場所」（体育館・グラウンドなど）ごとにまとめて、どのコートがどの学年・競技かを表示します。
          記号・コート名・色・競技・場所は「試合データ」の各コート設定がそのまま使われるため、ここでの編集項目はありません。
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
