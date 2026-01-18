import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Explicitly load .env.local for local dev where Vercel might miss secrets
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch (e) {
  // Ignore error if file doesn't exist (e.g. production)
}

export type ServiceSupabaseClient = SupabaseClient<any, 'public', any>

export function createServiceSupabaseClient(): ServiceSupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase Admin Client Error: Missing Credentials', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    })
    const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
    throw new Error(`Supabase service role credentials are not configured. Available SUPABASE env vars: [${envKeys}]`)
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
