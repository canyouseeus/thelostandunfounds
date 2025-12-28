import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ServiceSupabaseClient = SupabaseClient<any, 'public', any>

export function createServiceSupabaseClient(): ServiceSupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role credentials are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
