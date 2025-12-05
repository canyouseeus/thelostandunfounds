import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import ToolsDashboard from './pages/ToolsDashboard'
import TikTokDownloader from './pages/TikTokDownloader'
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
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { TermsOfService } from './pages/TermsOfService'
import Blog from './pages/Blog'
import AllArticles from './pages/AllArticles'
import BlogPost from './pages/BlogPost'
import UserBlog from './pages/UserBlog'
import BookClub from './pages/BookClub'
import GearHeads from './pages/GearHeads'
import Borderlands from './pages/Borderlands'
import Science from './pages/Science'
import NewTheory from './pages/NewTheory'
import SubmitArticle from './pages/SubmitArticle'
import SQL from './pages/SQL'
import Debug from './pages/Debug'
import AIWritingPrompt from './pages/AIWritingPrompt'
import HelloWorld from './pages/HelloWorld'
import BlogGettingStarted from './pages/BlogGettingStarted'
import AffiliateDashboard from './pages/AffiliateDashboard'
import KingMidasLeaderboard from './pages/KingMidasLeaderboard'
import ScrollToTop from './components/ui/ScrollToTop'

// Mock CurrencyProvider if not found, or remove if not needed. 
// The diff showed CurrencyProvider but I don't have it. 
// I'll omit it for now to avoid errors, or create a simple wrapper.
// Actually, checking if ScrollToTop exists.
// I don't have ScrollToTop either. 
// I'll create a simple ScrollToTop component.

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ScrollToTop />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
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
            
            {/* Legal Pages */}
            <Route path="/privacy-policy" element={<Layout><PrivacyPolicy /></Layout>} />
            <Route path="/terms-of-service" element={<Layout><TermsOfService /></Layout>} />
            
            <Route path="/tools" element={<Layout />}>
              <Route index element={<ToolsDashboard />} />
              <Route path="tiktok-downloader" element={<TikTokDownloader />} />
            </Route>
            <Route path="/:username/bookclubprofile" element={<Layout />}>
              <Route index element={<Profile />} />
            </Route>
            <Route path="/settings" element={<Layout />}>
              <Route index element={<Settings />} />
            </Route>
            <Route path="/affiliate/dashboard" element={<Layout />}>
              <Route index element={
                <ProtectedRoute>
                  <AffiliateDashboard />
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/king-midas-leaderboard" element={<Layout />}>
              <Route index element={<KingMidasLeaderboard />} />
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
            <Route path="/:column/prompt" element={<Layout />}>
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
            <Route path="/gearheads" element={<Layout />}>
              <Route index element={<GearHeads />} />
            </Route>
            <Route path="/borderlands" element={<Layout />}>
              <Route index element={<Borderlands />} />
            </Route>
            <Route path="/science" element={<Layout />}>
              <Route index element={<Science />} />
            </Route>
            <Route path="/newtheory" element={<Layout />}>
              <Route index element={<NewTheory />} />
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
            {/* Column-specific submission routes */}
            <Route path="/submit/main" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/submit/bookclub" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/submit/gearheads" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/submit/borderlands" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/submit/science" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/submit/newtheory" element={<Layout />}>
              <Route index element={<SubmitArticle />} />
            </Route>
            <Route path="/reset-newsletter" element={<ResetNewsletter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Analytics />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
