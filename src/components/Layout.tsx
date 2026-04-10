import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  HomeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSageMode } from '../contexts/SageModeContext'
import { isAdminEmail } from '../utils/admin'
import { initAffiliateTracking } from '../utils/affiliate-tracking'
import AuthModal from './auth/AuthModal'
import SageModeOverlay from './SageModeOverlay'
import { supabase } from '../lib/supabase'
import Footer from './Footer'
import NavLinks from './NavLinks'
import { LoadingOverlay } from './Loading'
import MarketplaceBanner from './events/MarketplaceBanner'

export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const isTikTokDownloader = location.pathname === '/tools/tiktok-downloader'
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null)
  const [headerHeight, setHeaderHeight] = useState(80)
  const fixedHeaderRef = useRef<HTMLDivElement>(null)

  // State from NavLinks component needs to be lifted if we want to sync between desktop/mobile,
  // but for simple navigation, independent state in NavLinks is fine (submenus reset on close).

  const [homeHeaderReady, setHomeHeaderReady] = useState(location.pathname !== '/')
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const previousPathRef = useRef(location.pathname)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, tier, signOut, loading, clearAuthStorage } = useAuth()
  // Derived synchronously from auth state — no extra DB round-trip needed for UI gating
  const userIsAdmin = !loading && !!user && isAdminEmail(user.email || '')
  // Show advertising banner above nav for visitors on the homepage
  const showAdBanner = location.pathname === '/' && !userIsAdmin && !loading
  const { state: sageModeState, toggleSageMode } = useSageMode()
  const navigate = useNavigate()

  // Load user subdomain for profile link
  useEffect(() => {
    // Initialize affiliate tracking from URL - captures ?ref= everywhere
    initAffiliateTracking();

    if (user) {
      const loadSubdomain = async () => {
        try {
          const { data } = await supabase
            .from('user_subdomains')
            .select('subdomain')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.subdomain) {
            setUserSubdomain(data.subdomain)
          }
        } catch {
          // Ignore errors
        }
      }
      loadSubdomain()
    }
  }, [user]);

  // Cleanup ref is removed as it's no longer used

  useEffect(() => {
    // Disable body scroll when mobile menu is open
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Route change loading animation (skip for homepage)
  useEffect(() => {
    const isNavigatingFromHome = previousPathRef.current === '/' && location.pathname !== '/'
    const isNavigatingToNonHome = previousPathRef.current !== location.pathname && location.pathname !== '/'

    if (isNavigatingFromHome || isNavigatingToNonHome) {
      setIsRouteLoading(true)
      const timer = setTimeout(() => {
        setIsRouteLoading(false)
      }, 1200) // Show loading for 1.2 seconds

      previousPathRef.current = location.pathname
      return () => clearTimeout(timer)
    }

    previousPathRef.current = location.pathname
  }, [location.pathname])


  useEffect(() => {
    // Non-root pages: always show header immediately
    if (location.pathname !== '/') {
      setHomeHeaderReady(true)
      return
    }

    // Root page, still loading auth: hide header until we know who the visitor is
    if (loading) {
      setHomeHeaderReady(false)
      return
    }

    // Root page, visitor (non-admin): show header immediately — no animation to wait for
    if (!userIsAdmin) {
      setHomeHeaderReady(true)
      return
    }

    // Root page, admin: wait for the brand intro animation to signal completion
    setHomeHeaderReady(false)
    const handleAnimationComplete = () => setHomeHeaderReady(true)
    window.addEventListener('home-animation-complete', handleAnimationComplete)
    return () => {
      window.removeEventListener('home-animation-complete', handleAnimationComplete)
    }
  }, [location.pathname, loading, userIsAdmin])

  // Track fixed header height so main content padding stays correct
  useEffect(() => {
    const el = fixedHeaderRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight))
    ro.observe(el)
    setHeaderHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [showAdBanner])

  // Click-outside handler is removed as the menu is now a full-screen portal

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Close menu and open modal
    setMenuOpen(false)
    setAuthModalOpen(true)
  }

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    // Force a hard reload to ensure all auth state is cleared
    window.location.href = '/'
  }

  // Mouse position tracking is removed as it's no longer used

  // Hover handlers are removed as we're moving to a full-screen menu

  // Full-Screen Menu Portal Component (Mobile & Desktop)
  const MenuPortal = () => {
    if (!menuOpen) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[99999] bg-black flex flex-col"
        style={{ touchAction: 'none' }}
      >
        {/* Header Row (for close button) */}
        <div className="flex items-center justify-between h-16 w-full px-4 shrink-0">
          <div className="flex items-center h-12">
            <span className="text-white text-sm font-bold">MENU</span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center h-12 w-12 text-white"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-4">
            <NavLinks
              user={user}
              userIsAdmin={userIsAdmin}
              userSubdomain={userSubdomain}
              sageModeState={sageModeState}
              toggleSageMode={toggleSageMode}
              handleSignOut={handleSignOut}
              onLinkClick={() => setMenuOpen(false)}
              onLoginClick={handleLoginClick}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Route transition loading overlay */}
      {isRouteLoading && <LoadingOverlay />}

      <SageModeOverlay />
      <div ref={fixedHeaderRef} className="fixed top-0 left-0 w-full bg-black z-[999]">
        {/* Advertising banner — sits above the nav for homepage visitors */}
        {showAdBanner && <MarketplaceBanner surface="gallery" noMargin />}

        <nav className="w-full backdrop-blur-md">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {/* Top row */}
            <div
              className="relative flex items-center h-16 gap-4 flex-nowrap"
              style={{
                opacity: homeHeaderReady ? 1 : 0,
                pointerEvents: homeHeaderReady ? 'auto' : 'none',
                transition: 'opacity 0.6s ease-in-out',
              }}
            >
              {/* Logo — centered for visitors, left-aligned for admins */}
              <Link
                to="/"
                className={`flex items-center hover:opacity-70 transition-opacity h-12 ${
                  userIsAdmin ? 'flex-shrink-0' : 'absolute left-1/2 -translate-x-1/2'
                }`}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <img
                  src="/logo.png"
                  alt="THE LOST+UNFOUNDS"
                  style={{ height: '28px', width: 'auto', display: 'block' }}
                />
              </Link>
              {userIsAdmin && (
                <div className="flex items-center space-x-4 ml-auto flex-shrink-0 leading-none h-12">
                  <div className="header-nav" ref={menuRef}>
                    <button
                      type="button"
                      className="menu-toggle flex items-center justify-center h-12 w-12 leading-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                      }}
                      aria-label="Toggle menu"
                      aria-expanded={menuOpen}
                    >
                      <Bars3Icon className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Render Menu Portal */}
      <MenuPortal />

      <main className="pb-6 flex-1" style={{ paddingTop: headerHeight }}>
        {children || <Outlet />}
      </main>
      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black/50 border border-white/10 rounded-none p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Upgrade Your Account</h2>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="text-white/60 hover:text-white transition"
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-black/50 border border-white/10 rounded-none p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Premium Tier</h3>
                <p className="text-white/70 text-sm mb-3">Unlimited access to all tools</p>
                <div className="text-2xl font-bold text-white mb-4">$9.99<span className="text-sm text-white/60">/month</span></div>
                <button
                  onClick={() => {
                    window.open('https://paypal.com', '_blank');
                    setUpgradeModalOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
                >
                  Upgrade to Premium
                </button>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-none p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Pro Tier</h3>
                <p className="text-white/70 text-sm mb-3">Everything + API access</p>
                <div className="text-2xl font-bold text-white mb-4">$19.99<span className="text-sm text-white/60">/month</span></div>
                <button
                  onClick={() => {
                    window.open('https://paypal.com', '_blank');
                    setUpgradeModalOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

