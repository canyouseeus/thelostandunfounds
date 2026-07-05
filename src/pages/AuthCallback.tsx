// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import { logSignupEvent } from '../utils/signupTelemetry';
import { LoadingOverlay } from '../components/Loading';

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

      const returnUrl = localStorage.getItem('auth_return_url');
      localStorage.removeItem('auth_return_url');

      // Admins always land on the admin dashboard, regardless of whatever page
      // triggered the login prompt (e.g. a private-gallery "please log in" modal
      // stores that gallery's URL as the return URL — an admin shouldn't get
      // bounced back there instead of into the console).
      try {
        const adminStatus = await isAdmin();
        const isAdminUser = adminStatus || isAdminEmail(currentUser.email || '');
        if (isAdminUser) {
          navigate('/admin');
          return;
        }
      } catch (err) {
        console.warn('Admin check failed, falling back to email check', err);
        if (isAdminEmail(currentUser.email || '')) {
          navigate('/admin');
          return;
        }
      }

      // Not an admin — route by return URL or default dashboard
      const validReturnUrl = returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/auth');
      navigate(validReturnUrl ? resolveReturnUrl(returnUrl) : '/dashboard');
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

  return <LoadingOverlay message="Completing sign in" />;
}
