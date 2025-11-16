/**
 * Shared Supabase Client
 * 
 * Single instance to avoid multiple GoTrueClient warnings
 * and ensure all services use the same authenticated session.
 */

import { createClient } from '@supabase/supabase-js';

// Use Vite env vars in browser, process.env in Node
const SUPABASE_URL = typeof window !== 'undefined' 
  ? import.meta.env.VITE_SUPABASE_URL
  : (process.env.SUPABASE_URL);

const SUPABASE_ANON_KEY = typeof window !== 'undefined'
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (process.env.SUPABASE_ANON_KEY);

// Validate Supabase credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMsg = 'Supabase credentials must be set via environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY for server-side)';
  console.error('❌ Supabase Configuration Error:', errorMsg);
  if (typeof window === 'undefined') {
    throw new Error(errorMsg);
  }
  // In browser, log error but don't throw to prevent app crash
  // The app will handle missing Supabase gracefully
}

// Create single shared Supabase client instance with better error handling
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Helper function to ensure Supabase client is available
export function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please check your environment variables.');
  }
  return supabase;
}

// Log Supabase connection status (only in dev mode to reduce console noise)
if (typeof window !== 'undefined' && supabase && import.meta.env.DEV) {
  // Test connection on client side
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      // Only log if it's not a common expected error
      if (!error.message?.includes('session') && !error.message?.includes('not found')) {
        console.warn('⚠️ Supabase connection warning:', error.message);
      }
    } else {
      console.log('✅ Supabase client initialized successfully');
    }
  }).catch((err) => {
    // Only log unexpected errors
    if (!err.message?.includes('session') && !err.message?.includes('network')) {
      console.warn('⚠️ Supabase connection check failed:', err.message);
    }
  });
}

