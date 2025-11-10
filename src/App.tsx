import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Home from './pages/Home'
import ToolsDashboard from './pages/ToolsDashboard'
import TikTokDownloader from './pages/TikTokDownloader'
import AuthCallback from './pages/AuthCallback'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

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
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/tools" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
          <Route path="tiktok-downloader" element={<TikTokDownloader />} />
        </Route>
        <Route path="/profile" element={<Layout />}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/settings" element={<Layout />}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </ErrorBoundary>
  )
}

export default App

