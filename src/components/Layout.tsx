import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, User, LogOut, Sparkles } from 'lucide-react'
import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSageMode } from '../contexts/SageModeContext'
import { isAdmin } from '../utils/admin'
import AuthModal from './auth/AuthModal'
import SageModeOverlay from './SageModeOverlay'
import { supabase } from '../lib/supabase'
import Footer from './Footer'

export default function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation()
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
      setMoreMenuOpen(false)
      setAccountMenuOpen(false)
      setArchivesMenuOpen(false)
      menuCloseTimeoutRef.current = null
    }, 300)
  }, [])

  const handleSubmenuMouseEnter = useCallback((submenuType: 'more' | 'account' | 'archives') => {
    // Close other submenus when opening one (accordion style)
    if (submenuType === 'more') {
      setMoreMenuOpen(true)
      setAccountMenuOpen(false)
      setArchivesMenuOpen(false)
    } else if (submenuType === 'account') {
      setAccountMenuOpen(true)
      setMoreMenuOpen(false)
      setArchivesMenuOpen(false)
    } else if (submenuType === 'archives') {
      setArchivesMenuOpen(true)
      setMoreMenuOpen(false)
      setAccountMenuOpen(false)
    }
  }, [])

  // Removed handleSubmenuMouseLeave to prevent menu resizing while navigating

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
    <div className="min-h-screen bg-black flex flex-col">
      <SageModeOverlay />
      <nav className="fixed top-0 left-0 w-full bg-black backdrop-blur-md z-[2147483647]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Title left, Menu button right */}
          <div className="flex items-center justify-between h-16 gap-4 flex-nowrap">
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
                <div 
                  className={`menu-dropdown ${menuOpen ? 'open' : ''}`}
                  ref={dropdownRef}
                  onMouseEnter={handleMenuMouseEnter}
                  onMouseLeave={handleMenuMouseLeave}
                  style={{ maxHeight: '80vh', overflowY: 'auto' }}
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
                  <div 
                    className="menu-item menu-toggle-section flex items-center justify-start w-full gap-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivesMenuOpen(!archivesMenuOpen);
                    }}
                  >
                    <span className="flex-grow">THE LOST ARCHIVES</span>
                    <div
                      className="p-1 hover:bg-white/10 transition rounded-none flex items-center justify-center h-6 w-6 shrink-0"
                    >
                      {archivesMenuOpen ? '▼' : '▶'}
                    </div>
                  </div>
                  <div 
                    className={`menu-subsection ${archivesMenuOpen ? 'open' : ''}`}
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
                    <Link 
                      to="/gearheads" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      GEARHEADS
                    </Link>
                    <Link 
                      to="/borderlands" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      EDGE OF THE BORDERLANDS
                    </Link>
                    <Link 
                      to="/science" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      MAD SCIENTISTS
                    </Link>
                    <Link 
                      to="/newtheory" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setArchivesMenuOpen(false);
                      }}
                    >
                      NEW THEORY
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
                  
                  <div 
                    className="menu-item menu-toggle-section flex items-center justify-start w-full gap-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreMenuOpen(!moreMenuOpen);
                    }}
                  >
                    <span className="flex-grow">MORE</span>
                    <div
                      className="p-1 hover:bg-white/10 transition rounded-none flex items-center justify-center h-6 w-6 shrink-0"
                    >
                      {moreMenuOpen ? '▼' : '▶'}
                    </div>
                  </div>
                  <div 
                    className={`menu-subsection ${moreMenuOpen ? 'open' : ''}`}
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
                      to="/privacy-policy" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMoreMenuOpen(false);
                      }}
                    >
                      PRIVACY POLICY
                    </Link>
                    <Link 
                      to="/terms-of-service" 
                      className="menu-item menu-subitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMoreMenuOpen(false);
                      }}
                    >
                      TERMS OF SERVICE
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
                      <div className="my-2"></div>
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
                {userIsAdmin && (
                  <button
                    type="button"
                    className="menu-item w-full text-left flex items-center justify-between"
                    onClick={() => {
                      toggleSageMode();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      SAGE MODE
                    </div>
                    <span className={`text-xs ${sageModeState.enabled ? 'text-yellow-400' : 'text-white/40'}`}>
                      {sageModeState.enabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
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
                      <div className="my-2"></div>
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
  )
}

