// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { supabase } from '../lib/supabase';
import { isAdminEmail, isAdmin } from '../utils/admin';

export default function AuthCallback() {
  const navigate = useNavigate();

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
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const adminStatus = await isAdmin();
              if (adminStatus || isAdminEmail(user.email || '')) {
                navigate('/admin');
              } else {
                navigate('/submit-article');
              }
            } else {
              navigate('/submit-article');
            }
          } catch (error) {
            // If admin check fails, check email directly
            const { data: { user } } = await supabase.auth.getUser();
            if (user && isAdminEmail(user.email || '')) {
              navigate('/admin');
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

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
        <p className="text-gray-600">Please wait while we sign you in.</p>
      </div>
    </div>
  );
}

