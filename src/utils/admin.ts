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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if email matches admin email (including thelostandunfounds@gmail.com)
    if (isAdminEmail(user.email || '')) {
      return true;
    }

    // Check user metadata for admin role
    const userMetadata = user.user_metadata || {};
    if (userMetadata.role === 'admin' || userMetadata.is_admin === true) {
      return true;
    }

    // Also check in user_roles table if it exists
    const { data, error } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Table might not exist yet, check metadata only
      return userMetadata.role === 'admin' || userMetadata.is_admin === true;
    }

    return data?.is_admin === true;
  } catch (error) {
    console.warn('Error checking admin status:', error);
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

