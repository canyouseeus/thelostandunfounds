/**
 * PREVIEW ONLY — not a production route.
 * Shows the admin login slide-up animation exactly as it will appear
 * when the gallery-homepage branch ships. The animation always plays
 * regardless of login state so you can see it on any device.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AuthModal from '../components/auth/AuthModal'

export default function PreviewAdminLoginPage() {
  const [show, setShow] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Trigger the slide-up a frame after mount — same timing as the real component
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-black">

      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 w-full bg-black z-[999]">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-white font-bold text-sm sm:text-lg md:text-xl whitespace-nowrap"
          >
            THE LOST+UNFOUNDS
          </Link>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 border border-white/20 px-2 py-1">
            Preview
          </span>
        </div>
      </nav>

      {/* Slide-up login card — identical to AdminAuthGate */}
      <div
        style={{
          opacity: show ? 1 : 0,
          visibility: show ? 'visible' : 'hidden',
          position: 'fixed',
          left: '50%',
          top: show ? '50%' : '100%',
          transform: show ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
          width: '100%',
          maxWidth: 'min(400px, 90vw)',
          padding: '0 1rem',
          zIndex: 40,
          transition: 'opacity 1.5s ease-in-out, transform 1.5s ease-in-out, visibility 0s linear',
          pointerEvents: show ? 'auto' : 'none',
          willChange: 'opacity, transform',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div className="text-center space-y-6 w-full">
          <div className="space-y-2">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
              Restricted Area
            </p>
            <h1 className="text-white text-2xl font-black uppercase tracking-widest">
              Admin Access
            </h1>
          </div>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95"
          >
            Sign In
          </button>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
