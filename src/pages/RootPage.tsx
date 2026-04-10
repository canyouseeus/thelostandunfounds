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

  // Show gallery immediately — switch to Home only once auth confirms admin
  if (!loading && user && isAdminEmail(user.email || '')) return <Home />

  return <Gallery isHomepage />
}
