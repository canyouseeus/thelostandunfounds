import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const RATE_LIMIT_PER_HOUR = 5
const FLAG_THRESHOLD = 10

function hashDedup(affiliateId: string, ip: string | null, ua: string | null): string {
  return createHash('sha256').update(`${affiliateId}|${ip || ''}|${ua || ''}`).digest('hex').slice(0, 32)
}

async function isRateLimited(
  supabase: SupabaseClient,
  affiliateId: string,
  ip: string | null
): Promise<boolean> {
  if (!ip) return false
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('affiliate_click_events')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', affiliateId)
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)

  if (error) {
    console.warn('[track-click] rate-limit query failed:', error.message)
    return false
  }
  return (count ?? 0) >= RATE_LIMIT_PER_HOUR
}

async function findExistingDedup(
  supabase: SupabaseClient,
  dedupHash: string
): Promise<boolean> {
  // Treat clicks within the last 5 minutes from same (affiliate, ip, ua) as duplicates.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('affiliate_click_events')
    .select('id', { count: 'exact', head: true })
    .eq('dedup_hash', dedupHash)
    .gte('created_at', fiveMinAgo)
  return (count ?? 0) > 0
}

async function logFraudEvent(
  supabase: SupabaseClient,
  affiliateId: string,
  eventType: string,
  ip: string | null,
  details: Record<string, any> = {},
  severity = 1
) {
  try {
    await supabase.from('affiliate_fraud_events').insert({
      affiliate_id: affiliateId,
      event_type: eventType,
      severity,
      ip_address: ip,
      details,
    })

    const { data: aff } = await supabase
      .from('affiliates')
      .select('fraud_score, is_flagged')
      .eq('id', affiliateId)
      .single()

    const newScore = (aff?.fraud_score || 0) + severity
    const updates: Record<string, any> = { fraud_score: newScore }
    if (newScore >= FLAG_THRESHOLD && !aff?.is_flagged) {
      updates.is_flagged = true
      updates.flag_reason = `Fraud score reached ${newScore} (last event: ${eventType})`
    }
    await supabase.from('affiliates').update(updates).eq('id', affiliateId)
  } catch (err: any) {
    console.warn('[track-click] fraud-log failed:', err?.message)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { affiliateCode, metadata } = req.body
    if (!affiliateCode || typeof affiliateCode !== 'string') {
      return res.status(400).json({ error: 'affiliateCode is required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[track-click] missing supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Resolve affiliate (try both code columns, case-insensitive)
    let affiliate: { id: string; is_flagged?: boolean | null } | null = null

    const { data: byCode } = await supabase
      .from('affiliates')
      .select('id, is_flagged')
      .ilike('code', affiliateCode)
      .eq('status', 'active')
      .maybeSingle()
    if (byCode) affiliate = byCode

    if (!affiliate) {
      const { data: byAffCode } = await supabase
        .from('affiliates')
        .select('id, is_flagged')
        .ilike('affiliate_code', affiliateCode)
        .eq('status', 'active')
        .maybeSingle()
      if (byAffCode) affiliate = byAffCode
    }

    if (!affiliate) {
      // Don't break user flow, but also don't 200 silently with a misleading body.
      return res.status(200).json({ success: true, message: 'Affiliate not found' })
    }

    if (affiliate.is_flagged) {
      // Stop counting clicks for flagged affiliates — admin needs to clear them first.
      return res.status(200).json({ success: true, message: 'Affiliate flagged; clicks ignored' })
    }

    const userAgent = (req.headers['user-agent'] as string) || null
    const forwarded = req.headers['x-forwarded-for'] as string | undefined
    const ipAddress =
      (forwarded?.split(',')[0]?.trim()) ||
      (req as any).socket?.remoteAddress ||
      null

    const dedupHash = hashDedup(affiliate.id, ipAddress, userAgent)

    // Rate limit (5 / IP / hour)
    const rateLimited = await isRateLimited(supabase, affiliate.id, ipAddress)
    // IP+UA dedup (5 minute window)
    const isDup = await findExistingDedup(supabase, dedupHash)

    const isSuspicious = rateLimited || isDup

    // Always log the event (with the suspicious flag) — useful for analytics
    await supabase.from('affiliate_click_events').insert({
      affiliate_id: affiliate.id,
      metadata: metadata || {},
      user_agent: userAgent,
      ip_address: ipAddress,
      dedup_hash: dedupHash,
      is_suspicious: isSuspicious,
      rate_limited: rateLimited,
    })

    if (rateLimited) {
      await logFraudEvent(
        supabase,
        affiliate.id,
        'click_rate_limit',
        ipAddress,
        { hourly_count: RATE_LIMIT_PER_HOUR + 1 },
        1
      )
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        rateLimited: true,
      })
    }

    if (isDup) {
      // Don't increment counter for an exact duplicate within 5 minutes; not a hard fraud signal
      return res.status(200).json({ success: true, deduped: true })
    }

    const { error: incrErr } = await supabase.rpc('increment_affiliate_clicks', {
      affiliate_id: affiliate.id,
    })
    if (incrErr) {
      console.error('[track-click] increment failed:', incrErr.message)
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('[track-click] error:', error?.message)
    // Soft-fail to avoid breaking the user's page load
    return res.status(200).json({ success: true, error: 'tracking failed' })
  }
}
