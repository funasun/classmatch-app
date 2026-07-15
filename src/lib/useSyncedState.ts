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

  useEffect(() => backend.subscribe((incoming) => setState(incoming)), [])

  const update = useCallback((mutate: (draft: AppState) => void) => {
    setState((prev) => {
      if (!prev) return prev
      const next: AppState = JSON.parse(JSON.stringify(prev))
      mutate(next)
      next.version = prev.version + 1
      next.updatedAt = new Date().toISOString()
      backend.save(next).then((ok) => setSaveError(!ok))
      return next
    })
  }, [])

  return { state, update, saveError, mode: backend.mode }
}
