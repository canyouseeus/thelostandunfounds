// Unified Auth Service - Uses Direct Imports for Browser
// For server-side usage, use MCP registry pattern

import * as authTools from '../servers/auth/index';
import type { User, AuthSession } from '../servers/auth/index';

// Re-export types
export type { User, AuthSession };

export class UnifiedAuthService {
  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const result = await authTools.signUp(email, password);
      return { user: result.user as User, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ session: AuthSession | null; error: Error | null }> {
    try {
      const result = await authTools.signIn(email, password);
      return { session: result.session as AuthSession, error: null };
    } catch (error) {
      return { session: null, error: error as Error };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(redirectTo?: string): Promise<{ url: string | null; error: Error | null }> {
    try {
      const result = await authTools.signInWithGoogle(redirectTo);
      return { url: result.url, error: null };
    } catch (error) {
      return { url: null, error: error as Error };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await authTools.signOut();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const result = await authTools.getCurrentUser();
      return { user: result.user as User | null, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<{ session: AuthSession | null; error: Error | null }> {
    try {
      const result = await authTools.getSession();
      return { session: result.session as AuthSession | null, error: null };
    } catch (error) {
      return { session: null, error: error as Error };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleAuthCallback(): Promise<{ session: AuthSession | null; error: Error | null }> {
    return this.getSession();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { session } = await this.getSession();
    return !!session;
  }
  /**
   * Clear all auth cookies and storage
   */
  async clearAuthStorage(): Promise<void> {
    try {
      // Clear Supabase auth session
      const { supabase } = await import('../lib/supabase');
      await supabase.auth.signOut();
      
      // Clear all localStorage items related to Supabase
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear all sessionStorage items related to Supabase
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Clear cookies (document.cookie)
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        if (cookieName.includes('supabase') || cookieName.includes('auth') || cookieName.includes('sb-')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
        }
      });
    } catch (error) {
      console.warn('Error clearing auth storage:', error);
    }
  }
}

// Export singleton instance
export const authService = new UnifiedAuthService();

