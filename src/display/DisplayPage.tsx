import { useEffect, useMemo, useRef, useState } from 'react'
import { useSyncedState } from '../lib/useSyncedState'
import { buildFrames, type Frame } from './frames'
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

function CancelOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-red-600">
      <div className="animate-blink text-center text-[9vw] font-extrabold leading-tight text-white drop-shadow-lg">
        熱中症警戒のため
        <br />
        試合中止
      </div>
      <div className="text-center text-[3.5vw] font-bold text-white">
        保健室の指示があるまでお待ちください
      </div>
    </div>
  )
}

function CautionBanner() {
  return (
    <div className="absolute inset-x-0 top-0 z-40 bg-yellow-400 py-2 text-center text-[2.2vw] font-extrabold text-slate-900">
      ⚠ 熱中症注意 ― こまめに水分・塩分をとってください（保健室より）
    </div>
  )
}

export function DisplayPage() {
  const state = useSyncedState()
  const frames = useMemo(() => (state ? buildFrames(state) : []), [state])
  const [index, setIndex] = useState(0)
  const [prevFrame, setPrevFrame] = useState<Frame | null>(null)
  const prevKeyRef = useRef<string>('')

  const canceled = state?.alert === 'canceled'
  const safeIndex = frames.length > 0 ? index % frames.length : 0
  const frame = frames[safeIndex] ?? null

  // ローテーションタイマー（中止中は停止）
  useEffect(() => {
    if (!frame || canceled || frames.length <= 1) return
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % frames.length),
      frame.slide.duration * 1000,
    )
    return () => clearTimeout(timer)
  }, [frame, frames.length, canceled])

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
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">
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
          </div>

          {/* 下部: 進捗バー */}
          {!canceled && (
            <div className="absolute inset-x-0 bottom-0 z-30 h-2 bg-slate-900/40">
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

      {state.alert === 'caution' && <CautionBanner />}
      {canceled && <CancelOverlay />}
      {isDebugMode() && <DebugOverlay />}
    </div>
  )
}
