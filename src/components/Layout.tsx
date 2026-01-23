import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, User, LogOut, Sparkles } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSageMode } from '../contexts/SageModeContext'
import { isAdmin } from '../utils/admin'
import { initAffiliateTracking } from '../utils/affiliateTracking'
import AuthModal from './auth/AuthModal'
import SageModeOverlay from './SageModeOverlay'
import { supabase } from '../lib/supabase'
import Footer from './Footer'
import NavLinks from './NavLinks'

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
  const menuRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isOpeningModalRef = useRef(false)
  const justClickedRef = useRef(false)
  const menuCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuCloseTimeoutRef.current) {
        clearTimeout(menuCloseTimeoutRef.current)
      }
    }
  }, [])

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only runs for desktop dropdown behavior
      if (window.innerWidth < 640) return; // Don't auto-close on mobile taps outside (mobile matches width)

      // Don't close if we're in the process of opening a modal
      if (isOpeningModalRef.current) {
        return
      }

      const target = event.target as HTMLElement

      // Don't close if clicking on login button
      if (target.closest('button.menu-item')) {
        const button = target.closest('button.menu-item') as HTMLElement
        const buttonText = button.textContent?.trim() || ''
        if (buttonText === 'LOG IN') {
          return // Let the button's onClick handle it
        }
      }

      if (menuRef.current && !menuRef.current.contains(target)) {
        // Clear any pending timeout before closing
        if (menuCloseTimeoutRef.current) {
          clearTimeout(menuCloseTimeoutRef.current)
          menuCloseTimeoutRef.current = null
        }
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [menuOpen])

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Set flag to prevent click-outside handler from interfering
    isOpeningModalRef.current = true

    // Close menu and open modal
    setMenuOpen(false)

    // Use requestAnimationFrame to ensure DOM updates before opening modal
    requestAnimationFrame(() => {
      setAuthModalOpen(true)
      // Reset flag after modal opens
      setTimeout(() => {
        isOpeningModalRef.current = false
      }, 200)
    })
  }

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    // Force a hard reload to ensure all auth state is cleared
    window.location.href = '/'
  }

  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY }
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Handle menu hover behavior
  const handleMenuMouseEnter = useCallback(() => {
    // Disable hover open on mobile
    if (window.innerWidth < 640) return;

    // Clear any pending close timeout
    if (menuCloseTimeoutRef.current) {
      clearTimeout(menuCloseTimeoutRef.current)
      menuCloseTimeoutRef.current = null
    }
    // Don't open on hover if we just clicked the button
    if (!justClickedRef.current) {
      setMenuOpen(true)
    }
  }, [])

  const handleMenuMouseLeave = useCallback(() => {
    // Disable hover close on mobile
    if (window.innerWidth < 640) return;

    // Add delay before closing - check if mouse is still over menu before closing
    menuCloseTimeoutRef.current = setTimeout(() => {
      // Check if mouse is still over the menu area (button OR dropdown)
      if (mousePositionRef.current) {
        const { x, y } = mousePositionRef.current
        let isOver = false

        // Check button/container
        if (menuRef.current) {
          const rect = menuRef.current.getBoundingClientRect()
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            isOver = true
          }
        }

        // Check dropdown
        if (!isOver && dropdownRef.current) {
          const rect = dropdownRef.current.getBoundingClientRect()
          // Add a small buffer (20px) around dropdown to handle fast movements/gaps
          const buffer = 20
          if (x >= rect.left - buffer && x <= rect.right + buffer && y >= rect.top - buffer && y <= rect.bottom + buffer) {
            isOver = true
          }
        }

        // If mouse is still within bounds, don't close
        if (isOver) {
          menuCloseTimeoutRef.current = null
          return
        }
      }

      setMenuOpen(false)
      menuCloseTimeoutRef.current = null
    }, 300)
  }, [])

  // Mobile Menu Portal Component
  const MobileMenuPortal = () => {
    if (!menuOpen) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[99999] bg-black sm:hidden flex flex-col"
        style={{ touchAction: 'none' }}
      >
        {/* Mobile Header Row (for close button) */}
        <div className="flex items-center justify-between h-16 w-full px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center h-12">
            <span className="text-white text-sm font-bold">MENU</span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center h-12 w-12 text-white"
            aria-label="Close menu"
          >
            <span className="text-2xl">✕</span>
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
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                <button
                  type="button"
                  className="menu-toggle flex items-center justify-center h-12 w-12 leading-none"
                  style={{ transform: 'translateY(0)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    justClickedRef.current = true;
                    setMenuOpen(!menuOpen);
                    // Reset the flag after a short delay to allow hover to work again
                    setTimeout(() => {
                      justClickedRef.current = false;
                    }, 300);
                  }}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span className="menu-icon text-xl">☰</span>
                </button>

                {/* Desktop Dropdown (Hidden on Mobile) */}
                <div
                  className={`menu-dropdown hidden sm:block ${menuOpen ? 'open' : ''}`}
                  ref={dropdownRef}
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleMenuMouseLeave}
                >
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
            </div>
          </div>
        </div>
      </nav>

      {/* Render Mobile Menu Portal */}
      <MobileMenuPortal />

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
                ✕
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

