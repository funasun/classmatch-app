import { useRef, useState } from 'react'
import type { AppState, Slide, SlideType } from '../types'
import { SlideCanvas } from '../display/DisplayPage'
import { pageCount } from '../display/frames'
import { DEFAULT_RESULTS_NOTE } from '../data/initialState'

type Update = (mutate: (draft: AppState) => void) => void

const TYPE_INFO: Record<SlideType, { label: string; icon: string; color: string }> = {
  current: { label: '現在の試合', icon: '🏐', color: 'bg-blue-100 text-blue-800' },
  wbgt: { label: '暑さ指数', icon: '🌡️', color: 'bg-orange-100 text-orange-800' },
  matchResults: { label: '試合結果', icon: '📊', color: 'bg-green-100 text-green-800' },
  courtMap: { label: 'コート配置図', icon: '🗺️', color: 'bg-teal-100 text-teal-800' },
  table: { label: '表', icon: '📋', color: 'bg-purple-100 text-purple-800' },
  notice: { label: 'お知らせ', icon: '📢', color: 'bg-amber-100 text-amber-800' },
  liveStream: { label: 'ライブ映像', icon: '📹', color: 'bg-red-100 text-red-800' },
}

function newSlide(type: SlideType): Slide {
  const base = { id: crypto.randomUUID(), duration: 10, enabled: true }
  switch (type) {
    case 'current':
      return { ...base, type, title: '現在の試合' }
    case 'wbgt':
      return {
        ...base,
        type,
        title: '暑さ指数',
        readings: [
          { label: '体育館', value: '' },
          { label: 'ハンドボールコート', value: '' },
        ],
        measuredAt: '',
      }
    case 'matchResults':
      return { ...base, type, title: '試合結果速報', courts: ['A', 'B'], note: DEFAULT_RESULTS_NOTE }
    case 'courtMap':
      return { ...base, type, title: 'コート配置図' }
    case 'table':
      return {
        ...base,
        type,
        title: 'リーグ結果',
        header: ['クラス', '勝', '負', '順位'],
        rows: [['', '', '', '']],
      }
    case 'notice':
      return { ...base, type, title: 'お知らせ', heading: 'お知らせ', body: '' }
    case 'liveStream':
      return { ...base, type, title: 'ライブ映像', duration: 30, source: 'youtube', url: '', caption: '' }
  }
}

/** パワポ風のミニサムネイル（実際の表示と同じ描画を縮小） */
function Thumbnail({ slide, state }: { slide: Slide; state: AppState }) {
  return (
    <div className="pointer-events-none relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
      <SlideCanvas
        frame={{ slide, page: 0, pages: pageCount(slide, state), key: `thumb-${slide.id}` }}
        state={state}
      />
    </div>
  )
}

export function SlideList({
  state,
  update,
  selectedId,
  onSelect,
}: {
  state: AppState
  update: Update
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const dragIndex = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const move = (from: number, to: number) =>
    update((d) => {
      const [item] = d.slides.splice(from, 1)
      d.slides.splice(to, 0, item)
    })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-bold text-slate-700">スライド一覧</span>
        <div className="relative">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-blue-600 px-3 py-1 font-bold text-white hover:bg-blue-700"
          >
            ＋ 追加
          </button>
          {showAdd && (
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              {(Object.keys(TYPE_INFO) as SlideType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setShowAdd(false)
                    const slide = newSlide(t)
                    update((d) => d.slides.push(slide))
                    onSelect(slide.id)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-100"
                >
                  <span>{TYPE_INFO[t].icon}</span> {TYPE_INFO[t].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {state.slides.map((slide, i) => {
          const info = TYPE_INFO[slide.type]
          const isPinned = state.pinnedSlideId === slide.id
          return (
            <div
              key={slide.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(i)
              }}
              onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
              onDrop={() => {
                if (dragIndex.current !== null && dragIndex.current !== i) {
                  move(dragIndex.current, i)
                }
                dragIndex.current = null
                setDragOver(null)
              }}
              onClick={() => onSelect(slide.id)}
              className={`mb-2 cursor-pointer rounded-xl border-2 bg-white p-2 shadow-sm transition ${
                slide.id === selectedId ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
              } ${dragOver === i ? 'border-t-4 border-t-blue-400' : ''} ${
                slide.enabled || isPinned ? '' : 'opacity-50'
              } ${isPinned ? 'border-yellow-400 ring-2 ring-yellow-200' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="cursor-grab text-slate-300" title="ドラッグで並べ替え">
                  ⠿
                </span>
                <span className="text-sm text-slate-400">{i + 1}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${info.color}`}>
                  {info.icon} {info.label}
                </span>
                {isPinned && (
                  <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-bold text-slate-900">
                    📌 固定表示中
                  </span>
                )}
              </div>

              <div className="mt-1.5">
                <Thumbnail slide={slide} state={state} />
              </div>

              <div className="mt-1 truncate font-bold text-slate-800">{slide.title}</div>

              <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={slide.enabled}
                    onChange={(e) =>
                      update((d) => {
                        d.slides.find((s) => s.id === slide.id)!.enabled = e.target.checked
                      })
                    }
                  />
                  表示する
                </label>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={slide.duration}
                    onChange={(e) =>
                      update((d) => {
                        d.slides.find((s) => s.id === slide.id)!.duration =
                          Math.max(3, Number(e.target.value) || 10)
                      })
                    }
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center"
                  />
                  秒
                </label>
                <button
                  onClick={() => {
                    if (window.confirm(`「${slide.title}」を削除しますか？`)) {
                      update((d) => {
                        if (d.pinnedSlideId === slide.id) d.pinnedSlideId = null
                        d.slides = d.slides.filter((s) => s.id !== slide.id)
                      })
                    }
                  }}
                  className="ml-auto rounded px-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                  title="削除"
                >
                  🗑
                </button>
              </div>

              <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                {isPinned ? (
                  <button
                    onClick={() => update((d) => (d.pinnedSlideId = null))}
                    className="w-full rounded-lg bg-yellow-400 py-1.5 text-sm font-extrabold text-slate-900 hover:bg-yellow-300"
                  >
                    固定を解除してローテーションに戻す
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      update((d) => {
                        d.pinnedSlideId = slide.id
                      })
                    }
                    className="w-full rounded-lg border-2 border-blue-600 py-1.5 text-sm font-extrabold text-blue-700 hover:bg-blue-50"
                  >
                    📌 今すぐ表示（このスライドに固定）
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
