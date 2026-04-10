import { useAuth } from '../contexts/AuthContext'
import { isAdminEmail } from '../utils/admin'
import Home from './Home'
import Gallery from './Gallery'

/**
 * Root route gate: admins get the full brand intro animation,
 * everyone else gets the gallery as the homepage.
 */
export default function RootPage() {
  const { user, loading } = useAuth()

  // Hold until auth resolves so we don't flash the wrong view
  if (loading) return null

  if (user && isAdminEmail(user.email || '')) return <Home />

  return <Gallery isHomepage />
}
