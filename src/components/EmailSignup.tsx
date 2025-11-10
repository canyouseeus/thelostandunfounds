import { useState, useRef } from 'react';
import { Turnstile } from 'react-turnstile';
import { supabase } from '../lib/supabase';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  // Get Cloudflare Turnstile site key from environment
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // In development, allow submission without Turnstile for testing
    const isDev = import.meta.env.DEV;
    const requiresTurnstile = turnstileSiteKey && !isDev;

    // Validate Turnstile token (only required if Turnstile is configured and not in dev mode)
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
      // Store email in Supabase
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          subscribed_at: new Date().toISOString(),
          source: 'landing_page',
          verified: true,
        });

      if (insertError) {
        // If email already exists, that's okay
        if (insertError.code === '23505') {
          setSuccess(true);
          setEmail('');
          alert('Email already subscribed!');
          if (turnstileRef.current) {
            turnstileRef.current.reset();
          }
          setTurnstileToken(null);
          setLoading(false);
          return;
        }
        throw insertError;
      }

      setSuccess(true);
      setEmail('');
      alert('Successfully subscribed! Check your email for updates.');
      
      // Reset Turnstile
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setTurnstileToken(null);
    } catch (error: any) {
      console.error('Email signup error:', error);
      alert(error.message || 'Failed to subscribe. Please try again.');
      
      // Reset Turnstile on error
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="email-signup-success" style={{
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>
          Thank you for subscribing!
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1rem' }}>
          We'll keep you updated with the latest news and updates.
        </p>
        <button
          onClick={() => setSuccess(false)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Subscribe Another Email
        </button>
      </div>
    );
  }

  return (
    <div className="email-signup" style={{
      background: 'rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '1.5rem',
      maxWidth: '500px',
      width: '100%'
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '1rem'
            }}
          />
          <button
            type="submit"
            disabled={loading || (turnstileSiteKey && !turnstileToken && !import.meta.env.DEV)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading || (turnstileSiteKey && !turnstileToken && !import.meta.env.DEV) ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              color: loading || (turnstileSiteKey && !turnstileToken && !import.meta.env.DEV) ? 'rgba(0, 0, 0, 0.5)' : '#000000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading || (turnstileSiteKey && !turnstileToken && !import.meta.env.DEV) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {/* Cloudflare Turnstile */}
        {turnstileSiteKey && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Turnstile
              sitekey={turnstileSiteKey}
              onSuccess={(token) => {
                setTurnstileToken(token);
              }}
              onError={() => {
                setTurnstileToken(null);
                alert('Security verification failed. Please try again.');
              }}
              onExpire={() => {
                setTurnstileToken(null);
              }}
              ref={turnstileRef}
              theme="dark"
            />
          </div>
        )}

        {!turnstileSiteKey && import.meta.env.DEV && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', margin: 0 }}>
            Security verification is not configured. Please set VITE_TURNSTILE_SITE_KEY in your environment variables.
          </p>
        )}
      </form>
    </div>
  );
}

