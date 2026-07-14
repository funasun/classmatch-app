import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** 子要素を実寸で描画したあと、親に収まるよう transform: scale で
 *  自動縮小（少しなら拡大も）する。エルモの解像度・画面比の差を吸収する */
export function FitScale({
  children,
  maxScale = 1.6,
  className = '',
}: {
  children: ReactNode
  maxScale?: number
  className?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const update = () => {
      const ow = outer.clientWidth
      const oh = outer.clientHeight
      const iw = inner.scrollWidth
      const ih = inner.scrollHeight
      if (iw === 0 || ih === 0) return
      setScale(Math.min(ow / iw, oh / ih, maxScale))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [maxScale])

  return (
    <div
      ref={outerRef}
      className={`h-full w-full flex items-center justify-center overflow-hidden ${className}`}
    >
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        {children}
      </div>
    </div>
  )
}
