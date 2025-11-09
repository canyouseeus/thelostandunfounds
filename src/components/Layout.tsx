import { Link, Outlet, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-white hover:text-white/80 transition">
              <span className="text-xl font-bold">THE LOST+UNFOUNDS</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="header-nav" ref={menuRef}>
                <button 
                  className="menu-toggle"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span className="menu-icon">☰</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-6 pt-0">
        <Outlet />
      </main>
    </div>
  )
}

