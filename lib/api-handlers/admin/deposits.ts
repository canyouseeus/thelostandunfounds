import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getStripe } from '../_booking-payment-utils.js'
import { verifyAdmin } from '../_admin-auth.js'
import { stripeMoneyKey, explainMoneyKeyError } from '../_stripe-money-key.js'

/**
 * Deposit check-in — /api/admin/deposits
 *
 * GET                                  → sync, then every outside deposit + which are unsorted
 * POST { id, category: 'invoice' | 'street' } → tag one (or re-tag it, if the wrong button was hit)
 * POST { id, retryPay: true }          → re-queue a FAILED 10% pay (never one that sent money)
 *
 * Money from outside Stripe (Venmo / Cash App cashouts) lands in the business
 * financial account as a Treasury "received credit" by bank transfer. The site
 * cannot tell what it was for, so the owner says:
 *
 *   invoice → money for a job already recorded as an invoice payment. It is
 *             NOT counted again; the invoice payment is the revenue.
 *   street  → walk-up money with no other record. Counted as street revenue
 *             (revenue-summary, the admin Street tile, the calendar recap).
 *
 * Unsorted deposits count as nothing until tagged. Only bank transfers are
 * synced: balance transfers between the platform's own accounts and card
 * refunds are moves, not income, and the bank's account-verification
 * micro-deposits (ACCTVERIFY) are not money anyone paid.
 *
 * Owner decision, 2026-11-04: 10% of EVERY outside deposit — invoice or
 * street — goes to the owner's Stripe Connect account (where it is DCA'd into
 * bitcoin), through the same `owner_pay` admin job a street night queues. It
 * is queued once, on the deposit's first tag, keyed to the deposit; switching
 * the tag later changes only how the money is counted, never the pay.
 */

export const BUSINESS_FINANCIAL_ACCOUNT = 'fa_65UbOiP49XIyCjVLt9w16UbOGOJESQ1Wd0tevkXEB3w5km'
const STRIPE_VERSION = '2026-09-30.preview'
const CATEGORIES = ['invoice', 'street'] as const
const SELECT = 'id, stripe_credit_id, amount_cents, received_at, descriptor, sender, category, classified_at, owner_pay_cents, owner_pay_job_id, pay:owner_pay_job_id ( status, error )'
export const DEPOSIT_OWNER_PAY_RATE = 0.10

/**
 * Queue the owner's 10% for a deposit, once. The idempotency key means a
 * second call (a re-tag, a retry, two tabs) finds the first job, not a new one.
 */
async function queueOwnerPay(supabase: SupabaseClient, deposit: { id: string; amount_cents: number; received_at: string; descriptor: string | null; owner_pay_job_id: string | null }) {
  if (deposit.owner_pay_job_id) return
  const cents = Math.round(deposit.amount_cents * DEPOSIT_OWNER_PAY_RATE)
  if (cents <= 0) return
  const key = `deposit-pay-${deposit.id}`
  const { data: existing } = await supabase.from('admin_jobs').select('id').eq('idempotency_key', key).maybeSingle()
  let jobId = existing?.id as string | undefined
  if (!jobId) {
    const { data: job, error } = await supabase
      .from('admin_jobs')
      .insert({
        action: 'owner_pay',
        payload: { depositId: deposit.id, amount: cents / 100 },
        requested_by: 'deposit-checkin',
        note: `Owner pay 10%, deposit ${deposit.received_at.slice(0, 10)}${deposit.descriptor ? ` (${deposit.descriptor})` : ''}`,
        idempotency_key: key,
      })
      .select('id')
      .single()
    if (error) throw new Error(`Tagged, but the 10% could not be queued: ${error.message}`)
    jobId = job.id
  }
  const { error: linkError } = await supabase
    .from('deposit_checkins').update({ owner_pay_job_id: jobId, owner_pay_cents: cents }).eq('id', deposit.id)
  if (linkError) throw new Error(linkError.message)
}

interface ReceivedCredit {
  id: string
  amount: { value: number; currency: string }
  bank_transfer?: { statement_descriptor?: string; originating_bank_account?: { aba?: { account_holder_name?: string } } }
  created: string
  description?: string
  financial_account: string
  status: string
  type: string
}

/** Received credits into the business account, newest first. */
async function listReceivedCredits(): Promise<ReceivedCredit[]> {
  const key = stripeMoneyKey()
  const out: ReceivedCredit[] = []
  let url: string | null =
    `https://api.stripe.com/v2/money_management/received_credits?limit=50&financial_account=${BUSINESS_FINANCIAL_ACCOUNT}`
  // A few pages is months of deposits; stop there rather than walk all history every load.
  for (let page = 0; url && page < 4; page++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, 'Stripe-Version': STRIPE_VERSION } })
    const body: any = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(explainMoneyKeyError(body?.error?.message || String(res.status)))
    out.push(...(body.data ?? []))
    url = body.next_page_url ? `https://api.stripe.com${body.next_page_url}` : null
  }
  return out
}

/** An outside deposit worth asking about. */
export function isOutsideDeposit(c: ReceivedCredit): boolean {
  if (c.type !== 'bank_transfer' || c.status !== 'succeeded') return false
  if (c.financial_account !== BUSINESS_FINANCIAL_ACCOUNT) return false
  if (c.amount?.currency !== 'usd' || !(c.amount.value > 0)) return false
  const descriptor = c.bank_transfer?.statement_descriptor || c.description || ''
  return !/ACCTVERIFY/i.test(descriptor)
}

/** Store any deposit not seen before. Never touches a row's category. */
export async function syncDeposits(supabase: SupabaseClient): Promise<number> {
  const credits = (await listReceivedCredits()).filter(isOutsideDeposit)
  if (!credits.length) return 0
  const { data: known, error } = await supabase
    .from('deposit_checkins').select('stripe_credit_id').in('stripe_credit_id', credits.map(c => c.id))
  if (error) throw new Error(error.message)
  const seen = new Set((known ?? []).map(k => k.stripe_credit_id))
  const fresh = credits.filter(c => !seen.has(c.id)).map(c => ({
    stripe_credit_id: c.id,
    financial_account: c.financial_account,
    amount_cents: c.amount.value,
    received_at: c.created,
    descriptor: c.bank_transfer?.statement_descriptor || c.description || null,
    sender: c.bank_transfer?.originating_bank_account?.aba?.account_holder_name || null,
  }))
  if (!fresh.length) return 0
  const { error: insertError } = await supabase
    .from('deposit_checkins').upsert(fresh, { onConflict: 'stripe_credit_id', ignoreDuplicates: true })
  if (insertError) throw new Error(insertError.message)
  return fresh.length
}

/**
 * Re-queue a deposit's failed 10% pay. Refused unless the job failed and no
 * transfer went out; a top-up already on file is kept unless Stripe says it
 * failed, so a retry can never fund the same pay twice.
 */
async function retryOwnerPay(supabase: SupabaseClient, id: string) {
  const { data: dep, error } = await supabase
    .from('deposit_checkins').select('id, owner_pay_job_id, owner_pay_topup_id').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!dep?.owner_pay_job_id) return 'This deposit has no 10% pay to retry'
  const { data: job, error: jobError } = await supabase
    .from('admin_jobs').select('id, status, result').eq('id', dep.owner_pay_job_id).single()
  if (jobError) throw new Error(jobError.message)
  if (job.status !== 'failed') return `The 10% pay is ${job.status}, not failed`
  if ((job.result as any)?.transferId) return 'The 10% pay already sent'
  if (dep.owner_pay_topup_id) {
    const topup = await getStripe().topups.retrieve(dep.owner_pay_topup_id)
    if (!['failed', 'canceled', 'reversed'].includes(topup.status)) {
      // Money is already moving for this pay; just let the job wait on it.
    } else {
      const { error: clearError } = await supabase
        .from('deposit_checkins').update({ owner_pay_topup_id: null }).eq('id', id)
      if (clearError) throw new Error(clearError.message)
    }
  }
  const { error: requeueError } = await supabase
    .from('admin_jobs')
    .update({ status: 'queued', error: null, http_status: null, finished_at: null, not_before: new Date().toISOString(), created_at: new Date().toISOString() })
    .eq('id', job.id).eq('status', 'failed')
  if (requeueError) throw new Error(requeueError.message)
  return null
}

export async function listDeposits(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('deposit_checkins').select(SELECT).order('received_at', { ascending: false })
  if (error) throw new Error(error.message)
  const deposits = data ?? []
  const total = (cat: string | null) =>
    deposits.filter(d => d.category === cat).reduce((n, d) => n + d.amount_cents, 0)
  return {
    deposits,
    pending: deposits.filter(d => !d.category),
    totals: { invoiceCents: total('invoice'), streetCents: total('street'), unsortedCents: total(null) },
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })
  const supabase = getSupabaseAdmin()
  try {
    if (req.method === 'GET') {
      // A Stripe hiccup must not hide what is already stored.
      let synced = 0
      let syncError: string | null = null
      try { synced = await syncDeposits(supabase) } catch (e: any) { syncError = e?.message || 'sync failed' }
      return res.status(200).json({ ...(await listDeposits(supabase)), synced, syncError })
    }
    if (req.method === 'POST') {
      const { id, category, retryPay } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id is required' })
      if (retryPay) {
        const refused = await retryOwnerPay(supabase, id)
        if (refused) return res.status(409).json({ error: refused })
        const { data: fresh, error: reloadError } = await supabase.from('deposit_checkins').select(SELECT).eq('id', id).single()
        if (reloadError) throw new Error(reloadError.message)
        return res.status(200).json({ deposit: fresh })
      }
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'category must be invoice or street' })
      const { data, error } = await supabase
        .from('deposit_checkins')
        .update({ category, classified_at: new Date().toISOString() })
        .eq('id', id)
        .select(SELECT)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return res.status(404).json({ error: 'Deposit not found' })
      // Invoice money's 10% now comes from that job's profit split
      // (queueOwnerCut in _commission-trigger), so only street money pays here.
      if (data.category === 'street') await queueOwnerPay(supabase, data as any)
      const { data: fresh, error: reloadError } = await supabase.from('deposit_checkins').select(SELECT).eq('id', id).single()
      if (reloadError) throw new Error(reloadError.message)
      return res.status(200).json({ deposit: fresh })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('[deposits] failed:', err)
    return res.status(500).json({ error: err?.message || 'Deposit request failed' })
  }
}
