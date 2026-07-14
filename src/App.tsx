import { HashRouter, Route, Routes } from 'react-router-dom'
import { DisplayPage } from './display/DisplayPage'
import { AdminPage } from './admin/AdminPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DisplayPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </HashRouter>
  )
}
