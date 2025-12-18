/**
 * Admin Utilities
 * Functions to check admin status and manage admin users
 */

import { supabase } from '../lib/supabase';

export const ADMIN_EMAIL = 'admin@thelostandunfounds.com';
export const ADMIN_EMAIL_ALT = 'thelostandunfounds@gmail.com';

export interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

/**
 * Check if email matches admin email
 */
export function isAdminEmail(email: string): boolean {
  const normalizedEmail = email?.toLowerCase().trim();
  return normalizedEmail === ADMIN_EMAIL.toLowerCase() ||
    normalizedEmail === ADMIN_EMAIL_ALT.toLowerCase();
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError) {
      console.warn('Error getting user:', getUserError);
      return false;
    }

    if (!user) return false;

    // First check: email matches admin email (fastest check)
    if (isAdminEmail(user.email || '')) {
      return true;
    }

    // Second check: user metadata for admin role
    const userMetadata = user.user_metadata || {};
    if (userMetadata.role === 'admin' || userMetadata.is_admin === true || userMetadata.role === 'Admin') {
      return true;
    }

    const appMetadata = user.app_metadata || {};
    if (appMetadata.role === 'admin' || appMetadata.is_admin === true) {
      return true;
    }

    // Third check: user_roles table (with error handling)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no row

      if (error) {
        // If table doesn't exist or permission denied, fall back to metadata/email check
        if (error.code === '42P01' || error.code === 'PGRST301' || error.message?.includes('does not exist')) {
          // Table doesn't exist, use metadata/email check
          return userMetadata.role === 'admin' || userMetadata.is_admin === true || isAdminEmail(user.email || '');
        }
        // Other errors - log but don't fail
        console.warn('Error checking user_roles table:', error);
        return userMetadata.role === 'admin' || userMetadata.is_admin === true || isAdminEmail(user.email || '');
      }

      // If we got data and is_admin is true, return true
      if (data?.is_admin === true) {
        return true;
      }
    } catch (tableError: any) {
      // Table might not exist or other error - fall back to email/metadata check
      console.warn('Exception checking user_roles table:', tableError);
      return userMetadata.role === 'admin' || userMetadata.is_admin === true || isAdminEmail(user.email || '');
    }

    // Final fallback: email check (should have been caught above, but just in case)
    return isAdminEmail(user.email || '');
  } catch (error) {
    console.warn('Error checking admin status:', error);
    // On any error, try to get user email and check it
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        return isAdminEmail(user.email);
      }
    } catch (e) {
      // Ignore
    }
    return false;
  }
}

/**
 * Automatically promote user to admin if email matches admin email
 * This is called automatically on login
 */
export async function autoPromoteToAdmin(userId: string, email: string): Promise<{ error: Error | null }> {
  try {
    // Only promote if email matches admin email
    if (!isAdminEmail(email)) {
      return { error: null }; // Not an admin email, no action needed
    }

    // Set admin in user_roles table
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        is_admin: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (roleError) {
      console.warn('Error setting admin role in user_roles table:', roleError);
      // Continue anyway to try metadata update
    }

    // Also update user metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        role: 'admin',
        is_admin: true,
      },
    });

    if (metadataError) {
      console.warn('Error updating user metadata:', metadataError);
      // If role was set successfully, still return success
      if (!roleError) {
        return { error: null };
      }
      return { error: metadataError as Error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
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

