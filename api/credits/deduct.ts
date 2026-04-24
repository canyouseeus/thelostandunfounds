import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, count } = req.body

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' })
  }

  if (typeof count !== 'number' || count < 1 || !Number.isInteger(count)) {
    return res.status(400).json({ error: 'count must be a positive integer' })
  }

  const normalized = email.trim().toLowerCase()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc('deduct_gallery_credits', {
    p_email: normalized,
    p_count: count
  })

  if (error) {
    console.error('[Credits/Deduct] RPC error:', error)
    return res.status(500).json({ error: 'Failed to deduct credits', details: error.message })
  }

  if (!data || data.success === false) {
    return res.status(402).json({
      error: 'Insufficient credits',
      credits_remaining: data?.credits_remaining ?? 0
    })
  }

  return res.status(200).json({
    success: true,
    credits_remaining: data.credits_remaining
  })
}
