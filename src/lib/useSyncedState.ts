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
 *  自分の保存が折り返しのポーリングで巻き戻らないよう version で比較する */
export function useEditableState() {
  const [state, setState] = useState<AppState | null>(null)
  const [saveError, setSaveError] = useState(false)
  const localVersion = useRef(0)

  useEffect(
    () =>
      backend.subscribe((incoming) => {
        if (incoming.version >= localVersion.current) {
          localVersion.current = incoming.version
          setState(incoming)
        }
      }),
    [],
  )

  const update = useCallback((mutate: (draft: AppState) => void) => {
    setState((prev) => {
      if (!prev) return prev
      const next: AppState = JSON.parse(JSON.stringify(prev))
      mutate(next)
      next.version = prev.version + 1
      next.updatedAt = new Date().toISOString()
      localVersion.current = next.version
      backend.save(next).then((ok) => setSaveError(!ok))
      return next
    })
  }, [])

  return { state, update, saveError, mode: backend.mode }
}
