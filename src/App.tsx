import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import ToolsDashboard from './pages/ToolsDashboard'
import AuthCallback from './pages/AuthCallback'
import ZohoCallback from './pages/ZohoCallback'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import Docs from './pages/Docs'
import About from './pages/About'
import Contact from './pages/Contact'
import Pricing from './pages/Pricing'
import Support from './pages/Support'
import Shop from './pages/Shop'
import ResetNewsletter from './pages/ResetNewsletter'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Blog from './pages/Blog'
import AllArticles from './pages/AllArticles'
import BlogPost from './pages/BlogPost'
import UserBlog from './pages/UserBlog'
import BookClub from './pages/BookClub'
import SubmitArticle from './pages/SubmitArticle'
import SQL from './pages/SQL'
import Debug from './pages/Debug'
import AIWritingPrompt from './pages/AIWritingPrompt'
import HelloWorld from './pages/HelloWorld'
import BlogGettingStarted from './pages/BlogGettingStarted'

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
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/zoho/callback" element={<ZohoCallback />} />
        <Route path="/about" element={<Layout />}>
          <Route index element={<About />} />
        </Route>
        <Route path="/contact" element={<Layout />}>
          <Route index element={<Contact />} />
        </Route>
        <Route path="/pricing" element={<Layout />}>
          <Route index element={<Pricing />} />
        </Route>
        <Route path="/support" element={<Layout />}>
          <Route index element={<Support />} />
        </Route>
        <Route path="/shop" element={<Layout />}>
          <Route index element={<Shop />} />
        </Route>
        <Route path="/docs" element={<Layout />}>
          <Route index element={<Docs />} />
        </Route>
        <Route path="/privacy" element={<Layout />}>
          <Route index element={<Privacy />} />
        </Route>
        <Route path="/terms" element={<Layout />}>
          <Route index element={<Terms />} />
        </Route>
        <Route path="/tools" element={<Layout />}>
          <Route index element={<ToolsDashboard />} />
        </Route>
        <Route path="/:username/bookclubprofile" element={<Layout />}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/settings" element={<Layout />}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/admin" element={<Layout />}>
          <Route index element={
            <ErrorBoundary>
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
        </Route>
        <Route path="/sql" element={<Layout />}>
          <Route index element={<SQL />} />
        </Route>
        <Route path="/bookclub/prompt" element={<Layout />}>
          <Route index element={<AIWritingPrompt />} />
        </Route>
        <Route path="/helloworld" element={<Layout />}>
          <Route index element={<HelloWorld />} />
        </Route>
        <Route path="/debug" element={<Layout />}>
          <Route index element={<Debug />} />
        </Route>
        <Route path="/thelostarchives" element={<Layout />}>
          <Route index element={<Blog />} />
          <Route path="all" element={<AllArticles />} />
          <Route path=":slug" element={<BlogPost />} />
        </Route>
        <Route path="/book-club" element={<Layout />}>
          <Route index element={<BookClub />} />
        </Route>
        <Route path="/blog/getting-started" element={<Layout />}>
          <Route index element={<BlogGettingStarted />} />
        </Route>
        {/* User blog routes - subdomain routing handled in component */}
        <Route path="/blog/:subdomain" element={<Layout />}>
          <Route index element={<UserBlog />} />
        </Route>
        <Route path="/blog/:subdomain/:slug" element={<Layout />}>
          <Route index element={<BlogPost />} />
        </Route>
        <Route path="/submit-article" element={<Layout />}>
          <Route index element={<SubmitArticle />} />
        </Route>
        <Route path="/reset-newsletter" element={<ResetNewsletter />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </ErrorBoundary>
  )
}

export default App

