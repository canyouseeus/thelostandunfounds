import { useState, useRef } from 'react';
import Turnstile from 'react-turnstile';

export default function EmailSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  // Get Cloudflare Turnstile site key from environment
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
  const isDev = import.meta.env.DEV;
  
  // Only show Turnstile in production (localhost not configured in Cloudflare)
  const shouldShowTurnstile = turnstileSiteKey && !isDev;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Turnstile token (required in production)
    const requiresTurnstile = turnstileSiteKey && !isDev;

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
      const response = await fetch('/api/newsletter-subscribe', {
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

      // Always show diagnostic info
      let diagnosticMessage = data.message || 'Successfully subscribed!\n\n';
      
      if (data.warning) {
        diagnosticMessage += `⚠️ ${data.warning}\n\n`;
      }
      
      if (data.emailConfig) {
        diagnosticMessage += 'Email Configuration:\n';
        diagnosticMessage += `- Client ID: ${data.emailConfig.hasClientId ? '✓ Set' : '✗ Missing'}\n`;
        diagnosticMessage += `- Client Secret: ${data.emailConfig.hasClientSecret ? '✓ Set' : '✗ Missing'}\n`;
        diagnosticMessage += `- Refresh Token: ${data.emailConfig.hasRefreshToken ? '✓ Set' : '✗ Missing'}\n`;
        diagnosticMessage += `- From Email: ${data.emailConfig.hasFromEmail ? '✓ Set' : '✗ Missing'}\n`;
      }
      
      if (data.errorDetails) {
        diagnosticMessage += `\nError Details: ${data.errorDetails}`;
      }
      
      if (data.emailSent) {
        diagnosticMessage += `\n\n✅ Email sent successfully`;
      }
      
      alert(diagnosticMessage);
      console.log('Email diagnostic info:', data);

      setSuccess(true);
      setEmail('');
      
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
            disabled={loading || (shouldShowTurnstile && !turnstileToken)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: loading || (shouldShowTurnstile && !turnstileToken) ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
              color: loading || (shouldShowTurnstile && !turnstileToken) ? 'rgba(0, 0, 0, 0.5)' : '#000000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading || (shouldShowTurnstile && !turnstileToken) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {/* Cloudflare Turnstile - Only show in production */}
        {shouldShowTurnstile && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                // Error 400020 = Invalid sitekey or domain not configured
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
              ref={turnstileRef}
              theme="dark"
            />
          </div>
        )}

        {isDev && (
          <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.3)', textAlign: 'center', margin: 0 }}>
            {turnstileSiteKey 
              ? 'Turnstile is disabled in development mode (localhost not configured in Cloudflare).'
              : 'Security verification is not configured. Please set VITE_TURNSTILE_SITE_KEY in your environment variables.'}
          </p>
        )}
      </form>
    </div>
  );
}

