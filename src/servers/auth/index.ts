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
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  // Safely check for env var without throwing ReferenceError for process
  const envRedirect = typeof process !== 'undefined' ? process.env.AUTH_REDIRECT_URL : undefined;

  // If redirectTo is provided, use it. 
  // If env var is set, use it.
  // Otherwise, if we are on localhost, use origin/auth/callback (standard).
  // BUT if we want to rely on Supabase Site URL, we can pass undefined.
  // However, removing the default might break if Site URL is Prod.
  // Let's try adhering to the explicit behavior but logging it.
  const redirectUrl = redirectTo || envRedirect || `${origin}/auth/callback`;

  console.log('SignInWithGoogle Redirect:', redirectUrl); // Debug log (visible in browser)

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
  // Use scope: 'local' to only sign out current session (safer)
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
}

/**
 * Get current user
 */
export async function getCurrentUser(accessToken?: string) {
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
}

/**
 * Get current session
 */
export async function getSession() {
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

