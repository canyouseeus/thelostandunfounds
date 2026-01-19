// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import SubdomainRegistration from '../components/SubdomainRegistration';
import UserRegistration from '../components/UserRegistration';
import StorefrontRegistration from '../components/StorefrontRegistration';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [showUserRegistrationModal, setShowUserRegistrationModal] = useState(false);
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [showStorefrontModal, setShowStorefrontModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userSubdomain, setUserSubdomain] = useState<string | null>(null);

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

      if (session) {
        // Check if user is admin and redirect accordingly
        const checkAdminAndRedirect = async () => {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              setUser(currentUser);
              const adminStatus = await isAdmin();
              const isAdminUser = adminStatus || isAdminEmail(currentUser.email || '');

              if (isAdminUser) {
                // Admins go directly to admin dashboard
                navigate('/admin');
                return;
              }

              // Step 1: Check if user has username
              const userMetadata = currentUser.user_metadata || {};
              const hasAuthorName = userMetadata.author_name;

              // If missing username, show user registration modal first
              if (!hasAuthorName) {
                setShowUserRegistrationModal(true);
                return;
              }

              // Step 2: Check for subdomain
              const { data: subdomainData, error: subdomainError } = await supabase
                .from('user_subdomains')
                .select('subdomain')
                .eq('user_id', currentUser.id)
                .single();

              // Handle table not found error gracefully
              if (subdomainError) {
                if (subdomainError.code === 'PGRST116') {
                  // No rows returned - user doesn't have subdomain yet
                  setShowSubdomainModal(true);
                  return;
                } else if (subdomainError.message?.includes('does not exist') || subdomainError.message?.includes('schema cache')) {
                  // Table doesn't exist yet - show subdomain modal
                  console.warn('user_subdomains table not found. Please run the SQL migration script.');
                  setShowSubdomainModal(true);
                  return;
                } else {
                  console.error('Error checking subdomain:', subdomainError);
                }
              }

              if (!subdomainData) {
                // User doesn't have a subdomain - show registration modal
                setShowSubdomainModal(true);
                return;
              }

              // Step 3: Check for storefront ID (after subdomain is set)
              const hasStorefrontId = userMetadata.amazon_storefront_id;
              if (!hasStorefrontId) {
                setUserSubdomain(subdomainData.subdomain);
                setShowStorefrontModal(true);
                return;
              }

              // All registration complete - redirect
              const returnUrl = localStorage.getItem('auth_return_url');
              if (returnUrl) {
                localStorage.removeItem('auth_return_url');
                navigate(returnUrl);
              } else {
                navigate('/submit-article');
              }
            } else {
              const returnUrl = localStorage.getItem('auth_return_url');
              if (returnUrl) {
                localStorage.removeItem('auth_return_url');
                navigate(returnUrl);
              } else {
                navigate('/submit-article');
              }
            }
          } catch (error) {
            // If admin check fails, check email directly
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              setUser(currentUser);
              if (isAdminEmail(currentUser.email || '')) {
                navigate('/admin');
              } else {
                // Step 1: Check for username
                const userMetadata = currentUser.user_metadata || {};
                const hasAuthorName = userMetadata.author_name;

                if (!hasAuthorName) {
                  setShowUserRegistrationModal(true);
                  return;
                }

                // Step 2: Check for subdomain
                const { data: subdomainData } = await supabase
                  .from('user_subdomains')
                  .select('subdomain')
                  .eq('user_id', currentUser.id)
                  .single();

                if (!subdomainData) {
                  setShowSubdomainModal(true);
                  return;
                }

                // Step 3: Check for storefront ID
                const hasStorefrontId = userMetadata.amazon_storefront_id;
                if (!hasStorefrontId) {
                  setUserSubdomain(subdomainData.subdomain);
                  setShowStorefrontModal(true);
                  return;
                }

                // All complete - redirect
                const returnUrl = localStorage.getItem('auth_return_url');
                if (returnUrl) {
                  localStorage.removeItem('auth_return_url');
                  navigate(returnUrl);
                } else {
                  navigate('/submit-article');
                }
              }
            } else {
              const returnUrl = localStorage.getItem('auth_return_url');
              if (returnUrl) {
                localStorage.removeItem('auth_return_url');
                navigate(returnUrl);
              } else {
                navigate('/submit-article');
              }
            }
          }
        };
        checkAdminAndRedirect();
      } else {
        // No session - redirect to home
        navigate('/');
      }
    } catch (error) {
      console.warn('Auth callback error:', error);
      navigate('/?error=auth_failed');
    }
  };

  const handleUserRegistrationSuccess = (username: string) => {
    setShowUserRegistrationModal(false);
    // Now show subdomain registration modal
    setShowSubdomainModal(true);
  };

  const handleSubdomainSuccess = (subdomain: string) => {
    setUserSubdomain(subdomain);
    setShowSubdomainModal(false);
    // Now show storefront registration modal
    setShowStorefrontModal(true);
  };

  const handleStorefrontSuccess = (storefrontId: string) => {
    setShowStorefrontModal(false);
    const returnUrl = localStorage.getItem('auth_return_url');
    if (returnUrl) {
      localStorage.removeItem('auth_return_url');
      navigate(returnUrl);
    } else {
      navigate('/submit-article');
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
      />
      <StorefrontRegistration
        isOpen={showStorefrontModal}
        onClose={() => {
          // Don't allow closing during required registration
          return;
        }}
        onSuccess={handleStorefrontSuccess}
        subdomain={userSubdomain || ''}
        required={true}
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

