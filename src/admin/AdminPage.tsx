import { useEffect, useState } from 'react'
import { useEditableState } from '../lib/useSyncedState'
import { backend } from '../lib/sync'
import { createInitialState } from '../data/initialState'
import type { AlertStatus, AppState } from '../types'
import { SlideList } from './SlideList'
import { SlideEditor } from './editors'
import { SlideCanvas } from '../display/DisplayPage'
import { pageCount } from '../display/frames'

const AUTH_KEY = 'classmatch-admin-ok'

function PasscodeGate({ onOk }: { onOk: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    const ok = await backend.verifyPasscode(input)
    setBusy(false)
    if (ok) {
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
          disabled={busy}
          className="w-full rounded-xl bg-blue-600 py-3 text-lg font-extrabold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? '確認中...' : '入る'}
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

/** 注意バナー・中止画面の文言を編集するダイアログ */
function TextsDialog({
  state,
  update,
  onClose,
}: {
  state: AppState
  update: (mutate: (draft: AppState) => void) => void
  onClose: () => void
}) {
  const set = (key: keyof AppState['texts'], value: string) =>
    update((d) => {
      d.texts[key] = value
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50" onClick={onClose}>
      <div
        className="w-[560px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-extrabold text-slate-800">表示画面の文言設定</h2>
        <div className="flex flex-col gap-4">
          <label className="font-bold text-slate-600">
            「注意」のときの上部バナー
            <input
              value={state.texts.cautionBanner}
              onChange={(e) => set('cautionBanner', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
            />
          </label>
          <label className="font-bold text-slate-600">
            「中止」のときの大見出し（改行できます）
            <textarea
              value={state.texts.cancelTitle}
              onChange={(e) => set('cancelTitle', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
            />
          </label>
          <label className="font-bold text-slate-600">
            「中止」のときの補足文
            <input
              value={state.texts.cancelSub}
              onChange={(e) => set('cancelSub', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-400">編集はすぐに自動保存されます</p>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-800 py-2.5 font-extrabold text-white hover:bg-slate-700"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

export function AdminPage() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const { state, update, saveError, mode } = useEditableState()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [showTexts, setShowTexts] = useState(false)

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
  const pinnedSlide = state.slides.find((s) => s.id === state.pinnedSlideId) ?? null
  const pages = slide ? pageCount(slide, state) : 1
  const safePage = Math.min(previewPage, pages - 1)

  const setAlert = (value: AlertStatus) => {
    if (value === 'canceled' && !window.confirm('全画面に「試合中止」の赤いアラートを表示します。よろしいですか？')) {
      return
    }
    update((d) => (d.alert = value))
  }

  const resetToLatest = () => {
    if (
      !window.confirm(
        '最新の試合順・スライド構成に初期化します。\n' +
          '現在の得点・進行位置・スライドの編集内容はすべて消えて、既定の内容に戻ります。\n' +
          '（本番の試合が始まる前に一度だけ実行してください）\n\nよろしいですか？',
      )
    ) {
      return
    }
    update((d) => {
      const fresh = createInitialState()
      d.alert = fresh.alert
      d.pinnedSlideId = fresh.pinnedSlideId
      d.texts = fresh.texts
      d.courts = fresh.courts
      d.slides = fresh.slides
    })
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

        <button
          onClick={() => setShowTexts(true)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          文言設定
        </button>

        <button
          onClick={resetToLatest}
          className="rounded-lg border border-amber-400 px-3 py-1.5 text-sm font-bold text-amber-700 hover:bg-amber-50"
          title="試合順やスライド構成を最新の既定内容に戻します（本番前に一度だけ）"
        >
          最新の試合順に初期化
        </button>

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

      {/* 流し文字（テロップ）設定バー */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <label className="flex shrink-0 items-center gap-2 font-bold text-slate-700">
          <input
            type="checkbox"
            checked={state.ticker.enabled}
            onChange={(e) =>
              update((d) => {
                d.ticker ??= { enabled: false, text: '' }
                d.ticker.enabled = e.target.checked
              })
            }
            className="h-5 w-5"
          />
          流し文字
        </label>
        <input
          value={state.ticker.text}
          onChange={(e) =>
            update((d) => {
              d.ticker ??= { enabled: false, text: '' }
              d.ticker.text = e.target.value
            })
          }
          placeholder="画面下に流すお知らせを入力（例: 3年女子 決勝は13時より体育館で行います）"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold focus:border-blue-500 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-slate-400">
          ONにすると全画面の下に右から左へ流れます
        </span>
      </div>

      {/* 固定表示中の帯 */}
      {pinnedSlide && (
        <div className="flex items-center justify-center gap-4 bg-yellow-400 px-4 py-1.5 text-sm font-extrabold text-slate-900">
          📌 全エルモに「{pinnedSlide.title}」を固定表示中（ローテーション停止）
          <button
            onClick={() => update((d) => (d.pinnedSlideId = null))}
            className="rounded-lg bg-slate-900 px-3 py-1 text-white hover:bg-slate-700"
          >
            解除してローテーションに戻す
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* 左: スライド一覧 */}
        <aside className="w-80 shrink-0 border-r border-slate-300 bg-slate-50">
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

      {showTexts && (
        <TextsDialog state={state} update={update} onClose={() => setShowTexts(false)} />
      )}
    </div>
  )
}
