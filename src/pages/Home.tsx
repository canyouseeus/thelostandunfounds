import { useState } from 'react'
import { Mail } from 'lucide-react'

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setMessage('')

    // TODO: Connect to your email service (e.g., Mailchimp, ConvertKit, etc.)
    // For now, this is a placeholder that simulates an API call
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Replace this with your actual API endpoint
      // const response = await fetch('/api/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // })
      
      setStatus('success')
      setMessage('Thanks for signing up! We\'ll keep you updated.')
      setEmail('')
    } catch (error) {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            THE LOST+UNFOUNDS
          </h1>
          
          <div className="mt-12 mb-8">
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              We're building tools right now. Sign-up to our email list for updates!
            </p>
            
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all"
                    disabled={status === 'loading'}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === 'loading' ? 'Signing up...' : 'Sign up'}
                </button>
              </div>
              
              {message && (
                <p className={`mt-4 text-sm ${
                  status === 'success' 
                    ? 'text-green-400' 
                    : status === 'error' 
                    ? 'text-red-400' 
                    : 'text-white/70'
                }`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
