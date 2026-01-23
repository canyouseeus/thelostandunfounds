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
      // Handle the OAuth callback
      const { session, error } = await authService.handleAuthCallback();

      if (error) {
        console.warn('Auth callback error:', error);
        navigate('/?error=auth_failed');
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate('/');
        return;
      }

      setUser(currentUser);

      // Check for return URL immediately
      const returnUrl = localStorage.getItem('auth_return_url');

      // 1. Check if returning to setup wizard - ALWAYS prioritize this
      if (returnUrl?.startsWith('/setup')) {
        localStorage.removeItem('auth_return_url');
        navigate(returnUrl);
        return;
      }

      // 2. Check for admin status
      try {
        const adminStatus = await isAdmin();
        const isAdminUser = adminStatus || isAdminEmail(currentUser.email || '');

        if (isAdminUser) {
          navigate('/admin');
          return;
        }
      } catch (err) {
        console.warn('Admin check failed, falling back to basic checks', err);
        // Fall back to direct email check
        if (isAdminEmail(currentUser.email || '')) {
          navigate('/admin');
          return;
        }
      }

      // 3. Registration completeness checks for regular users
      const userMetadata = currentUser.user_metadata || {};
      const hasAuthorName = userMetadata.author_name;

      // Step A: Missing username
      if (!hasAuthorName) {
        setShowUserRegistrationModal(true);
        return;
      }

      // Step B: Missing subdomain
      try {
        const { data: subdomainData, error: subdomainError } = await supabase
          .from('user_subdomains')
          .select('subdomain')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (subdomainError) {
          console.error('Error checking subdomain:', subdomainError);
          // If table doesn't exist or other fatal DB error, don't block
          if (!subdomainError.message?.includes('does not exist') && !subdomainError.message?.includes('schema cache')) {
            // Unexpected error, proceed to dashboard
            navigate(returnUrl || '/dashboard');
            return;
          }
          // Table missing - show subdomain modal
          setShowSubdomainModal(true);
          return;
        }

        if (!subdomainData) {
          setShowSubdomainModal(true);
          return;
        }
      } catch (err) {
        console.warn('Subdomain check failed', err);
        // If we can't check subdomains, better to show the modal to be safe
        setShowSubdomainModal(true);
        return;
      }

      // 4. All complete - redirect to dashboard or return URL
      if (returnUrl) {
        localStorage.removeItem('auth_return_url');
        navigate(returnUrl);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth callback crash:', error);
      navigate('/?error=onboarding_error');
    }
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
    // Redirect to dashboard after subdomain registration
    const returnUrl = localStorage.getItem('auth_return_url');
    if (returnUrl) {
      localStorage.removeItem('auth_return_url');
      navigate(returnUrl);
    } else {
      navigate('/dashboard');
    }
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

