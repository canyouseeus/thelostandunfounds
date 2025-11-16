/**
 * Admin Utilities
 * Functions to check admin status and manage admin users
 */

import { supabase } from '../lib/supabase';

export const ADMIN_EMAIL = 'admin@thelostandunfounds.com';

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
  return email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if email matches admin email
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
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no row exists

    if (error) {
      // Log ALL errors so we can see what's wrong
      console.error('❌ Error querying user_roles:', {
        code: error.code,
        message: error.message,
        details: error,
      });
      
      const errorMsg = (error.message || '').toLowerCase();
      if (
        error.code === 'PGRST116' // No rows returned - this is OK
      ) {
        // No rows is fine - user just doesn't have a role entry yet
        return userMetadata.role === 'admin' || userMetadata.is_admin === true;
      }
      
      if (
        error.code === '42P01' || // Table doesn't exist
        errorMsg.includes('does not exist') ||
        errorMsg.includes('relation')
      ) {
        console.error('❌ Table "user_roles" does not exist! Run the SQL schema in Supabase.');
        return userMetadata.role === 'admin' || userMetadata.is_admin === true;
      }
      
      if (
        errorMsg.includes('permission denied') ||
        errorMsg.includes('policy') ||
        errorMsg.includes('403') ||
        errorMsg.includes('406')
      ) {
        console.error('❌ RLS policy blocking access to "user_roles". Check RLS policies in Supabase.');
        return userMetadata.role === 'admin' || userMetadata.is_admin === true;
      }
      
      // Unexpected error - log it but still check metadata
      return userMetadata.role === 'admin' || userMetadata.is_admin === true;
    }

    // If no data returned, check metadata
    if (!data) {
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
      // Check if it's a permission error (expected if RLS is blocking)
      const errorMsg = (roleError.message || '').toLowerCase();
      const errorCode = roleError.code || '';
      
      // Suppress expected errors (RLS blocking, table doesn't exist, etc.)
      if (
        errorCode === '42501' || // Permission denied
        errorCode === '42P01' || // Table doesn't exist
        errorCode === 'PGRST116' || // No rows returned
        errorMsg.includes('permission denied') ||
        errorMsg.includes('policy') ||
        errorMsg.includes('does not exist') ||
        errorMsg.includes('forbidden') ||
        errorMsg.includes('500') // Server error (might be RLS issue)
      ) {
        // Expected - RLS might be blocking or table doesn't exist yet
        // Continue to try metadata update
      } else {
        // Unexpected error - log it
        console.warn('Error setting admin role in user_roles table:', roleError);
      }
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
      .maybeSingle(); // Use maybeSingle to avoid errors when no row exists

    if (error) {
      // Suppress expected errors
      const errorMsg = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      if (
        errorCode === 'PGRST116' || // No rows returned
        errorCode === '42P01' || // Table doesn't exist
        errorMsg.includes('does not exist') ||
        errorMsg.includes('permission denied') ||
        errorMsg.includes('policy')
      ) {
        // Expected - return null silently
        return null;
      }
      // Unexpected error - log it
      console.warn('Error getting admin user:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.warn('Error getting admin user:', error);
    return null;
  }
}

/**
 * Set user as admin (requires admin privileges)
 */
export async function setUserAsAdmin(userId: string, isAdmin: boolean, email?: string): Promise<{ error: Error | null }> {
  try {
    // Get user email if not provided
    let userEmail = email;
    if (!userEmail) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userEmail = user?.email || '';
      } catch (emailError) {
        console.warn('Could not get user email:', emailError);
        userEmail = '';
      }
    }

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        email: userEmail?.toLowerCase().trim() || '',
        is_admin: isAdmin,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.warn('Error setting user as admin:', error);
      return { error: error as Error };
    }

    return { error: null };
  } catch (error) {
    console.warn('Error setting user as admin:', error);
    return { error: error as Error };
  }
}

