import { useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { DisplayPage } from './display/DisplayPage'
import { AdminPage } from './admin/AdminPage'
import { MobileView } from './mobile/MobileView'
import { BroadcastPage } from './broadcast/BroadcastPage'
import { useIsMobile } from './lib/useIsMobile'

type ViewMode = 'portrait' | 'landscape'
const VIEW_MODE_KEY = 'cm-mobile-view-mode'

/** 同じ「/」でも、スマホ幅なら観戦者向けの縦積みレイアウトに自動で切り替える。
 *  スマホでは縦版（観戦者向け）と横版（電子黒板と同じ）を手動で切り替えられる */
function DisplayRoute() {
  const isMobile = useIsMobile()
  const [mode, setMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'portrait',
  )

  // PC・大型ディスプレイは常に横版（電子黒板）のまま
  if (!isMobile) return <DisplayPage />

  const toggle = () => {
    const next: ViewMode = mode === 'portrait' ? 'landscape' : 'portrait'
    localStorage.setItem(VIEW_MODE_KEY, next)
    setMode(next)
  }

  return (
    <>
      {mode === 'portrait' ? <MobileView /> : <DisplayPage />}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5 rounded-full bg-slate-900/85 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur active:bg-slate-700"
      >
        {mode === 'portrait' ? '🖥 横版（電子黒板）' : '📱 縦版にもどす'}
      </button>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DisplayRoute />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/broadcast" element={<BroadcastPage />} />
      </Routes>
    </HashRouter>
  )
}
