import { useState, useRef } from 'react';
import Turnstile from 'react-turnstile';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Get Cloudflare Turnstile site key from environment
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const isDev =
    import.meta.env.DEV ||
      typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local')
      : false;
  const requiresTurnstile = turnstileSiteKey && !isDev;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Turnstile token (required in production)
    if (requiresTurnstile && !turnstileToken) {
      alert('Please complete the security verification');
      return;
    }

    // Validate email
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Call API endpoint to save email and send confirmation
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          turnstileToken: turnstileToken,
        }),
      });

      // Handle empty or invalid responses
      if (!response.ok && response.status === 404) {
        throw new Error('API endpoint not found. Make sure you are running with "npx vercel dev" for API routes to work.');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text || 'Empty response'}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Success
      setSuccess(true);
      setEmail('');

      // Reset Turnstile
      setTurnstileKey(prev => prev + 1);
      setTurnstileToken(null);
    } catch (error: any) {
      console.error('Email signup error:', error);
      alert(error.message || 'Failed to subscribe. Please try again.');

      // Reset Turnstile on error
      setTurnstileKey(prev => prev + 1);
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md bg-black/90 backdrop-blur-md p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-6 h-6 text-black stroke-[3]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Thank you for subscribing!
          </h3>
          <p className="text-white/60 text-sm mb-6">
            Check your email for confirmation.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="w-full px-4 py-2 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
          >
            Subscribe Another Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-black/90 backdrop-blur-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-2 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:bg-white/10 transition-colors disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (requiresTurnstile && !turnstileToken)}
          className="w-full px-4 py-2 bg-white text-black font-semibold hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>

        {/* Cloudflare Turnstile */}
        {requiresTurnstile && (
          <div className="flex justify-center pt-2">
            <Turnstile
              sitekey={turnstileSiteKey}
              onSuccess={(token) => {
                console.log('Turnstile verified successfully');
                setTurnstileToken(token);
              }}
              onError={(error) => {
                console.error('❌ Turnstile error:', error);
                console.error('Site key (first 20 chars):', turnstileSiteKey?.substring(0, 20));
                console.error('Current domain:', window.location.hostname);
                console.error('Full site key:', turnstileSiteKey);
                setTurnstileToken(null);
                if (error?.errorCode === '400020') {
                  alert(`Turnstile Configuration Error (400020)\n\nPlease verify:\n1. Site key in Vercel matches Cloudflare exactly\n2. Domain "${window.location.hostname}" is added in Cloudflare\n3. Both thelostandunfounds.com and www.thelostandunfounds.com are configured\n\nCheck console for site key details.`);
                } else {
                  alert('Security verification failed. Please try again.');
                }
              }}
              onExpire={() => {
                console.log('Turnstile token expired');
                setTurnstileToken(null);
              }}
              onLoad={(widgetId) => {
                console.log('Turnstile loaded:', widgetId);
              }}
              key={turnstileKey}
              theme="dark"
            />
          </div>
        )}

        {!requiresTurnstile && isDev && (
          <p className="text-[10px] text-white/30 text-center">
            Security verification disabled in dev mode.
          </p>
        )}
      </form>

      <p className="text-white/40 text-xs text-center mt-4">
        Thanks for stopping by. Sign-up for updates and news!
      </p>
    </div>
  );
}
