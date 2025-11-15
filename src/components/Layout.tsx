import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../utils/admin'
import AuthModal from './auth/AuthModal'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isTikTokDownloader = location.pathname === '/tools/tiktok-downloader'
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOpeningModalRef = useRef(false)
  const { user, tier, signOut, loading, clearAuthStorage } = useAuth()

  // Check if user is admin
  useEffect(() => {
    if (user) {
      isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false))
    } else {
      setUserIsAdmin(false)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const handleLoginClick = (e: React.MouseEvent<HTMLButtonElement>) => {
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
  }

  const tierColors = {
    free: 'text-white/60',
    premium: 'text-yellow-400',
    pro: 'text-purple-400',
  }

  const tierLabels = {
    free: 'Free',
    premium: 'Premium',
    pro: 'Pro',
  }

  return (
    <div className="min-h-screen bg-black">
      {!isTikTokDownloader && (
      <nav className="bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Title left, Menu button right */}
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-white hover:text-white/80 transition">
              <span className="text-xl font-bold">THE LOST+UNFOUNDS</span>
            </Link>
            {!isHome && (
            <div className="flex items-center space-x-4">
              <div className="header-nav" ref={menuRef}>
                <button 
                  className="menu-toggle flex items-center justify-center"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span className="menu-icon text-xl">☰</span>
                </button>
                <div className={`menu-dropdown ${menuOpen ? 'open' : ''}`}>
                  <Link 
                    to="/" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link 
                    to="/tools" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Explore Tools
                  </Link>
                  <Link 
                    to="/docs" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Documentation
                  </Link>
                  <Link 
                    to="/pricing" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link 
                    to="/about" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link 
                    to="/support" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    Support
                  </Link>
                  {!loading && user && (
                    <>
                      <Link 
                        to="/profile" 
                        className="menu-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link 
                        to="/settings" 
                        className="menu-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      {userIsAdmin && (
                        <Link 
                          to="/admin" 
                          className="menu-item"
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                    </>
                  )}
                  {!loading && !user && (
                    <>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={handleLoginClick}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 1001 }}
                      >
                        LOG IN
                      </button>
                      <button
                        type="button"
                        className="menu-item text-xs text-white/40"
                        onClick={async () => {
                          await clearAuthStorage();
                        }}
                        title="Clear all auth cookies and storage"
                      >
                        Clear Cookies
                      </button>
                    </>
                  )}
                  {!loading && user && (
                    <>
                      <div className="menu-item user-info">
                        <div className="text-white/80 text-xs mb-1">{user.email || 'User'}</div>
                        {tier === 'free' ? (
                          <button
                            className={`text-xs font-semibold ${tierColors[tier]} hover:text-white transition cursor-pointer bg-transparent border-none p-0 w-full text-left`}
                            onClick={() => {
                              setUpgradeModalOpen(true);
                              setMenuOpen(false);
                            }}
                          >
                            {tierLabels[tier]} Tier
                          </button>
                        ) : (
                          <div className={`text-xs font-semibold ${tierColors[tier]}`}>
                            {tierLabels[tier]} Tier
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="menu-item"
                        onClick={async () => {
                          await signOut()
                          setMenuOpen(false)
                        }}
                      >
                        SIGN OUT
                      </button>
                      <button
                        type="button"
                        className="menu-item text-xs text-white/40"
                        onClick={async () => {
                          await clearAuthStorage();
                        }}
                        title="Clear all auth cookies and storage"
                      >
                        Clear Cookies
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
          {/* Logo centered below */}
          <div className="flex justify-center pb-3">
            <img src="/logo.png" alt="THE LOST+UNFOUNDS Logo" className="max-w-[190px] h-auto" style={{ maxWidth: '190px' }} />
          </div>
        </div>
      </nav>
      )}
      <main className="pb-6 pt-0">
        <Outlet />
      </main>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      
      {/* Upgrade Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-white/10 rounded-lg p-6 w-full max-w-md mx-4">
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
              <div className="bg-black border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Premium Tier</h3>
                <p className="text-white/70 text-sm mb-3">Unlimited access to all tools</p>
                <div className="text-2xl font-bold text-white mb-4">$9.99<span className="text-sm text-white/60">/month</span></div>
                <button
                  onClick={() => {
                    window.open('https://paypal.com', '_blank');
                    setUpgradeModalOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
                >
                  Upgrade to Premium
                </button>
              </div>
              <div className="bg-black border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Pro Tier</h3>
                <p className="text-white/70 text-sm mb-3">Everything + API access</p>
                <div className="text-2xl font-bold text-white mb-4">$19.99<span className="text-sm text-white/60">/month</span></div>
                <button
                  onClick={() => {
                    window.open('https://paypal.com', '_blank');
                    setUpgradeModalOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

