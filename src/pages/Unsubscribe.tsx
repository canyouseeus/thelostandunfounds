import { FormEvent, useState } from 'react'

const Unsubscribe = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({
    type: 'idle'
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setStatus({ type: 'error', message: 'Please enter your email.' })
      return
    }
    setStatus({ type: 'loading' })
    try {
      const resp = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data?.error || 'Unable to process unsubscribe. Please try again.')
      }
      setStatus({ type: 'success', message: 'You have been unsubscribed.' })
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'Unable to process unsubscribe. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl border border-white/10 bg-white/5 p-8 rounded-none">
        <h1 className="text-2xl font-bold mb-3 tracking-wide">THE LOST+UNFOUNDS</h1>
        <h2 className="text-lg font-semibold mb-4">Unsubscribe</h2>
        <p className="text-white/70 text-sm mb-6">
          Enter the email you used to subscribe. We will remove it from our newsletter list.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-white/80">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-black text-white border border-white/20 rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/40"
              placeholder="you@example.com"
              required
            />
          </label>
          <button
            type="submit"
            disabled={status.type === 'loading'}
            className="w-full bg-white text-black font-semibold px-4 py-2 border border-white rounded-none hover:bg-white/90 disabled:opacity-60"
          >
            {status.type === 'loading' ? 'Processing...' : 'Unsubscribe'}
          </button>
        </form>
        {status.type === 'success' && (
          <p className="mt-4 text-sm text-green-400">{status.message}</p>
        )}
        {status.type === 'error' && (
          <p className="mt-4 text-sm text-red-400">{status.message}</p>
        )}
        <p className="mt-6 text-xs text-white/50">
          If you subscribed with another address, submit that email to unsubscribe.
        </p>
      </div>
    </div>
  )
}

export default Unsubscribe


