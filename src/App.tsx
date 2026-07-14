import { HashRouter, Route, Routes } from 'react-router-dom'
import { DisplayPage } from './display/DisplayPage'
import { AdminPage } from './admin/AdminPage'
import { MobileView } from './mobile/MobileView'
import { useIsMobile } from './lib/useIsMobile'

/** 同じ「/」でも、スマホ幅なら観戦者向けの縦積みレイアウトに自動で切り替える */
function DisplayRoute() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileView /> : <DisplayPage />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DisplayRoute />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  )
}
