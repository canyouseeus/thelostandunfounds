import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, User, LogOut } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin } from '../utils/admin'
import AuthModal from './auth/AuthModal'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isTikTokDownloader = location.pathname === '/tools/tiktok-downloader'
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [archivesMenuOpen, setArchivesMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isOpeningModalRef = useRef(false)
  const justClickedRef = useRef(false)
  const menuCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { user, tier, signOut, loading, clearAuthStorage } = useAuth()
  const navigate = useNavigate()
  
  // Load user subdomain for profile link
  useEffect(() => {
    if (user) {
      supabase
        .from('user_subdomains')
        .select('subdomain')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.subdomain) {
            setUserSubdomain(data.subdomain);
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }, [user]);

  // Only show HOME and SHOP in menu for now (MORE menu always visible)
  const showLimitedMenu = true

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
    navigate('/')
  }

  // Handle menu hover behavior
  const handleMenuMouseEnter = useCallback(() => {
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
    // Add delay before closing - this allows mouse to move between button and dropdown
    menuCloseTimeoutRef.current = setTimeout(() => {
      setMenuOpen(false)
      setMoreMenuOpen(false)
      setAccountMenuOpen(false)
      setArchivesMenuOpen(false)
      menuCloseTimeoutRef.current = null
    }, 500) // 500ms delay - enough time to move mouse across gap
  }, [])

  const handleSubmenuMouseEnter = useCallback((submenuType: 'more' | 'account' | 'archives') => {
    if (submenuType === 'more') {
      setMoreMenuOpen(true)
    } else if (submenuType === 'account') {
      setAccountMenuOpen(true)
    } else if (submenuType === 'archives') {
      setArchivesMenuOpen(true)
    }
  }, [])

  const handleSubmenuMouseLeave = useCallback((submenuType: 'more' | 'account' | 'archives') => {
    if (submenuType === 'more') {
      setMoreMenuOpen(false)
    } else if (submenuType === 'account') {
      setAccountMenuOpen(false)
    } else if (submenuType === 'archives') {
      setArchivesMenuOpen(false)
    }
  }, [])

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
      <nav className="bg-black/80 backdrop-blur-md relative z-[10000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Title left, Menu button right */}
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center text-white hover:text-white/80 transition">
              <span className="text-xl font-bold">THE LOST+UNFOUNDS</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div 
                className="header-nav" 
                ref={menuRef}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
              >
                  <button 
                    type="button"
                    className="menu-toggle flex items-center justify-center"
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
                <div 
                  className={`menu-dropdown ${menuOpen ? 'open' : ''}`}
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleMenuMouseLeave}
                >
                  <Link 
                    to="/" 
                    className="menu-item"
                    onClick={() => {
                      // Allow navigation to happen before closing menu
                      setTimeout(() => {
                        setMenuOpen(false);
                      }, 100);
                    }}
                  >
                    HOME
                  </Link>
                  <Link 
                    to="/shop" 
                    className="menu-item"
                    onClick={() => {
                      // Allow navigation to happen before closing menu
                      setTimeout(() => {
                        setMenuOpen(false);
                      }, 100);
                    }}
                  >
                    SHOP
                  </Link>
                  <button
                    type="button"
                    className="menu-item menu-toggle-section"
                    onClick={() => setArchivesMenuOpen(!archivesMenuOpen)}
                    onMouseEnter={() => handleSubmenuMouseEnter('archives')}
                    onMouseLeave={() => handleSubmenuMouseLeave('archives')}
                  >
                    THE LOST ARCHIVES {archivesMenuOpen ? '▼' : '▶'}
                  </button>
                  <div 
                    className={`menu-subsection ${archivesMenuOpen ? 'open' : ''}`}
                    onMouseEnter={() => handleSubmenuMouseEnter('archives')}
                    onMouseLeave={() => handleSubmenuMouseLeave('archives')}
                  >
                    <Link 
                      to="/thelostarchives" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      ALL ARTICLES
                    </Link>
                    <Link 
                      to="/book-club" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      BOOK CLUB
                    </Link>
                  </div>
                  {!showLimitedMenu && (
                    <Link 
                      to="/tools" 
                      className="menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      EXPLORE TOOLS
                    </Link>
                  )}
                  
                  <button
                    type="button"
                    className="menu-item menu-toggle-section"
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    onMouseEnter={() => handleSubmenuMouseEnter('more')}
                    onMouseLeave={() => handleSubmenuMouseLeave('more')}
                  >
                    MORE {moreMenuOpen ? '▼' : '▶'}
                  </button>
                  <div 
                    className={`menu-subsection ${moreMenuOpen ? 'open' : ''}`}
                    onMouseEnter={() => handleSubmenuMouseEnter('more')}
                    onMouseLeave={() => handleSubmenuMouseLeave('more')}
                  >
                    <Link 
                      to="/about" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMoreMenuOpen(false);
                      }}
                    >
                      ABOUT
                    </Link>
                    <Link 
                      to="/privacy" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMoreMenuOpen(false);
                      }}
                    >
                      PRIVACY POLICY
                    </Link>
                    <Link 
                      to="/terms" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMoreMenuOpen(false);
                      }}
                    >
                      TERMS AND CONDITIONS
                    </Link>
                    {!showLimitedMenu && (
                      <>
                        <Link 
                          to="/docs" 
                          className="menu-item menu-subitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setMoreMenuOpen(false);
                          }}
                        >
                          DOCUMENTATION
                        </Link>
                        <Link 
                          to="/pricing" 
                          className="menu-item menu-subitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setMoreMenuOpen(false);
                          }}
                        >
                          PRICING
                        </Link>
                        <Link 
                          to="/support" 
                          className="menu-item menu-subitem"
                          onClick={() => {
                            setMenuOpen(false);
                            setMoreMenuOpen(false);
                          }}
                        >
                          SUPPORT
                        </Link>
                      </>
                    )}
                  </div>
                  {user && (
                    <>
                      <div className="border-t border-white/10 my-2"></div>
                <Link
                  to={userIsAdmin ? "/admin" : userSubdomain ? `/${userSubdomain}/bookclubprofile` : "/bookclubprofile"}
                  className="menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {userIsAdmin ? 'ADMIN DASHBOARD' : 'PROFILE'}
                  </div>
                </Link>
                      <button
                        type="button"
                        className="menu-item w-full text-left"
                        onClick={handleSignOut}
                      >
                        <div className="flex items-center gap-2">
                          <LogOut className="w-4 h-4" />
                          LOG OUT
                        </div>
                      </button>
                      <div className="border-t border-white/10 my-2"></div>
                      <div className="menu-item user-info">
                        <div className="text-white/60 text-xs mb-1">Logged in as:</div>
                        <div className="text-white text-sm font-medium">
                          {user.user_metadata?.author_name || user.email?.split('@')[0] || 'User'}
                        </div>
                      </div>
                    </>
                  )}
                  {!user && (
                    <button
                      type="button"
                      className="menu-item"
                      onClick={handleLoginClick}
                    >
                      LOG IN
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-6">
        <Outlet />
      </main>
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
  )
}

