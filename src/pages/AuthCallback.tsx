// OAuth Callback Page
// Handles Google OAuth redirects

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

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
        // Success - redirect to dashboard
        navigate('/tools');
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

