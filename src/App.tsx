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
  // Debug logging
  console.log('🚀 App component rendering...');
  
  // Video preloader temporarily disabled for debugging
  // const [showPreloader, setShowPreloader] = useState(true)
  // const handlePreloaderComplete = () => {
  //   setShowPreloader(false)
  // }
  // if (showPreloader) {
  //   return <VideoPreloader onComplete={handlePreloaderComplete} />
  // }

  try {
    return (
      <ErrorBoundary>
        <div style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '20px' }}>
          <h1 style={{ color: '#ffffff' }}>THE LOST+UNFOUNDS</h1>
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
        </div>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('❌ App component error:', error);
    return (
      <div style={{ color: 'red', padding: '20px', background: 'white' }}>
        <h1>App Error</h1>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
}

export default App

