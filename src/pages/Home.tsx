import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)
  const recaptchaLoaded = useRef(false)

  useEffect(() => {
    // Load reCAPTCHA v3 when component mounts
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (siteKey && typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      recaptchaLoaded.current = true
    } else if (window.grecaptcha) {
      recaptchaLoaded.current = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    // Honeypot check - if filled, it's a bot
    if (honeypotRef.current?.value) {
      setStatus('error')
      setMessage('Invalid submission detected.')
      return
    }

    let recaptchaToken = ''

    // Get reCAPTCHA token if available
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (siteKey && typeof window !== 'undefined' && window.grecaptcha) {
      try {
        recaptchaToken = await new Promise<string>((resolve, reject) => {
          window.grecaptcha.ready(() => {
            window.grecaptcha.execute(siteKey, { action: 'signup' })
              .then(resolve)
              .catch(reject)
          })
        })
      } catch (error) {
        console.error('reCAPTCHA error:', error)
        // Continue without token if reCAPTCHA fails (for development)
      }
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          recaptchaToken,
          honeypot: honeypotRef.current?.value || ''
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up')
      }

      setStatus('success')
      setMessage(data.message || 'Thanks for signing up! Check your email.')
      setEmail('')
      // Clear honeypot
      if (honeypotRef.current) {
        honeypotRef.current.value = ''
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <nav className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-white hover:text-white/80 transition">
              <span className="text-xl font-bold">THE LOST+UNFOUNDS</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link 
                to="/tools" 
                className="text-white hover:text-white/80 transition"
              >
                Explore Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="pb-6 pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">
              THE LOST+UNFOUNDS
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Discover powerful tools and utilities
            </p>
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-white/90 transition-colors mb-12"
            >
              Explore Tools
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Email Signup Section */}
          <div className="max-w-md mx-auto mt-16">
            <div className="bg-black border border-white/10 rounded-lg p-8">
              <div className="text-center mb-6">
                <Mail className="w-12 h-12 text-white mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Stay Updated
                </h2>
                <p className="text-white/70 text-sm">
                  Get notified about new tools and features
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field - hidden from users but visible to bots */}
                <input
                  ref={honeypotRef}
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                  aria-hidden="true"
                />
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-colors disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Signing up...' : status === 'success' ? 'Signed up!' : 'Sign Up'}
                </button>
              </form>

              {message && (
                <div className={`mt-4 text-center text-sm ${
                  status === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
