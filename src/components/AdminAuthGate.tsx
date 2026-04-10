import { useState, useEffect, ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingOverlay } from './Loading'
import AuthModal from './auth/AuthModal'

/**
 * Replaces ProtectedRoute on /admin routes.
 * Instead of redirecting unauthenticated users to /, it shows an inline
 * login prompt on the /admin page itself.
 */
export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Auto-open the sign-in modal when landing on /admin without a session
  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true)
    }
  }, [user, loading])

  if (loading) return <LoadingOverlay />

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
        <div className="text-center space-y-4">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
            Restricted Area
          </p>
          <h1 className="text-white text-2xl font-black uppercase tracking-widest">
            Admin Access
          </h1>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all"
          >
            Sign In
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    )
  }

  return <>{children}</>
}
