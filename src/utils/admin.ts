/**
 * Admin Utilities
 * Functions to check admin status and manage admin users
 */

import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

/**
 * Admin status for UI gating, read from the user's `app_metadata`.
 *
 * `app_metadata` can only be written with the service role, so a user cannot
 * grant it to themselves. `user_metadata` (which this used to also accept) is
 * writable by any signed-in user from the browser, and checking the email
 * meant shipping the owner's login address in the public bundle. The admin
 * accounts carry `app_metadata.role = 'admin'`.
 *
 * This only decides what the UI shows. Every admin API route verifies the
 * session server-side (lib/api-handlers/_admin-auth.ts).
 */
export function isAdminUser(user: unknown): boolean {
  // Typed loosely: the app's own User types omit app_metadata, but the objects
  // Supabase hands back always carry it.
  const am = (user as { app_metadata?: Record<string, unknown> } | null | undefined)?.app_metadata || {};
  return am.role === 'admin' || am.is_admin === true;
}

/**
 * Switch the current browser session into the admin account.
 *
 * Uses the dev-only auto-login endpoint, which mints an admin session via
 * the service role key. This powers the role switcher so the owner can hop
 * from an affiliate test account back into admin without re-entering
 * credentials. Returns an error in production, where the endpoint is blocked.
 */
export async function elevateToAdminSession(): Promise<{ error: Error | null }> {
  try {
    const res = await fetch('/api/dev/auto-login', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any));
      return { error: new Error(body.error || 'Admin switch is only available in development') };
    }
    const data = await res.json();
    const { error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (error) return { error: error as Error };
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Check if current user is an admin. getUser() asks the auth server, so this
 * sees an app_metadata change even before the session token is refreshed.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;
    return isAdminUser(user);
  } catch (error) {
    console.warn('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get admin user by email
 */
export async function getAdminUser(email: string): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.warn('Error getting admin user:', error);
    return null;
  }
}

/**
 * Set user as admin (requires admin privileges)
 */
export async function setUserAsAdmin(userId: string, isAdmin: boolean): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        is_admin: isAdmin,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

