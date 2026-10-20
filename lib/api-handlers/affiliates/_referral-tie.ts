import type { SupabaseClient } from '@supabase/supabase-js'

/** The owner's own affiliate code — the default upline for new affiliates. */
export const OWNER_AFFILIATE_CODE = 'THELOSTANDUNFOUNDS'

export interface AffiliateRow {
  id: string
  code: string
  user_id: string | null
  status: string | null
}

export async function findAffiliateByCode(supabase: SupabaseClient, code: string): Promise<AffiliateRow | null> {
  const c = code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]+$/.test(c)) return null
  const { data } = await supabase
    .from('affiliates')
    .select('id, code, user_id, status')
    .or(`code.eq.${c},affiliate_code.eq.${c}`)
    .maybeSingle()
  return (data as AffiliateRow) || null
}

/** The affiliate whose login email this is, if any. */
export async function findAffiliateByEmail(supabase: SupabaseClient, email: string): Promise<AffiliateRow | null> {
  const target = email.trim().toLowerCase()
  // The user base is small; one page covers it. A miss here only means the
  // referrer is treated as not-yet-an-affiliate, which is recoverable.
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = data?.users?.find((u) => u.email?.toLowerCase() === target)
  if (!user) return null
  const { data: aff } = await supabase
    .from('affiliates')
    .select('id, code, user_id, status')
    .eq('user_id', user.id)
    .maybeSingle()
  return (aff as AffiliateRow) || null
}

export type TieResult =
  | { status: 'tied'; affiliateId: string; code: string }
  | { status: 'already_tied'; affiliateId: string; code: string }
  | { status: 'tied_elsewhere'; affiliateId: string; code: string | null }
  | { status: 'pending_signup'; referrerEmail: string }
  | { status: 'not_found'; reason: string }

/**
 * Tie a client to the affiliate who referred them — the lifetime customer tie
 * the commission RPC reads (`affiliate_customers`), mirrored on the client row.
 *
 * A tie is for life: an existing tie to a different affiliate is reported,
 * never overwritten. A referrer who is not an affiliate yet is parked on
 * `clients.pending_referrer_email` and tied by attachPendingReferrals() when
 * they sign up.
 */
export async function tieClientToReferrer(
  supabase: SupabaseClient,
  args: { clientId: string; clientEmail: string; affiliateCode?: string | null; referrerEmail?: string | null }
): Promise<TieResult> {
  const email = args.clientEmail.trim().toLowerCase()

  let affiliate: AffiliateRow | null = null
  if (args.affiliateCode?.trim()) {
    affiliate = await findAffiliateByCode(supabase, args.affiliateCode)
    if (!affiliate) return { status: 'not_found', reason: `No affiliate with code ${args.affiliateCode.trim().toUpperCase()}` }
  } else if (args.referrerEmail?.trim()) {
    affiliate = await findAffiliateByEmail(supabase, args.referrerEmail)
  } else {
    return { status: 'not_found', reason: 'No referrer given' }
  }

  if (!affiliate) {
    const referrerEmail = args.referrerEmail!.trim().toLowerCase()
    const { error } = await supabase
      .from('clients')
      .update({ pending_referrer_email: referrerEmail, referral_source: 'direct_booking' })
      .eq('id', args.clientId)
    if (error) throw new Error(`Could not record pending referrer: ${error.message}`)
    return { status: 'pending_signup', referrerEmail }
  }
  if (affiliate.status && affiliate.status !== 'active') {
    return { status: 'not_found', reason: `Affiliate ${affiliate.code} is ${affiliate.status}` }
  }

  const { data: existing } = await supabase
    .from('affiliate_customers')
    .select('id, referred_by_affiliate_id')
    // Case-insensitive, but literal: `_` and `%` are wildcards to ILIKE.
    .ilike('email', email.replace(/[\\%_]/g, (m) => `\\${m}`))
    .maybeSingle()

  if (existing && existing.referred_by_affiliate_id !== affiliate.id) {
    const { data: other } = await supabase
      .from('affiliates')
      .select('code')
      .eq('id', existing.referred_by_affiliate_id)
      .maybeSingle()
    return { status: 'tied_elsewhere', affiliateId: existing.referred_by_affiliate_id, code: other?.code || null }
  }

  if (!existing) {
    const { error } = await supabase
      .from('affiliate_customers')
      .insert({ email, referred_by_affiliate_id: affiliate.id })
    if (error) throw new Error(`Could not tie customer: ${error.message}`)
  }

  await supabase
    .from('clients')
    .update({
      referred_by_affiliate_id: affiliate.id,
      referred_by_code: affiliate.code,
      referral_source: 'direct_booking',
      referral_recorded_at: new Date().toISOString(),
      pending_referrer_email: null,
    })
    .eq('id', args.clientId)

  return existing
    ? { status: 'already_tied', affiliateId: affiliate.id, code: affiliate.code }
    : { status: 'tied', affiliateId: affiliate.id, code: affiliate.code }
}
