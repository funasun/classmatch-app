import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types'
import { backend } from './sync'
import { recordChanges } from './changes'

/** 表示画面用：購読のみ。点数の変化を記録して「更新」マークに使う */
export function useSyncedState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null)
  const prevRef = useRef<AppState | null>(null)
  useEffect(
    () =>
      backend.subscribe((incoming) => {
        recordChanges(prevRef.current, incoming)
        prevRef.current = incoming
        setState(incoming)
      }),
    [],
  )
  return state
}

/** 管理画面用：購読＋自動保存つき更新。
 *  他端末の更新は常に受け入れる（後勝ち）。自分の保存が古い折り返しで
 *  巻き戻る問題は backend 側で origin+seq により抑止している。 */
export function useEditableState() {
  const [state, setState] = useState<AppState | null>(null)
  const [saveError, setSaveError] = useState(false)
  /** 連続入力を1回の保存にまとめるためのバッファ。
   *  1文字ごとに毎回サーバ保存すると、Firestore の無料枠（書き込み回数と
   *  全閲覧端末の読み取り回数）をあっという間に使い切ってしまう。
   *  0.8秒窓でまとめ、窓の間の編集は最後の状態だけを保存する */
  const pendingRef = useRef<AppState | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => backend.subscribe((incoming) => setState(incoming)), [])

  const update = useCallback((mutate: (draft: AppState) => void) => {
    setState((prev) => {
      if (!prev) return prev
      const next: AppState = JSON.parse(JSON.stringify(prev))
      mutate(next)
      next.version = prev.version + 1
      next.updatedAt = new Date().toISOString()
      pendingRef.current = next
      if (timerRef.current === null) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null
          const toSave = pendingRef.current
          pendingRef.current = null
          if (toSave) backend.save(toSave).then((ok) => setSaveError(!ok))
        }, 800)
      }
      return next
    })
  }, [])

  return { state, update, saveError, mode: backend.mode }
}
