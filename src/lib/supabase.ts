/**
 * Shared Supabase Client
 * 
 * Single instance to avoid multiple GoTrueClient warnings
 * and ensure all services use the same authenticated session.
 */

import { createClient } from '@supabase/supabase-js';

// Use Vite env vars in browser, process.env in Node
const SUPABASE_URL = typeof window !== 'undefined' 
  ? ((import.meta as any).env?.VITE_SUPABASE_URL)
  : (process.env.SUPABASE_URL);

const SUPABASE_ANON_KEY = typeof window !== 'undefined'
  ? ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  : (process.env.SUPABASE_ANON_KEY);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials must be set via environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY for server-side)');
}

// Create single shared Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

