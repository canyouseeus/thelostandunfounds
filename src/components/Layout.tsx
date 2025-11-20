import { Link, Outlet } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const justClickedRef = useRef(false)

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
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

  // Handle menu hover behavior
  const handleMenuMouseEnter = useCallback(() => {
    // Don't open on hover if we just clicked the button
    if (!justClickedRef.current) {
      setMenuOpen(true)
    }
  }, [])

  const handleMenuMouseLeave = useCallback(() => {
    setMenuOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-black/80 backdrop-blur-md">
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
                <div className={`menu-dropdown ${menuOpen ? 'open' : ''}`}>
                  <Link 
                    to="/" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    HOME
                  </Link>
                  <Link 
                    to="/shop" 
                    className="menu-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    SHOP
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-6">
        <Outlet />
      </main>
    </div>
  )
}

