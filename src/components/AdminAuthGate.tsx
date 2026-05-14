import { useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAdmin as checkIsAdmin, isAdminEmail } from '../utils/admin'
import { LoadingOverlay } from './Loading'
import AuthModal from './auth/AuthModal'

/**
 * Replaces ProtectedRoute on /admin routes.
 * - Unauthenticated: shows an inline sign-in prompt that slides up.
 * - Authenticated but not admin: shows a "wrong account" prompt with a
 *   Sign Out & Switch action, so the user can log in as an admin without
 *   being bounced off /admin.
 */
export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [show, setShow] = useState(false)
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null)
  const [checkingAdmin, setCheckingAdmin] = useState(false)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
      setAdminStatus(null)
    }
  }, [user, loading])

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setAdminStatus(null)
      return
    }

    if (isAdminEmail(user.email || '')) {
      setAdminStatus(true)
      return
    }

    setCheckingAdmin(true)
    checkIsAdmin()
      .then((result) => {
        if (!cancelled) setAdminStatus(result)
      })
      .catch(() => {
        if (!cancelled) setAdminStatus(false)
      })
      .finally(() => {
        if (!cancelled) setCheckingAdmin(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const handleSwitchAccount = async () => {
    setSwitching(true)
    try {
      await signOut()
    } finally {
      setSwitching(false)
      setAuthModalOpen(true)
    }
  }

  if (loading || (user && adminStatus === null) || checkingAdmin) {
    return <LoadingOverlay />
  }

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

  if (adminStatus === false) {
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
            maxWidth: 'min(420px, 90vw)',
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
            <div className="space-y-3">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                Restricted Area
              </p>
              <h1 className="text-white text-2xl font-black uppercase tracking-widest">
                Admin Access Required
              </h1>
              <p className="text-white/60 text-xs leading-relaxed normal-case pt-2 px-4">
                You do not have admin privileges. Sign out and switch to an admin account to access the dashboard.
              </p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest pt-1 break-all">
                Signed in as <span className="text-white/70">{user.email}</span>
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={handleSwitchAccount}
                disabled={switching}
                className="inline-flex items-center justify-center w-full max-w-[280px] px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {switching ? 'Signing Out…' : 'Sign Out & Switch'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center w-full max-w-[280px] px-8 py-4 bg-transparent text-white/70 font-black uppercase tracking-widest text-xs hover:text-white transition-all active:scale-95"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          title="Switch to Admin"
          message="You do not have admin privileges on the previous account. Sign in with an admin account to access the dashboard."
        />
      </>
    )
  }

  return <>{children}</>
}
