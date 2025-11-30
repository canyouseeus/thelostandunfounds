// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';
import SubdomainRegistration from '../components/SubdomainRegistration';

export default function AuthCallback() {
  const navigate = useNavigate();
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

              // For regular users, check if they have a subdomain
              const { data: subdomainData, error: subdomainError } = await supabase
                .from('user_subdomains')
                .select('subdomain')
                .eq('user_id', currentUser.id)
                .single();

              if (subdomainError && subdomainError.code !== 'PGRST116') {
                console.error('Error checking subdomain:', subdomainError);
              }

              if (!subdomainData) {
                // User doesn't have a subdomain - show registration modal
                setShowSubdomainModal(true);
              } else {
                // User has subdomain - redirect to submit article
                navigate('/submit-article');
              }
            } else {
              navigate('/submit-article');
            }
          } catch (error) {
            // If admin check fails, check email directly
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              setUser(currentUser);
              if (isAdminEmail(currentUser.email || '')) {
                navigate('/admin');
              } else {
                // Check for subdomain
                const { data: subdomainData } = await supabase
                  .from('user_subdomains')
                  .select('subdomain')
                  .eq('user_id', currentUser.id)
                  .single();

                if (!subdomainData) {
                  setShowSubdomainModal(true);
                } else {
                  navigate('/submit-article');
                }
              }
            } else {
              navigate('/submit-article');
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

  const handleSubdomainSuccess = (subdomain: string) => {
    setShowSubdomainModal(false);
    navigate('/submit-article');
  };

  return (
    <>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
          <p className="text-gray-600">Please wait while we sign you in.</p>
        </div>
      </div>
    </>
  );
}

