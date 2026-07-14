import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** 子要素を実寸で描いたあと、横幅に収まるよう transform:scale で縮小する。
 *  縦は成り行きで伸ばす（FitScale と違い高さでは縮めない）＝縦積みに向く */
export function FitWidth({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const update = () => {
      const ow = outer.clientWidth
      const iw = inner.scrollWidth
      const ih = inner.scrollHeight
      if (!iw || !ih) return
      const s = Math.min(ow / iw, 1)
      setScale(s)
      setHeight(ih * s)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={outerRef} style={{ height }} className="w-full overflow-hidden">
      <div
        ref={innerRef}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  )
}
