import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/Layout'
import Home from './pages/Home'
import ToolsDashboard from './pages/ToolsDashboard'
import TikTokDownloader from './pages/TikTokDownloader'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tools" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
        </Route>
        <Route path="/tools/tiktok-downloader" element={<TikTokDownloader />} />
      </Routes>
      <Analytics />
    </>
  )
}

export default App

