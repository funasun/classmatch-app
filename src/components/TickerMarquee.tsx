import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** 途切れずに流れるテロップ。テキストの末尾から2文字ぶん空けて次のテキストが続く。
 *  画面幅を埋めるだけコピーを並べ、1ユニット（テキスト＋2文字）ぶんだけ動かして
 *  ループさせることで、空白時間なくシームレスに繰り返す。
 *  - unitSeconds: 1ユニットを流し切る秒数（＝速さ）
 *  - iteration:   流す回数（有限）か 'infinite'
 *  - onEnd:       有限回で流し終えたときに呼ばれる */
export function TickerMarquee({
  text,
  unitSeconds,
  iteration,
  onEnd,
  textStyle,
  textClassName,
}: {
  text: string
  unitSeconds: number
  iteration: number | 'infinite'
  onEnd?: () => void
  textStyle: CSSProperties
  textClassName: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [unitW, setUnitW] = useState(0)
  const [copies, setCopies] = useState(2)

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return
    const update = () => {
      const uw = measure.offsetWidth
      const cw = container.clientWidth
      if (!uw) return
      setUnitW(uw)
      // 画面を埋めるだけ並べ、さらに1ユニット余分に（切れ目を隠すため）
      setCopies(Math.max(2, Math.ceil(cw / uw) + 1))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    ro.observe(measure)
    return () => ro.disconnect()
  }, [text, textClassName])

  const animation = unitW
    ? `ticker-scroll ${unitSeconds}s linear ${iteration}`
    : undefined

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      {/* 幅計測用（見えない）。paddingRight:2ch が「末尾から2文字ぶんの空き」 */}
      <span
        ref={measureRef}
        aria-hidden
        className={`invisible absolute whitespace-nowrap ${textClassName}`}
        style={{ ...textStyle, paddingRight: '2ch' }}
      >
        {text}
      </span>
      <div
        className="flex w-max whitespace-nowrap will-change-transform"
        style={{ ['--dist' as string]: `-${unitW}px`, animation } as CSSProperties}
        onAnimationEnd={onEnd}
      >
        {Array.from({ length: copies }).map((_, i) => (
          <span
            key={i}
            aria-hidden={i > 0}
            className={textClassName}
            style={{ ...textStyle, paddingRight: '2ch' }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}
