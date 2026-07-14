import type { TableSlide } from '../../types'
import { pageSlice } from '../frames'
import { FitScale } from '../../components/FitScale'

export function TableView({
  slide,
  page,
  pages,
}: {
  slide: TableSlide
  page: number
  pages: number
}) {
  const rows = pageSlice(slide.rows, page, pages)
  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="bg-[#1e50a2] px-8 py-3 text-center text-[40px] font-extrabold tracking-widest text-white">
        {slide.title}
      </div>
      <div className="min-h-0 flex-1 p-6">
        <FitScale>
          <table className="border-collapse text-[30px] leading-tight">
            <thead>
              <tr>
                {slide.header.map((h, i) => (
                  <th
                    key={i}
                    className="border-2 border-slate-900 bg-slate-700 px-6 py-2 font-extrabold text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? 'bg-slate-100' : 'bg-white'}>
                  {r.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-2 border-slate-900 px-6 py-1.5 text-center font-bold"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </FitScale>
      </div>
    </div>
  )
}
