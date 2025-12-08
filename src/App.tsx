import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { SageModeProvider } from './contexts/SageModeContext'
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
import QR from './pages/QR'
import ResetNewsletter from './pages/ResetNewsletter'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'
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
import DesignSystem from './pages/DesignSystem'
import DesignSystemPreview from './pages/DesignSystemPreview'
import SageMode from './pages/SageMode'
import SageModeReports from './pages/SageModeReports'
import AffiliateDashboard from './pages/AffiliateDashboard'
import KingMidasLeaderboard from './pages/KingMidasLeaderboard'
import AdminAffiliates from './pages/AdminAffiliates'

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <SageModeProvider>
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
        <Route path="/qr" element={<Layout />}>
          <Route index element={<QR />} />
        </Route>
        <Route path="/payment/success" element={<Layout />}>
          <Route index element={<PaymentSuccess />} />
        </Route>
        <Route path="/payment/cancel" element={<Layout />}>
          <Route index element={<PaymentCancel />} />
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
          <Route path="tiktok-downloader" element={<TikTokDownloader />} />
        </Route>
        <Route path="/:username/bookclubprofile" element={<Layout />}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/settings" element={<Layout />}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/affiliate/dashboard" element={<Layout />}>
          <Route index element={<AffiliateDashboard />} />
        </Route>
        <Route path="/admin" element={<Layout />}>
          <Route index element={
            <ErrorBoundary>
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="affiliates" element={
            <ErrorBoundary>
              <ProtectedRoute requireAdmin={true}>
                <AdminAffiliates />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
        </Route>
        <Route path="/sql" element={<Layout />}>
          <Route index element={<SQL />} />
        </Route>
        <Route path="/designsystem" element={<Layout />}>
          <Route index element={<DesignSystem />} />
          <Route path="preview" element={<DesignSystemPreview />} />
        </Route>
        <Route path="/sagemode" element={<Layout />}>
          <Route index element={<ProtectedRoute requireAdmin={true}><SageMode /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute requireAdmin={true}><SageModeReports /></ProtectedRoute>} />
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
        <Route path="/king-midas-leaderboard" element={<Layout />}>
          <Route index element={<KingMidasLeaderboard />} />
        </Route>
        <Route path="/reset-newsletter" element={<ResetNewsletter />} />
        <Route path="*" element={<NotFound />} />
          </Routes>
          <Analytics />
        </ErrorBoundary>
        </SageModeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

