// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import SubdomainRegistration from '../components/SubdomainRegistration';
import UserRegistration from '../components/UserRegistration';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [showUserRegistrationModal, setShowUserRegistrationModal] = useState(false);
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      // Supabase's detectSessionInUrl automatically exchanges the PKCE code
      // when getSession() is first called. We must NOT call exchangeCodeForSession()
      // ourselves — both AuthContext.initializeAuth() and this handler call getSession(),
      // and a simultaneous explicit exchangeCodeForSession() causes "code already used"
      // errors that send the user to the homepage.
      //
      // Strategy:
      //   1. Call getSession() — in Supabase v2 this awaits the PKCE exchange.
      //   2. If no session yet (race with AuthContext), wait for onAuthStateChange.
      //   3. Then read the user and redirect.
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session && !sessionError) {
        // Exchange still in progress — wait for it via auth state change (8s timeout)
        session = await new Promise<typeof session>((resolve) => {
          let done = false;
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (!done) { done = true; subscription.unsubscribe(); resolve(s); }
          });
          setTimeout(() => {
            if (!done) { done = true; subscription.unsubscribe(); resolve(null); }
          }, 8000);
        });
      }

      if (sessionError || !session) {
        console.warn('Auth callback — no session:', sessionError?.message);
        navigate('/?error=auth_failed');
        return;
      }

      const currentUser = session.user;

      setUser(currentUser);

      // Check for return URL — honour it above everything else except /auth paths
      const returnUrl = localStorage.getItem('auth_return_url');
      const validReturnUrl = returnUrl && returnUrl !== '/' && !returnUrl.startsWith('/auth');

      // Registration completeness checks (run before redirect so new users
      // complete onboarding regardless of where they came from)
      const userMetadata = currentUser.user_metadata || {};
      const hasAuthorName = userMetadata.author_name;

      if (!hasAuthorName) {
        // New user — run through onboarding, then land on returnUrl or /dashboard
        setShowUserRegistrationModal(true);
        return;
      }

      // Existing user — go to return URL if we have one
      if (validReturnUrl) {
        localStorage.removeItem('auth_return_url');
        navigate(resolveReturnUrl(returnUrl));
        return;
      }

      // No return URL — route by role
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

  const handleUserRegistrationSuccess = (username: string) => {
    setShowUserRegistrationModal(false);

    // Check if we should continue to subdomain or redirect to setup
    const returnUrl = localStorage.getItem('auth_return_url');
    if (returnUrl?.startsWith('/setup')) {
      localStorage.removeItem('auth_return_url');
      navigate(returnUrl);
      return;
    }

    // Otherwise show subdomain registration modal (standard blog flow)
    setShowSubdomainModal(true);
  };

  const handleSubdomainSuccess = (subdomain: string) => {
    setShowSubdomainModal(false);
    const returnUrl = localStorage.getItem('auth_return_url');
    localStorage.removeItem('auth_return_url');
    navigate(resolveReturnUrl(returnUrl));
  };

  return (
    <>
      <UserRegistration
        isOpen={showUserRegistrationModal}
        onClose={() => {
          // Don't allow closing during required registration
          return;
        }}
        onSuccess={handleUserRegistrationSuccess}
        required={true}
        totalSteps={2}
        currentStep={1}
      />
      <SubdomainRegistration
        isOpen={showSubdomainModal}
        onClose={() => {
          // Don't allow closing if user doesn't have a subdomain
          if (user) {
            const checkSubdomain = async () => {
              const { data } = await supabase
                .from('user_subdomains')
                .select('subdomain')
                .eq('user_id', user.id)
                .single();
              if (!data) {
                return; // Don't allow closing
              }
            };
            checkSubdomain();
          }
        }}
        onSuccess={handleSubdomainSuccess}
        required={true}
        totalSteps={2}
        currentStep={2}
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

