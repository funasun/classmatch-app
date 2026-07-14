import type { NoticeSlide } from '../../types'

export function NoticeView({ slide }: { slide: NoticeSlide }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 bg-amber-50 px-16">
      <div className="rounded-2xl bg-amber-400 px-12 py-4 text-[56px] font-extrabold text-slate-900">
        {slide.heading || 'お知らせ'}
      </div>
      <div className="whitespace-pre-wrap text-center text-[44px] font-bold leading-relaxed text-slate-800">
        {slide.body}
      </div>
    </div>
  )
}
