// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import { logSignupEvent } from '../utils/signupTelemetry';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      // If Supabase itself returned an error in the callback URL bail out immediately.
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error');
      if (urlError) {
        console.warn('[CB] Supabase returned error in callback URL:', urlError, urlParams.get('error_description'));
        logSignupEvent({
          stage: 'google_oauth_callback',
          success: false,
          method: 'google',
          intent: urlParams.get('intent') || undefined,
          error_message: `${urlError}: ${urlParams.get('error_description') || ''}`,
        });
        navigate('/?error=auth_failed');
        return;
      }

      // PKCE OAuth sessions are exchanged asynchronously. Subscribe first so we
      // don't miss SIGNED_IN if exchange completes immediately, then fast-path
      // check getSession() in parallel.
      const session = await new Promise<any>((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) { done = true; resolve(null); }
        }, 10000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
          if (!done && s) {
            done = true;
            clearTimeout(timer);
            subscription.unsubscribe();
            resolve(s);
          }
        });

        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (!done && s) {
            done = true;
            clearTimeout(timer);
            subscription.unsubscribe();
            resolve(s);
          }
        });
      });

      if (!session) {
        logSignupEvent({
          stage: 'google_oauth_callback',
          success: false,
          method: 'google',
          intent: urlParams.get('intent') || undefined,
          error_message: 'No session established within 10s of OAuth redirect (likely failed code exchange)',
        });
        navigate('/?error=auth_failed');
        return;
      }

      const currentUser = session.user;

      // Check for intent in the callback URL (e.g. ?intent=affiliate from Google OAuth)
      const intent = urlParams.get('intent');
      logSignupEvent({ stage: 'google_oauth_callback', success: true, method: 'google', email: currentUser.email, intent: intent || undefined });
      if (intent === 'affiliate') {
        navigate('/dashboard?join=affiliate');
        return;
      }

      // No special intent — route by return URL or role
      const returnUrl = localStorage.getItem('auth_return_url');
      const validReturnUrl = returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/auth');

      if (validReturnUrl) {
        localStorage.removeItem('auth_return_url');
        navigate(resolveReturnUrl(returnUrl));
        return;
      }

      try {
        const adminStatus = await isAdmin();
        const isAdminUser = adminStatus || isAdminEmail(currentUser.email || '');
        navigate(isAdminUser ? '/admin' : '/dashboard');
      } catch (err) {
        console.warn('Admin check failed, falling back to email check', err);
        navigate(isAdminEmail(currentUser.email || '') ? '/admin' : '/dashboard');
      }
    } catch (error) {
      console.error('Auth callback crash:', error);
      navigate('/?error=onboarding_error');
    }
  };

  /** Translate marketing/dead-end pages to the real post-login destination. */
  const resolveReturnUrl = (url: string | null): string => {
    if (!url || url === '/' || url.startsWith('/auth') || url.startsWith('/become-affiliate')) {
      return '/dashboard';
    }
    return url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
        <p className="text-gray-600">Please wait while we sign you in.</p>
      </div>
    </div>
  );
}
