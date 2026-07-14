import { useEffect, useState } from 'react'

/** スマホ幅（縦画面）かどうかを判定する。
 *  同じURLでも、狭い画面では観戦者向けの縦積みレイアウトに自動で切り替える */
export function useIsMobile(maxWidth = 820): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
