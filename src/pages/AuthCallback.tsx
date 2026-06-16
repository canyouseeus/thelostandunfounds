// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import AffiliateSignupWizard from '../components/affiliate/AffiliateSignupWizard';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [showAffiliateWizard, setShowAffiliateWizard] = useState(false);

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
        navigate('/?error=auth_failed');
        return;
      }

      const currentUser = session.user;

      // Check if user arrived here with an affiliate signup intent
      const signupIntent = localStorage.getItem('signup_intent');
      if (signupIntent === 'affiliate') {
        // Verify they don't already have an affiliate account
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id, code')
          .eq('user_id', currentUser.id)
          .single();

        if (existingAffiliate) {
          // Already an affiliate — skip wizard and go to dashboard
          localStorage.removeItem('signup_intent');
          localStorage.removeItem('auth_return_url');
          navigate('/dashboard');
          return;
        }

        // Show affiliate signup wizard
        setShowAffiliateWizard(true);
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

  const handleAffiliateWizardSuccess = (_code: string) => {
    localStorage.removeItem('signup_intent');
    localStorage.removeItem('auth_return_url');
    // Stripe onboarding redirect happens inside the wizard; this is a fallback
    setShowAffiliateWizard(false);
    navigate('/dashboard');
  };

  return (
    <>
      <AffiliateSignupWizard
        isOpen={showAffiliateWizard}
        onSuccess={handleAffiliateWizardSuccess}
      />

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
          <p className="text-gray-600">Please wait while we sign you in.</p>
        </div>
      </div>
    </>
  );
}
