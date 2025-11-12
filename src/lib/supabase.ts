/**
 * Shared Supabase Client
 * 
 * Single instance to avoid multiple GoTrueClient warnings
 * and ensure all services use the same authenticated session.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use Vite env vars in browser, process.env in Node
const SUPABASE_URL = typeof window !== 'undefined' 
  ? ((import.meta as any).env?.VITE_SUPABASE_URL)
  : (process.env.SUPABASE_URL);

const SUPABASE_ANON_KEY = typeof window !== 'undefined'
  ? ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  : (process.env.SUPABASE_ANON_KEY);

// Create a safe client that won't crash if env vars aren't set
// This prevents Cursor from crashing during code analysis
let supabase: SupabaseClient;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Use placeholder values for development/analysis to prevent crashes
  // Actual usage will fail gracefully with clear error messages
  const placeholderUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
  const placeholderKey = SUPABASE_ANON_KEY || 'placeholder-key';
  
  // Only warn in development, don't throw
  if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    console.warn('⚠️ Supabase credentials not set. Using placeholder client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  }
  
  supabase = createClient(placeholderUrl, placeholderKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'apikey': placeholderKey,
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
  });
} else {
  // Create single shared Supabase client instance with real credentials
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: true,
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
  });
}

export { supabase };

