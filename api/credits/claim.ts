import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// In-memory IP rate limit: max 5 claims per IP per hour
const ipLog: Map<string, number[]> = new Map()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const maxPerHour = 5
  const times = (ipLog.get(ip) || []).filter(t => now - t < windowMs)
  ipLog.set(ip, times)
  return times.length >= maxPerHour
}

function recordIp(ip: string) {
  const times = ipLog.get(ip) || []
  times.push(Date.now())
  ipLog.set(ip, times)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, newsletter, hp } = req.body

  // Bot protection: honeypot field filled = bot
  if (hp) {
    // Silent accept — don't reveal rejection
    return res.status(200).json({ credits_remaining: 100, is_new: true })
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const normalized = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalized)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0].trim() || 'unknown'

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check for existing record first
  const { data: existing } = await supabase
    .from('gallery_credits')
    .select('id, credits_remaining')
    .eq('email', normalized)
    .single()

  if (existing) {
    return res.status(200).json({
      credits_remaining: existing.credits_remaining,
      is_new: false
    })
  }

  // New email — grant 100 credits
  const { data: newRecord, error: insertError } = await supabase
    .from('gallery_credits')
    .insert({
      email: normalized,
      credits_remaining: 100,
      total_claimed: 100,
      last_claim_ip: ip
    })
    .select()
    .single()

  if (insertError) {
    // Race condition: another request inserted between our check and insert
    if (insertError.code === '23505') {
      const { data: retry } = await supabase
        .from('gallery_credits')
        .select('credits_remaining')
        .eq('email', normalized)
        .single()
      return res.status(200).json({ credits_remaining: retry?.credits_remaining ?? 0, is_new: false })
    }
    console.error('[Credits/Claim] Insert error:', insertError)
    return res.status(500).json({ error: 'Failed to claim credits' })
  }

  recordIp(ip)

  // Newsletter subscription (best-effort)
  if (newsletter) {
    const origin = req.headers.origin || `https://${req.headers.host}`
    fetch(`${origin}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized })
    }).catch(() => {})
  }

  return res.status(200).json({
    credits_remaining: newRecord.credits_remaining,
    is_new: true
  })
}
