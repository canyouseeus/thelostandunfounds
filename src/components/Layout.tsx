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
import { isAdmin } from '../utils/admin'
import { initAffiliateTracking } from '../utils/affiliate-tracking'
import AuthModal from './auth/AuthModal'
import SageModeOverlay from './SageModeOverlay'
import { supabase } from '../lib/supabase'
import Footer from './Footer'
import NavLinks from './NavLinks'
import { LoadingOverlay } from './Loading'

export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const isTikTokDownloader = location.pathname === '/tools/tiktok-downloader'
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null)

  // State from NavLinks component needs to be lifted if we want to sync between desktop/mobile,
  // but for simple navigation, independent state in NavLinks is fine (submenus reset on close).

  const [homeHeaderReady, setHomeHeaderReady] = useState(location.pathname !== '/')
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const previousPathRef = useRef(location.pathname)
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, tier, signOut, loading, clearAuthStorage } = useAuth()
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

  // Check if user is admin
  useEffect(() => {
    if (user) {
      isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false))
    } else {
      setUserIsAdmin(false)
    }
  }, [user])

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
    // On home, wait for the intro animation to finish before showing the header row
    if (location.pathname !== '/') {
      setHomeHeaderReady(true)
      return
    }

    setHomeHeaderReady(false)
    const handleAnimationComplete = () => setHomeHeaderReady(true)
    window.addEventListener('home-animation-complete', handleAnimationComplete)

    return () => {
      window.removeEventListener('home-animation-complete', handleAnimationComplete)
    }
  }, [location.pathname])

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
      <nav className="fixed top-0 left-0 w-full bg-black backdrop-blur-md z-[999]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Top row: Title left, Menu button right */}
          <div
            className="flex items-center justify-between h-16 gap-4 flex-nowrap"
            style={{
              opacity: homeHeaderReady ? 1 : 0,
              pointerEvents: homeHeaderReady ? 'auto' : 'none',
              transition: 'opacity 0.6s ease-in-out',
            }}
          >
            <div className="flex items-center gap-4 flex-shrink-0 leading-none h-12">
              <Link
                to="/"
                className="flex items-center text-white hover:text-white/80 transition h-12"
                style={{ transform: 'translateY(7%)', display: 'flex', alignItems: 'center' }}
              >
                <span className="text-sm sm:text-lg md:text-xl font-bold whitespace-nowrap">THE LOST+UNFOUNDS</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4 ml-auto flex-shrink-0 leading-none h-12">
              <div
                className="header-nav"
                ref={menuRef}
              >
                <button
                  type="button"
                  className="menu-toggle flex items-center justify-center h-12 w-12 leading-none"
                  style={{ transform: 'translateY(0)' }}
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
          </div>
        </div>
      </nav>

      {/* Render Menu Portal */}
      <MenuPortal />

      <main className="pb-6 pt-20 flex-1">
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

