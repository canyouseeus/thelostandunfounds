import { useState, useEffect, ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingOverlay } from './Loading'
import AuthModal from './auth/AuthModal'

/**
 * Replaces ProtectedRoute on /admin routes.
 * Instead of redirecting unauthenticated users to /, it shows an inline
 * login prompt that slides up from the bottom — matching the newsletter
 * signup animation on the homepage.
 */
export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [show, setShow] = useState(false)

  // Trigger the slide-up entrance after mount
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Auto-open the sign-in modal when landing on /admin without a session
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  if (loading) return <LoadingOverlay />

  if (!user) {
    return (
      <>
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
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    )
  }

  return <>{children}</>
}
