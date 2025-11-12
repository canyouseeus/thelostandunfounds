/**
 * Unified Auth MCP Code API
 * 
 * Provides authentication services for the unified platform.
 * Can be used via MCP registry or directly.
 */

import { supabase } from '../../lib/supabase';

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session || !data.user) {
    throw new Error('Failed to create session');
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user,
    },
  };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string) {
  const redirectUrl = redirectTo || process.env.AUTH_REDIRECT_URL || 'http://localhost:5173/auth/callback';
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    url: data.url,
  };
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

/**
 * Get current user
 */
export async function getCurrentUser(accessToken?: string) {
  try {
    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error) {
        throw new Error(error.message);
      }
      return { user };
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null };
    }
    return { user };
  } catch (error) {
    // Handle errors gracefully - might be placeholder client or network issue
    console.warn('getCurrentUser error (non-critical):', error);
    return { user: null };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return { session: null };
    }

    return {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      },
    };
  } catch (error) {
    // Handle errors gracefully - might be placeholder client or network issue
    console.warn('getSession error (non-critical):', error);
    return { session: null };
  }
}

/**
 * Verify session token
 */
export async function verifySession(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return { valid: false, user: null };
  }

  return {
    valid: true,
    user,
  };
}

/**
 * Check if authenticated
 */
export async function isAuthenticated() {
  const { session } = await getSession();
  return { authenticated: !!session };
}

/**
 * Get Supabase client (for advanced usage)
 */
export function getSupabaseClient() {
  return supabase;
}

// Export types
export type User = {
  id: string;
  email?: string;
  [key: string]: any;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
};

