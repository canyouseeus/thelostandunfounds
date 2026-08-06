import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lifetime referral attribution — the CRM side of it.
 *
 * `affiliate_customers` is the authority on who owns a customer for life, but
 * it is keyed on email alone and nothing in the CRM shows it. If that row is
 * ever lost, or the client books a second time under a different address, the
 * affiliate silently loses a customer they earned.
 *
 * So every path that turns a visitor into a client record also stamps the
 * referral onto `clients` — a second, human-readable copy an admin can see and
 * a commission run can fall back to. Attribution is written once and never
 * overwritten: a customer belongs to whoever brought them first.
 */

export interface ResolvedAffiliate {
  id: string
  code: string
}

/** Codes are stored uppercase; a link can carry any casing or stray spaces. */
export function normalizeAffiliateCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  if (!code || code.length > 32 || !/^[A-Z0-9_-]+$/.test(code)) return null
  return code
}

/**
 * Pull the affiliate code off a request: an explicit body field first, then the
 * `X-Affiliate-Ref` header the checkout paths already send.
 */
export function affiliateCodeFromRequest(req: {
  body?: any
  headers?: Record<string, any>
  query?: Record<string, any>
}): string | null {
  const header = req.headers?.['x-affiliate-ref']
  const candidates = [
    req.body?.affiliate_code,
    req.body?.affiliateRef,
    req.body?.ref,
    Array.isArray(header) ? header[0] : header,
    req.query?.ref,
  ]
  for (const c of candidates) {
    const code = normalizeAffiliateCode(c)
    if (code) return code
  }
  return null
}

/**
 * Look up an active, unflagged affiliate by either code column.
 *
 * A code that does not resolve is simply no referral — a booking is never
 * failed because someone mistyped a link.
 */
export async function resolveAffiliateByCode(
  supabase: SupabaseClient,
  rawCode: string | null | undefined
): Promise<ResolvedAffiliate | null> {
  const code = normalizeAffiliateCode(rawCode)
  if (!code) return null

  const { data, error } = await supabase
    .from('affiliates')
    .select('id, code, affiliate_code, status, is_flagged')
    .or(`code.eq.${code},affiliate_code.eq.${code}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[referral-attach] affiliate lookup failed:', error.message)
    return null
  }
  if (!data) return null
  if (data.status && data.status !== 'active') return null
  if (data.is_flagged) return null

  return { id: data.id, code: data.code || data.affiliate_code || code }
}

/**
 * Find the affiliate who already owns this email, via the lifetime tie table.
 */
export async function findExistingTie(
  supabase: SupabaseClient,
  email: string
): Promise<ResolvedAffiliate | null> {
  if (!email) return null

  const { data } = await supabase
    .from('affiliate_customers')
    .select('referred_by_affiliate_id, affiliates!affiliate_customers_referred_by_affiliate_id_fkey(code, affiliate_code)')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  const id = (data as any)?.referred_by_affiliate_id
  if (!id) return null
  const aff = (data as any)?.affiliates
  return { id, code: aff?.code || aff?.affiliate_code || '' }
}

/**
 * Create the lifetime `affiliate_customers` row if this email doesn't have one.
 * Returns the affiliate that owns the email afterwards — the pre-existing tie
 * wins, because attribution is first-touch and permanent.
 */
export async function ensureLifetimeTie(
  supabase: SupabaseClient,
  email: string,
  affiliate: ResolvedAffiliate,
  userId?: string | null
): Promise<ResolvedAffiliate> {
  const existing = await findExistingTie(supabase, email)
  if (existing) return existing

  const { error } = await supabase.from('affiliate_customers').insert({
    email: email.toLowerCase(),
    user_id: userId || null,
    referred_by_affiliate_id: affiliate.id,
  })
  if (error) {
    console.warn('[referral-attach] could not create lifetime tie:', error.message)
  }
  return affiliate
}

/**
 * Stamp the referral onto a CRM client row.
 *
 * Never overwrites an existing attribution, and never clears one — the update
 * is guarded on `referred_by_affiliate_id IS NULL` so a later booking with a
 * different (or missing) link cannot take a customer away from the affiliate
 * who brought them.
 */
export async function stampClientReferral(
  supabase: SupabaseClient,
  clientId: string,
  affiliate: ResolvedAffiliate,
  source: string
): Promise<boolean> {
  if (!clientId || !affiliate?.id) return false

  const { data, error } = await supabase
    .from('clients')
    .update({
      referred_by_affiliate_id: affiliate.id,
      referred_by_code: affiliate.code || null,
      referral_source: source,
      referral_recorded_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .is('referred_by_affiliate_id', null)
    .select('id')

  if (error) {
    console.warn('[referral-attach] could not stamp client:', error.message)
    return false
  }
  return (data?.length || 0) > 0
}

export interface AttachReferralInput {
  clientId: string
  email: string
  /** Code seen on this request (URL param, cookie, header) — may be absent. */
  affiliateCode?: string | null
  userId?: string | null
  /** Where the attribution came from, e.g. 'booking_request'. */
  source: string
}

export interface AttachReferralResult {
  attached: boolean
  affiliateId?: string
  affiliateCode?: string
  /** True when the referral was already on the client row. */
  alreadyAttributed?: boolean
  reason?: string
}

/**
 * The whole fallback in one call: resolve the code on the request, fall back to
 * the lifetime tie already on file, create the tie if it's missing, and mirror
 * the result onto the CRM record.
 *
 * Best-effort by design — every caller is a booking or checkout path that must
 * not fail because attribution didn't work out.
 */
export async function attachReferralToClient(
  supabase: SupabaseClient,
  input: AttachReferralInput
): Promise<AttachReferralResult> {
  const email = (input.email || '').toLowerCase().trim()
  if (!input.clientId || !email) return { attached: false, reason: 'missing_client_or_email' }

  try {
    // A client already carrying an attribution keeps it, full stop.
    const { data: client } = await supabase
      .from('clients')
      .select('referred_by_affiliate_id, referred_by_code')
      .eq('id', input.clientId)
      .maybeSingle()

    if (client?.referred_by_affiliate_id) {
      return {
        attached: false,
        alreadyAttributed: true,
        affiliateId: client.referred_by_affiliate_id,
        affiliateCode: client.referred_by_code || undefined,
        reason: 'already_attributed',
      }
    }

    // Prefer the tie on file (first touch) over the code on this request.
    let owner = await findExistingTie(supabase, email)
    let source = input.source

    if (!owner) {
      const fromLink = await resolveAffiliateByCode(supabase, input.affiliateCode)
      if (!fromLink) return { attached: false, reason: 'no_referral' }
      owner = await ensureLifetimeTie(supabase, email, fromLink, input.userId)
    } else {
      source = `${input.source}_from_lifetime_tie`
    }

    // A tie row can outlive the affiliates join; fill the code in if it's blank.
    if (owner && !owner.code) {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('code, affiliate_code')
        .eq('id', owner.id)
        .maybeSingle()
      owner = { id: owner.id, code: aff?.code || aff?.affiliate_code || '' }
    }

    const stamped = await stampClientReferral(supabase, input.clientId, owner, source)
    return {
      attached: stamped,
      affiliateId: owner.id,
      affiliateCode: owner.code || undefined,
      reason: stamped ? undefined : 'stamp_failed',
    }
  } catch (err: any) {
    console.warn('[referral-attach] failed:', err?.message)
    return { attached: false, reason: err?.message || 'error' }
  }
}
