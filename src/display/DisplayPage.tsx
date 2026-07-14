import { useEffect, useMemo, useRef, useState } from 'react'
import { useSyncedState } from '../lib/useSyncedState'
import { buildFrames, buildPinnedFrames, type Frame } from './frames'
import { SlideFrame } from './SlideFrame'
import { FitScale } from '../components/FitScale'
import { DebugOverlay } from './DebugOverlay'
import { isDebugMode } from '../lib/debug'
import type { AppState } from '../types'

/** 実寸1600×900のキャンバスに描いて画面全体へスケール。
 *  管理画面プレビューも同じ構図になる */
export function SlideCanvas({ frame, state }: { frame: Frame; state: AppState }) {
  return (
    <FitScale maxScale={10}>
      <div style={{ width: 1600, height: 900 }} className="overflow-hidden bg-white">
        <SlideFrame frame={frame} state={state} />
      </div>
    </FitScale>
  )
}

function CancelOverlay({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-red-600">
      <div className="animate-blink whitespace-pre-line text-center text-[9vw] font-extrabold leading-tight text-white drop-shadow-lg">
        {title}
      </div>
      <div className="whitespace-pre-line text-center text-[3.5vw] font-bold text-white">
        {sub}
      </div>
    </div>
  )
}

function CautionBanner({ text }: { text: string }) {
  return (
    <div className="absolute inset-x-0 top-0 z-40 bg-yellow-400 py-2 text-center text-[2.2vw] font-extrabold text-slate-900">
      {text}
    </div>
  )
}

/** 画面下を右から左へ流れるテロップ。同じ文を2つ並べて途切れずループさせる。
 *  文字数に応じて時間を変え、読みやすい一定速度にする */
function TickerBar({ text }: { text: string }) {
  const seconds = Math.max(14, text.length * 0.7)
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex h-16 items-center overflow-hidden bg-slate-900/85">
      <div
        className="flex shrink-0 whitespace-nowrap will-change-transform"
        style={{ animation: `marquee ${seconds}s linear infinite` }}
      >
        <span className="px-12 text-[2.6vw] font-extrabold tracking-wide text-white">{text}</span>
        <span className="px-12 text-[2.6vw] font-extrabold tracking-wide text-white" aria-hidden>
          {text}
        </span>
      </div>
    </div>
  )
}

export function DisplayPage() {
  const state = useSyncedState()
  const allFrames = useMemo(() => (state ? buildFrames(state) : []), [state])

  // 「今すぐ表示」で固定中なら、そのスライドのコマだけを表示する
  const pinned = useMemo(() => {
    if (!state?.pinnedSlideId) return null
    const frames = buildPinnedFrames(state, state.pinnedSlideId)
    return frames.length > 0 ? frames : null
  }, [state])
  const frames = pinned ?? allFrames

  const [index, setIndex] = useState(0)
  const [prevFrame, setPrevFrame] = useState<Frame | null>(null)
  const prevKeyRef = useRef<string>('')

  const canceled = state?.alert === 'canceled'
  const showTicker = !!state?.ticker?.enabled && !!state?.ticker?.text.trim() && !canceled
  const safeIndex = frames.length > 0 ? index % frames.length : 0
  const frame = frames[safeIndex] ?? null

  // ローテーションタイマー（中止中は停止。固定中はページ送りのみ）
  useEffect(() => {
    if (!frame || canceled || frames.length <= 1) return
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % frames.length),
      frame.slide.duration * 1000,
    )
    return () => clearTimeout(timer)
  }, [frame, frames.length, canceled])

  // 固定表示の開始・解除時は先頭ページから
  useEffect(() => setIndex(0), [state?.pinnedSlideId])

  // 画面の右側タップで次へ、左側タップで前へ（中止表示中は無効）
  const step = (delta: number) =>
    setIndex((i) => (frames.length > 0 ? (i + delta + frames.length) % frames.length : 0))
  const onTap = (e: React.MouseEvent) => {
    if (canceled || frames.length <= 1) return
    const x = e.clientX / window.innerWidth
    if (x > 0.66) step(1)
    else if (x < 0.34) step(-1)
  }

  // クロスフェード用に直前のコマを800msだけ残す
  useEffect(() => {
    if (!frame) return
    if (prevKeyRef.current && prevKeyRef.current !== frame.key) {
      const prev = frames.find((f) => f.key === prevKeyRef.current)
      if (prev) {
        setPrevFrame(prev)
        const t = setTimeout(() => setPrevFrame(null), 800)
        prevKeyRef.current = frame.key
        return () => clearTimeout(t)
      }
    }
    prevKeyRef.current = frame.key
  }, [frame, frames])

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-4xl font-bold text-white">
        接続中...
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900" onClick={onTap}>
      {frame ? (
        <>
          {/* 現在のコマ（フェードイン） */}
          <div key={frame.key} className="absolute inset-0 animate-[fade-in_0.8s_ease]">
            <SlideCanvas frame={frame} state={state} />
          </div>
          {/* 直前のコマ（フェードアウト） */}
          {prevFrame && prevFrame.key !== frame.key && (
            <div className="pointer-events-none absolute inset-0 animate-[fade-out_0.8s_ease_forwards]">
              <SlideCanvas frame={prevFrame} state={state} />
            </div>
          )}

          {/* 上部: スライド名（小さく） */}
          <div className="absolute left-0 top-0 z-30 rounded-br-xl bg-slate-900/70 px-5 py-1.5 text-xl font-bold text-white">
            {frame.slide.title}
            {frame.pages > 1 && (
              <span className="ml-3 text-yellow-300">
                {frame.page + 1}/{frame.pages}
              </span>
            )}
            {pinned && (
              <span className="ml-3 rounded bg-yellow-400 px-2 py-0.5 text-sm text-slate-900">
                📌 固定表示中
              </span>
            )}
          </div>

          {/* 左右のうっすら矢印（タップでページ送りできる目印） */}
          {!canceled && frames.length > 1 && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center pl-2 text-6xl font-bold text-white/25">
                ‹
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center pr-2 text-6xl font-bold text-white/25">
                ›
              </div>
            </>
          )}

          {/* 右下: 全体の位置（スライド 3/6 ＋ ドット） */}
          {!canceled && frames.length > 1 && (
            <div
              className={`absolute right-4 z-30 flex items-center gap-3 rounded-full bg-slate-900/70 px-4 py-1.5 ${
                showTicker ? 'bottom-20' : 'bottom-4'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {frames.map((f, i) => (
                  <span
                    key={f.key}
                    className={`rounded-full ${
                      i === safeIndex ? 'h-3 w-3 bg-sky-400' : 'h-2 w-2 bg-slate-500'
                    }`}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-white">
                {safeIndex + 1} / {frames.length}
              </span>
            </div>
          )}

          {/* 下部: 進捗バー（流し文字表示中はその上に出す） */}
          {!canceled && (
            <div
              className={`absolute inset-x-0 z-30 h-2 bg-slate-900/40 ${
                showTicker ? 'bottom-16' : 'bottom-0'
              }`}
            >
              <div
                key={frame.key}
                className="h-full bg-sky-400"
                style={{ animation: `progress ${frame.slide.duration}s linear forwards` }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-3xl font-bold text-slate-400">
          表示できるスライドがありません（管理画面でONにしてください）
        </div>
      )}

      {state.alert === 'caution' && <CautionBanner text={state.texts.cautionBanner} />}
      {showTicker && <TickerBar text={state.ticker.text} />}
      {canceled && <CancelOverlay title={state.texts.cancelTitle} sub={state.texts.cancelSub} />}
      {isDebugMode() && <DebugOverlay />}
    </div>
  )
}
