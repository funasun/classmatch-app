import { useEffect, useState } from 'react'
import { useEditableState } from '../lib/useSyncedState'
import { ADMIN_PASSCODE } from '../lib/config'
import type { AlertStatus } from '../types'
import { SlideList } from './SlideList'
import { SlideEditor } from './editors'
import { SlideCanvas } from '../display/DisplayPage'
import { pageCount } from '../display/frames'

const AUTH_KEY = 'classmatch-admin-ok'

function PasscodeGate({ onOk }: { onOk: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (input === ADMIN_PASSCODE) {
      sessionStorage.setItem(AUTH_KEY, '1')
      onOk()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="w-96 rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-1 text-center text-2xl font-extrabold text-slate-800">
          夏季クラスマッチ2026
        </h1>
        <p className="mb-6 text-center font-bold text-slate-500">本部管理画面</p>
        <input
          type="password"
          placeholder="合言葉を入力"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="mb-3 w-full rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-lg font-bold focus:border-blue-500 focus:outline-none"
          autoFocus
        />
        {error && <p className="mb-3 text-center font-bold text-red-600">合言葉が違います</p>}
        <button
          onClick={submit}
          className="w-full rounded-xl bg-blue-600 py-3 text-lg font-extrabold text-white hover:bg-blue-700"
        >
          入る
        </button>
      </div>
    </div>
  )
}

const ALERT_OPTIONS: { value: AlertStatus; label: string; active: string }[] = [
  { value: 'normal', label: '通常', active: 'bg-green-600 text-white' },
  { value: 'caution', label: '注意', active: 'bg-yellow-400 text-slate-900' },
  { value: 'canceled', label: '中止', active: 'bg-red-600 text-white' },
]

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const { state, update, saveError, mode } = useEditableState()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewPage, setPreviewPage] = useState(0)

  useEffect(() => {
    if (state && !selectedId && state.slides.length > 0) {
      setSelectedId(state.slides[0].id)
    }
  }, [state, selectedId])

  useEffect(() => setPreviewPage(0), [selectedId])

  if (!authed) return <PasscodeGate onOk={() => setAuthed(true)} />
  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center text-2xl font-bold text-slate-500">
        読み込み中...
      </div>
    )
  }

  const slide = state.slides.find((s) => s.id === selectedId) ?? null
  const pages = slide ? pageCount(slide, state) : 1
  const safePage = Math.min(previewPage, pages - 1)

  const setAlert = (value: AlertStatus) => {
    if (value === 'canceled' && !window.confirm('全画面に「試合中止」の赤いアラートを表示します。よろしいですか？')) {
      return
    }
    update((d) => (d.alert = value))
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* ヘッダー */}
      <header className="flex items-center gap-4 border-b border-slate-300 bg-white px-4 py-2 shadow-sm">
        <h1 className="text-lg font-extrabold text-slate-800">
          夏季クラスマッチ2026 <span className="text-sm font-bold text-slate-400">本部管理画面</span>
        </h1>

        <div className="flex items-center gap-1 rounded-xl border-2 border-slate-300 p-1">
          <span className="px-2 text-sm font-bold text-slate-500">試合状態:</span>
          {ALERT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setAlert(o.value)}
              className={`rounded-lg px-4 py-1.5 font-extrabold transition ${
                state.alert === o.value ? o.active : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-sm font-bold">
          {mode === 'local' && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700">
              ローカルモード（サーバ未接続）
            </span>
          )}
          {saveError ? (
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-700 animate-blink">
              ⚠ 保存できていません（通信を確認）
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">✓ 自動保存</span>
          )}
          <a
            href="#/"
            target="_blank"
            className="rounded-lg border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-50"
          >
            表示画面を開く ↗
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 左: スライド一覧 */}
        <aside className="w-72 shrink-0 border-r border-slate-300 bg-slate-50">
          <SlideList
            state={state}
            update={update}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </aside>

        {/* 右: プレビュー + 編集 */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
          {slide ? (
            <>
              <div className="mb-3 flex items-center gap-3">
                <input
                  value={slide.title}
                  onChange={(e) =>
                    update((d) => {
                      d.slides.find((s) => s.id === slide.id)!.title = e.target.value
                    })
                  }
                  className="rounded-lg border-2 border-transparent bg-transparent px-2 py-1 text-2xl font-extrabold text-slate-800 hover:border-slate-200 focus:border-blue-400 focus:outline-none"
                />
                {pages > 1 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: pages }, (_, p) => (
                      <button
                        key={p}
                        onClick={() => setPreviewPage(p)}
                        className={`rounded-lg px-3 py-1 font-bold ${
                          p === safePage ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'
                        }`}
                      >
                        {p + 1}/{pages}
                      </button>
                    ))}
                    <span className="ml-1 text-xs text-slate-400">
                      行が多いため自動でページ分割されます
                    </span>
                  </div>
                )}
              </div>

              {/* エルモと同じ見え方のプレビュー（16:9） */}
              <div className="mb-4 aspect-video w-full max-w-3xl shrink-0 overflow-hidden rounded-xl border-4 border-slate-700 bg-slate-900 shadow-lg">
                <SlideCanvas
                  frame={{ slide, page: safePage, pages, key: `preview-${slide.id}-${safePage}` }}
                  state={state}
                />
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <SlideEditor slide={slide} state={state} update={update} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              左の一覧からスライドを選んでください
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
