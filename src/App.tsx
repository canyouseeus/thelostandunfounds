import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Layout from './components/Layout'
import Home from './pages/Home'
import ToolsDashboard from './pages/ToolsDashboard'
import TikTokDownloader from './pages/TikTokDownloader'
import AuthCallback from './pages/AuthCallback'
import SEODashboard from './pages/SEODashboard'

function App() {
  // Video preloader temporarily disabled for debugging
  // const [showPreloader, setShowPreloader] = useState(true)
  // const handlePreloaderComplete = () => {
  //   setShowPreloader(false)
  // }
  // if (showPreloader) {
  //   return <VideoPreloader onComplete={handlePreloaderComplete} />
  // }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/tools" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
          <Route path="tiktok-downloader" element={<TikTokDownloader />} />
        </Route>
        <Route path="/seo" element={<SEODashboard />} />
      </Routes>
      <Analytics />
    </>
  )
}

export default App

