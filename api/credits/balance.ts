import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = req.query.email as string
  if (!email) {
    return res.status(400).json({ error: 'email is required' })
  }

  const normalized = email.trim().toLowerCase()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('gallery_credits')
    .select('credits_remaining')
    .eq('email', normalized)
    .single()

  return res.status(200).json({
    credits_remaining: data?.credits_remaining ?? 0
  })
}
