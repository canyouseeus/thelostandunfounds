// Unified Auth Context Provider
// Provides authentication state to all components

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, User, AuthSession } from '../services/auth';
import { subscriptionService, SubscriptionTier } from '../services/subscription';
import { autoPromoteToAdmin, isAdminEmail } from '../utils/admin';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  tier: SubscriptionTier;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectUrl?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshAuth: () => Promise<void>;
  clearAuthStorage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    console.log('AuthProvider mounted');
    initializeAuth();
    return () => console.log('AuthProvider unmounted');
  }, []);

  const initializeAuth = async () => {
    setLoading(true);
    try {
      // Check for existing session
      const { session: currentSession, error: sessionError } = await authService.getSession();

      if (sessionError) {
        if (import.meta.env.DEV) {
          console.warn('Session check failed:', sessionError);
        }
        // Clear any stale state
        setUser(null);
        setSession(null);
        setTier('free');
        setLoading(false);
        return;
      }

      // Validate session is still valid
      if (currentSession) {
        // Validate user exists first
        if (!currentSession.user || !currentSession.user.id) {
          // Invalid session, clear it
          if (import.meta.env.DEV) {
            console.warn('Session has no user, clearing auth state');
          }
          try {
            await authService.signOut();
          } catch (signOutError) {
            // Ignore sign out errors
          }
          setUser(null);
          setSession(null);
          setTier('free');
          setLoading(false);
          return;
        }

        // Check if session is expired (expires_at is Unix timestamp in seconds)
        try {
          const expiresAt = currentSession.expires_at;
          if (expiresAt && typeof expiresAt === 'number' && !isNaN(expiresAt)) {
            // Convert seconds to milliseconds and check expiration
            const expirationDate = new Date(expiresAt * 1000);
            const now = new Date();
            // Validate dates are valid
            if (!isNaN(expirationDate.getTime()) && !isNaN(now.getTime())) {
              // Add 5 minute buffer to account for clock skew
              if (expirationDate.getTime() < now.getTime() - 5 * 60 * 1000) {
                // Session expired, clear it
                if (import.meta.env.DEV) {
                  console.warn('Session expired, clearing auth state');
                }
                try {
                  await authService.signOut();
                } catch (signOutError) {
                  // Ignore sign out errors
                }
                setUser(null);
                setSession(null);
                setTier('free');
                setLoading(false);
                return;
              }
            }
          }
        } catch (expirationError) {
          // If expiration check fails, continue anyway (session might still be valid)
          if (import.meta.env.DEV) {
            console.warn('Error checking session expiration:', expirationError);
          }
        }

        setSession(currentSession);
        setUser(currentSession.user);

        // Auto-promote to admin if email matches admin email (on session restore)
        if (currentSession.user?.id && currentSession.user?.email && isAdminEmail(currentSession.user.email)) {
          try {
            await autoPromoteToAdmin(currentSession.user.id, currentSession.user.email);
          } catch (adminError) {
            // Silently fail - admin check will still work via email
          }
        }

        // Get subscription tier (with error handling)
        try {
          if (currentSession.user?.id) {
            const userTier = await subscriptionService.getTier(currentSession.user.id);
            setTier(userTier);
          } else {
            setTier('free');
          }
        } catch (tierError: any) {
          // Handle 403/406 errors gracefully - table might not exist yet
          const errorMsg = String(tierError?.message || '').toLowerCase();
          const errorStatus = tierError?.status || tierError?.statusCode;

          if (
            errorStatus === 403 ||
            errorStatus === 406 ||
            errorMsg.includes('403') ||
            errorMsg.includes('406') ||
            errorMsg.includes('does not exist') ||
            errorMsg.includes('permission denied') ||
            errorMsg.includes('forbidden') ||
            errorMsg.includes('network') ||
            errorMsg.includes('fetch')
          ) {
            // Silently default to free tier - this is expected if tables don't exist
            setTier('free');
          } else {
            if (import.meta.env.DEV) {
              console.warn('Failed to get subscription tier, defaulting to free:', tierError?.message || tierError);
            }
            setTier('free');
          }
        }
      } else {
        // No session found, ensure state is cleared
        setUser(null);
        setSession(null);
        setTier('free');
      }
    } catch (error: any) {
      // On error, clear state to be safe
      const errorMsg = String(error?.message || '').toLowerCase();

      // Don't log expected errors (network issues, etc.)
      if (
        !errorMsg.includes('network') &&
        !errorMsg.includes('fetch') &&
        !errorMsg.includes('403') &&
        !errorMsg.includes('406')
      ) {
        if (import.meta.env.DEV) {
          console.warn('Error initializing auth:', error);
        }
      }

      // Clear state to be safe
      setUser(null);
      setSession(null);
      setTier('free');
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    await initializeAuth();
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { user: newUser, error } = await authService.signUp(email, password);

      if (error) {
        return { error };
      }

      if (newUser) {
        setUser(newUser);

        // Auto-promote to admin if email matches admin email
        if (newUser?.id && newUser?.email && isAdminEmail(newUser.email)) {
          try {
            await autoPromoteToAdmin(newUser.id, newUser.email);
            if (import.meta.env.DEV) {
              console.log('Admin auto-promoted on signup:', newUser.email);
            }
          } catch (adminError) {
            console.warn('Failed to auto-promote admin on signup:', adminError);
            // Continue anyway - admin check will still work via email
          }
        }

        // Auto sign in after sign up
        try {
          const { session: newSession, error: signInError } = await authService.signIn(email, password);
          if (signInError) {
            console.warn('Auto sign-in failed after signup:', signInError);
            return { error: null }; // Still return success since signup worked
          }
          if (newSession) {
            setSession(newSession);
            try {
              if (newUser?.id) {
                const userTier = await subscriptionService.getTier(newUser.id);
                setTier(userTier);

                // Check if user is a blog contributor (has subdomain) and send notification
                try {
                  const { data: subdomainData } = await supabase
                    .from('user_subdomains')
                    .select('subdomain')
                    .eq('user_id', newUser.id)
                    .maybeSingle();

                  if (subdomainData?.subdomain) {
                    // Send notification email (fire and forget - don't block on email)
                    fetch('/api/admin/new-blog-contributor-notification', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userId: newUser.id,
                        subdomain: subdomainData.subdomain,
                        userEmail: newUser.email,
                      }),
                    }).catch((err) => {
                      console.warn('Failed to send blog contributor notification email:', err);
                    });
                  }
                } catch (subdomainErr) {
                  console.warn('Error checking for blog contributor subdomain:', subdomainErr);
                }
              } else {
                setTier('free');
              }
            } catch (tierError) {
              console.warn('Failed to get tier after signup:', tierError);
              setTier('free');
            }
          }
        } catch (signInErr) {
          console.warn('Error during auto sign-in:', signInErr);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { session: newSession, error } = await authService.signIn(email, password);

      if (error) {
        return { error };
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);

        // Auto-promote to admin if email matches admin email
        if (newSession.user?.id && newSession.user?.email && isAdminEmail(newSession.user.email)) {
          try {
            await autoPromoteToAdmin(newSession.user.id, newSession.user.email);
            if (import.meta.env.DEV) {
              console.log('Admin auto-promoted:', newSession.user.email);
            }
          } catch (adminError) {
            console.warn('Failed to auto-promote admin:', adminError);
            // Continue anyway - admin check will still work via email
          }
        }

        try {
          if (newSession.user?.id) {
            const userTier = await subscriptionService.getTier(newSession.user.id);
            setTier(userTier);
          } else {
            setTier('free');
          }
        } catch (tierError) {
          console.warn('Failed to get tier after sign-in:', tierError);
          setTier('free');
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async (redirectUrl?: string) => {
    try {
      const redirectTo = redirectUrl || `${window.location.origin}/auth/callback`;
      const { url, error } = await authService.signInWithGoogle(redirectTo);

      if (error) {
        return { error };
      }

      if (url) {
        // Redirect to Google OAuth
        window.location.href = url;
        return { error: null };
      }

      return { error: new Error('Failed to get OAuth URL') };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await authService.signOut();

      if (!error) {
        setUser(null);
        setSession(null);
        setTier('free');
      }

      return { error };
    } catch (error: any) {
      // Even if sign out fails, clear local state
      setUser(null);
      setSession(null);
      setTier('free');
      return { error: error as Error };
    }
  };

  const clearAuthStorage = async () => {
    try {
      await authService.clearAuthStorage();
      setUser(null);
      setSession(null);
      setTier('free');
      // Reload page to ensure all state is cleared
      window.location.reload();
    } catch (error: any) {
      // Even if clearing fails, clear local state and reload
      setUser(null);
      setSession(null);
      setTier('free');
      if (import.meta.env.DEV) {
        console.warn('Error clearing auth storage:', error);
      }
      // Still reload to ensure clean state
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        tier,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshAuth,
        clearAuthStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth failed: AuthContext is undefined. This usually means the component is not wrapped in AuthProvider.');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

