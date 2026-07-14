import { useRef } from 'react'

/** Excel風のグリッドエディタ。
 *  セルをクリックしてその場で編集、Excelからのコピペ流し込み（タブ区切り）対応 */
export function EditableGrid({
  columnLabels,
  data,
  onChange,
  allowColumnOps = false,
  highlightRow,
}: {
  columnLabels: string[]
  data: string[][]
  onChange: (next: string[][]) => void
  allowColumnOps?: boolean
  highlightRow?: number
}) {
  const tableRef = useRef<HTMLTableElement>(null)
  const cols = columnLabels.length

  const setCell = (r: number, c: number, value: string) => {
    const next = data.map((row) => [...row])
    next[r][c] = value
    onChange(next)
  }

  const handlePaste = (r: number, c: number, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()
    const pasted = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, i, arr) => !(i === arr.length - 1 && line === ''))
      .map((line) => line.split('\t'))
    const next = data.map((row) => [...row])
    for (let i = 0; i < pasted.length; i++) {
      const rr = r + i
      while (next.length <= rr) next.push(Array(cols).fill(''))
      for (let j = 0; j < pasted[i].length; j++) {
        const cc = c + j
        if (cc < cols) next[rr][cc] = pasted[i][j]
      }
    }
    onChange(next)
  }

  const addRow = (at?: number) => {
    const next = data.map((row) => [...row])
    next.splice(at ?? next.length, 0, Array(cols).fill(''))
    onChange(next)
  }

  const removeRow = (at: number) => {
    onChange(data.filter((_, i) => i !== at))
  }

  return (
    <div>
      <table ref={tableRef} className="border-collapse">
        <thead>
          <tr>
            <th className="w-8" />
            {columnLabels.map((label, i) => (
              <th
                key={i}
                className="border border-slate-300 bg-slate-100 px-2 py-1 text-sm font-bold text-slate-600"
              >
                {label}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {data.map((row, r) => (
            <tr key={r} className={r === highlightRow ? 'bg-yellow-100' : ''}>
              <td className="pr-1 text-right text-xs text-slate-400">{r + 1}</td>
              {row.slice(0, cols).map((cell, c) => (
                <td key={c} className="border border-slate-300 p-0">
                  <input
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    onPaste={(e) => handlePaste(r, c, e)}
                    className="w-24 bg-transparent px-2 py-1 text-center font-semibold outline-none focus:bg-sky-50 focus:ring-2 focus:ring-sky-400"
                  />
                </td>
              ))}
              <td className="pl-1">
                <button
                  onClick={() => removeRow(r)}
                  title="この行を削除"
                  className="rounded px-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => addRow()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          ＋ 行を追加
        </button>
        {allowColumnOps && (
          <span className="self-center text-xs text-slate-400">
            列の追加・削除は右上の「列の設定」から
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Excelからコピーして、貼り付けたい先頭セルで ⌘V / Ctrl+V で流し込めます
      </p>
    </div>
  )
}
