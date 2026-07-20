import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { SageModeProvider } from './contexts/SageModeContext'
import { GalleryProvider } from './contexts/GalleryContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RootPage from './pages/RootPage'
import AdminAuthGate from './components/AdminAuthGate'
import ToolsDashboard from './pages/ToolsDashboard'
import TikTokDownloader from './pages/TikTokDownloader'
import AuthCallback from './pages/AuthCallback'
import ZohoCallback from './pages/ZohoCallback'
import Affiliate from './pages/Affiliate'
import Settings from './pages/Settings'
import PhotographerDashboard from './pages/PhotographerDashboard'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import Docs from './pages/Docs'
import About from './pages/About'
import Contact from './pages/Contact'
import Support from './pages/Support'
import Shop from './pages/Shop'
import ShopSuccess from './pages/ShopSuccess'
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
import Debug from './pages/Debug'
import AIWritingPrompt from './pages/AIWritingPrompt'
import HelloWorld from './pages/HelloWorld'
import BlogGettingStarted from './pages/BlogGettingStarted'
import DesignSystem from './pages/DesignSystem'
import DesignSystemPreview from './pages/DesignSystemPreview'
import SageMode from './pages/SageMode'
import SageModeReports from './pages/SageModeReports'
import BecomeAffiliate from './pages/BecomeAffiliate'
import KingMidasLeaderboard from './pages/KingMidasLeaderboard'
import AdminAffiliates from './pages/AdminAffiliates'
import Unsubscribe from './pages/Unsubscribe'
import PhotoLibraryPage from './pages/PhotoLibraryPage'
import PhotoSuccessPage from './pages/PhotoSuccessPage'
import Gallery from './pages/Gallery'
import DownloadPortal from './pages/DownloadPortal'
import OnboardingWizard from './pages/setup/OnboardingWizard'
import PhotographerGuide from './pages/docs/PhotographerGuide'
import Events from './pages/Events'
import SubmitEvent from './pages/SubmitEvent'
import Advertise from './pages/Advertise'
import Capabilities from './pages/Capabilities'
import Leads from './pages/Leads'
import PreviewVisitorPage from './pages/PreviewVisitorPage'
import PreviewAdminLoginPage from './pages/PreviewAdminLoginPage'
import { lazy, Suspense } from 'react'
const PreviewAffiliate = lazy(() => import('./pages/PreviewAffiliate'))
// BookingPage is rendered inline on the homepage (see src/pages/Gallery.tsx)
// rather than as a standalone route — see the comment near the removed
// /booking route below.
import Marty from './pages/Marty'
import Kattitude from './pages/Kattitude'
import KattitudeWaiver from './pages/KattitudeWaiver'
import AdminKattitude from './pages/AdminKattitude'
import AdminKattitudeArtist from './pages/AdminKattitudeArtist'
import MusicPlayer from './components/admin/MusicPlayer'
import SilvaStarLanding from './templates/silva-star/SilvaStarLanding'
import SilvaStarDashboard from './templates/silva-star/SilvaStarDashboard'
import SilvaStarProposal from './templates/silva-star/SilvaStarProposal'
import KattitudeLanding from './templates/kattitude/KattitudeLanding'
import KattitudeDashboard from './templates/kattitude/KattitudeDashboard'
import FadeboxLanding from './templates/fadebox/FadeboxLanding'
import FadeboxProposal from './templates/fadebox/FadeboxProposal'
import FadeboxDashboard from './templates/fadebox/FadeboxDashboard'




function AdminLayout() {
  return (
    <Layout>
      <Outlet />
      <MusicPlayer />
    </Layout>
  )
}

function AffiliateDashboardRedirect() {
  // Preserve any existing search params and force-open the affiliate section
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  if (!params.get('section')) params.set('section', 'affiliate')
  return <Navigate to={`/dashboard?${params.toString()}`} replace />
}

function AdminInvoicesRedirect() {
  // /admin/invoices used to be its own route; invoices now live in the
  // Admin console like every other section. Preserve any existing search
  // params (e.g. booking_id, new) and force-open the invoices panel.
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  params.set('section', 'invoices')
  return <Navigate to={`/admin?${params.toString()}`} replace />
}

/** Dev-only: expose React Router's navigate globally so preview_eval can route without a full reload. */
function NavigationExposer() {
  const navigate = useNavigate()
  if (import.meta.env.DEV) {
    ;(window as any).__navigate = navigate
  }
  return null
}

function App() {
  return (
    <BrowserRouter>
      <NavigationExposer />
      <AuthProvider>
        <GalleryProvider>
        <SageModeProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<RootPage />} />
              </Route>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/zoho/callback" element={<ZohoCallback />} />
              <Route path="/about" element={<Layout />}>
                <Route index element={<About />} />
              </Route>
              <Route path="/contact" element={<Layout />}>
                <Route index element={<Contact />} />
              </Route>
              <Route path="/support" element={<Layout />}>
                <Route index element={<Support />} />
              </Route>
              <Route path="/events" element={<Layout />}>
                <Route index element={<Events />} />
              </Route>
              <Route path="/submit-event" element={<Layout />}>
                <Route index element={<SubmitEvent />} />
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
                <Route index element={<ProtectedRoute requireAdmin={true}><Shop /></ProtectedRoute>} />
                <Route path="success" element={<ShopSuccess />} />
              </Route>
              <Route path="/docs" element={<Layout />}>
                <Route index element={<Docs />} />
                <Route path="photographer-guide" element={<PhotographerGuide />} />
              </Route>
              <Route path="/privacy" element={<Layout />}>
                <Route index element={<Privacy />} />
              </Route>
              <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
              <Route path="/terms" element={<Layout />}>
                <Route index element={<Terms />} />
              </Route>
              <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
              <Route path="/tools" element={<Layout />}>
                <Route index element={<ToolsDashboard />} />
                <Route path="tiktok-downloader" element={<TikTokDownloader />} />
              </Route>
              <Route path="/:username/profile" element={<Layout />}>
                <Route index element={<Affiliate />} />
              </Route>
              <Route path="/:username/bookclubprofile" element={
                <Layout>
                  <Affiliate />
                </Layout>
              } />
              <Route path="/settings" element={<Layout />}>
                <Route index element={<Settings />} />
              </Route>
              <Route path="/dashboard" element={
                <Layout>
                  <Affiliate />
                </Layout>
              } />
              <Route path="/affiliate/dashboard" element={<AffiliateDashboardRedirect />} />
              <Route path="/affiliate-dashboard" element={<AffiliateDashboardRedirect />} />
              <Route path="/become-affiliate" element={<Layout />}>
                <Route index element={<BecomeAffiliate />} />
              </Route>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={
                  <ErrorBoundary>
                    <AdminAuthGate>
                      <Admin />
                    </AdminAuthGate>
                  </ErrorBoundary>
                } />
                <Route path="affiliates" element={
                  <ErrorBoundary>
                    <AdminAuthGate>
                      <AdminAffiliates />
                    </AdminAuthGate>
                  </ErrorBoundary>
                } />
                <Route path="kattitude" element={
                  <ErrorBoundary>
                    <AdminAuthGate>
                      <AdminKattitude />
                    </AdminAuthGate>
                  </ErrorBoundary>
                } />
                <Route path="kattitude/artist/:artistId" element={
                  <ErrorBoundary>
                    <AdminAuthGate>
                      <AdminKattitudeArtist />
                    </AdminAuthGate>
                  </ErrorBoundary>
                } />
                <Route path="invoices" element={<AdminInvoicesRedirect />} />
              </Route>
              {/* Silva Star white-label template */}
              <Route path="/silva-star" element={<SilvaStarLanding />} />
              <Route path="/silva-star/dashboard" element={<SilvaStarDashboard />} />
              <Route path="/silva-star/proposal" element={<SilvaStarProposal />} />

              {/* Kattitude Tattoo Studio — proposal preview (public, no auth) */}
              <Route path="/kattitude-preview" element={<KattitudeLanding />} />
              <Route path="/kattitude-preview/dashboard" element={<KattitudeDashboard />} />

              {/* Fadebox Barbershop — redesign proposal preview (public, no auth) */}
              <Route path="/fadebox-preview" element={<FadeboxLanding />} />
              <Route path="/fadebox-preview/proposal" element={<FadeboxProposal />} />
              <Route path="/fadebox-preview/dashboard" element={<FadeboxDashboard />} />

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
              <Route path="/unsubscribe" element={<Layout />}>
                <Route index element={<Unsubscribe />} />
              </Route>
              <Route path="/book-club" element={<Layout />}>
                <Route index element={<AdminAuthGate><BookClub /></AdminAuthGate>} />
              </Route>
              <Route path="/gearheads" element={<Layout />}>
                <Route index element={<AdminAuthGate><GearHeads /></AdminAuthGate>} />
              </Route>
              <Route path="/borderlands" element={<Layout />}>
                <Route index element={<AdminAuthGate><Borderlands /></AdminAuthGate>} />
              </Route>
              <Route path="/science" element={<Layout />}>
                <Route index element={<AdminAuthGate><Science /></AdminAuthGate>} />
              </Route>
              <Route path="/newtheory" element={<Layout />}>
                <Route index element={<AdminAuthGate><NewTheory /></AdminAuthGate>} />
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
              <Route path="/gallery" element={<Layout />}>
                <Route index element={<Gallery />} />
              </Route>
              <Route path="/gallery/:slug" element={<Layout />}>
                <Route index element={<Gallery />} />
              </Route>
              <Route path="/download" element={<Layout />}>
                <Route index element={<DownloadPortal />} />
              </Route>
              <Route path="/setup" element={<OnboardingWizard />} />
              <Route path="/photos/success" element={<Layout />}>
                <Route index element={<PhotoSuccessPage />} />
              </Route>
              <Route path="/photos/:slug" element={<Layout />}>
                <Route index element={<PhotoLibraryPage />} />
              </Route>
              <Route path="/advertise" element={<Layout />}>
                <Route index element={<Advertise />} />
              </Route>
              <Route path="/capabilities" element={<Layout />}>
                <Route index element={<Capabilities />} />
              </Route>
              <Route path="/leads" element={<Layout />}>
                <Route index element={<AdminAuthGate><Leads /></AdminAuthGate>} />
              </Route>
              <Route path="/reset-newsletter" element={<ResetNewsletter />} />

              {/* /booking is intentionally NOT a standalone route. Booking
                  lives as a tab on the homepage (Gallery viewMode='booking').
                  The "BOOK ME" nav link uses /?view=booking to land users on
                  the homepage with the booking panel pre-selected. Keeping a
                  /booking route here would just serve a duplicate of the
                  homepage shell to crawlers — the issue Ahrefs flagged. */}

              <Route path="/marty" element={<Marty />} />

              {/* Temporary preview routes — remove after gallery-homepage branch ships */}
              <Route path="/preview/visitor" element={<PreviewVisitorPage />} />
              <Route path="/preview/admin-login" element={<PreviewAdminLoginPage />} />
              <Route path="/preview/affiliate" element={<Suspense fallback={null}><PreviewAffiliate /></Suspense>} />

              {/* Kattitude Tattoo Studio */}
              <Route path="/kattitude" element={<Layout />}>
                <Route index element={<Kattitude />} />
              </Route>
              <Route path="/kattitude/waiver" element={<KattitudeWaiver />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            <Analytics />
          </ErrorBoundary>
        </SageModeProvider>
        </GalleryProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

