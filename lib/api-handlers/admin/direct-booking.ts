import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyAdmin } from '../_admin-auth.js'
import { getSupabaseAdmin, siteOrigin } from '../_booking-payment-utils.js'
import { createStandaloneInvoice, ensureInvoicePaymentLink, InvoiceInputError } from '../_standalone-invoice.js'
import { OWNER_AFFILIATE_CODE, findAffiliateByCode, tieClientToReferrer } from '../affiliates/_referral-tie.js'
import { triggerInvoiceCommission } from '../affiliates/_commission-trigger.js'
import { sendTransactionalEmail } from '../_resend-email-handler.js'
import { EMAIL_STYLES, renderButton } from '../../email-template.js'

/**
 * "Someone booked directly" — a job taken by phone or email goes through the
 * same path as a website booking.
 *
 * POST /api/admin/direct-booking
 *
 * action "create" (default) — new job:
 *   { clientName, clientEmail, clientPhone?, description, eventDate?,
 *     lineItems: [{ description, quantity?, unit_price }],
 *     cost,                       — what the job costs us; profit = total - cost
 *     referrerCode?,              — referring affiliate's code
 *     referrerEmail? }            — or their email, if they are not an affiliate yet
 *   Creates the client + standalone invoice + Stripe link, records the cost,
 *   ties the client to the referrer. Sends nothing — the invoice goes out with
 *   /api/invoices/send. When Stripe settles it, the webhook runs the split.
 *
 * action "attach" — a job already invoiced (or already paid):
 *   { invoiceNumber, cost?, referrerCode? | referrerEmail?, adoptCommissionId? }
 *   Records cost + tie, and if the invoice is paid runs the split now.
 *   adoptCommissionId attaches a hand-entered commission instead of writing a
 *   second one. Returns the rows before and after.
 *
 * action "invite" — branded affiliate invite for a referrer:
 *   { referrerEmail, referrerName?, testEmail? }
 *   testEmail sends the same email to that address only, with no CC.
 */

const MEDIA_CC = 'media@thelostandunfounds.com'
const SITE = 'https://www.thelostandunfounds.com'

const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100

function parseCost(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) throw new InvoiceInputError('cost must be a number ≥ 0')
  return money(n)
}

async function recordJobCost(supabase: SupabaseClient, invoiceId: string, cost: number) {
  const { error } = await supabase.from('invoices').update({ job_cost: cost }).eq('id', invoiceId)
  // Without the column the split would treat the whole price as profit.
  if (error) throw new InvoiceInputError(`Could not record job cost: ${error.message}`, 500)
}

/**
 * A legacy affiliate with no upline gets the owner, as every new signup now
 * does — so MLM Level 1 has somewhere to go.
 */
async function ensureOwnerUpline(supabase: SupabaseClient, affiliateId: string) {
  const owner = await findAffiliateByCode(supabase, OWNER_AFFILIATE_CODE)
  if (!owner || owner.id === affiliateId) return
  await supabase.from('affiliates').update({ referred_by: owner.id }).eq('id', affiliateId).is('referred_by', null)
}

async function snapshot(supabase: SupabaseClient, invoiceId: string, clientEmail: string, affiliateId?: string) {
  const out: Record<string, any> = {}
  const { data: inv } = await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
  out.invoice = inv && {
    invoice_number: inv.invoice_number, status: inv.status, total: inv.total,
    job_cost: inv.job_cost ?? null, contractor_payout: inv.contractor_payout, paid_at: inv.paid_at,
  }
  const { data: tie } = await supabase
    .from('affiliate_customers').select('email, referred_by_affiliate_id, total_purchases, total_profit_generated')
    .ilike('email', clientEmail.replace(/[\\%_]/g, (m) => `\\${m}`)).maybeSingle()
  out.customer_tie = tie || null
  const { data: commissions } = await supabase
    .from('affiliate_commissions')
    .select('id, affiliate_id, order_id, amount, status, source, gross_amount, profit_generated, product_cost, available_date, paid_at')
    .eq('order_id', invoiceId)
  out.commissions = commissions || []
  const affId = affiliateId || tie?.referred_by_affiliate_id
  if (affId) {
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id, code, referred_by, total_earnings, total_conversions, reward_points, total_mlm_earnings')
      .eq('id', affId).maybeSingle()
    out.affiliate = aff || null
    if (aff?.referred_by) {
      const { data: up } = await supabase
        .from('affiliates').select('id, code, total_mlm_earnings').eq('id', aff.referred_by).maybeSingle()
      out.upline = up || null
    }
    const day = inv?.paid_at ? String(inv.paid_at).slice(0, 10) : null
    if (day) {
      const { data: km } = await supabase
        .from('king_midas_daily_stats').select('date, profit_generated')
        .eq('affiliate_id', affId).eq('date', day).maybeSingle()
      out.king_midas_day = km || { date: day, profit_generated: 0 }
    }
  }
  const ids = (commissions || []).map((c: any) => c.id)
  if (ids.length) {
    const [{ data: mlm }, { data: pts }, { data: santa }] = await Promise.all([
      supabase.from('mlm_earnings').select('affiliate_id, level, amount').in('commission_id', ids),
      supabase.from('reward_points_history').select('affiliate_id, points').in('commission_id', ids),
      supabase.from('secret_santa_contributions').select('amount').in('commission_id', ids),
    ])
    out.mlm_earnings = mlm || []
    out.reward_points = pts || []
    out.secret_santa = santa || []
  }
  return out
}

async function handleCreate(req: VercelRequest, supabase: SupabaseClient) {
  const body = req.body || {}
  const cost = parseCost(body.cost)
  if (cost === null) {
    // Without a cost every dollar reads as profit and the affiliate is overpaid.
    throw new InvoiceInputError('cost is required (0 if the job cost nothing)')
  }
  const origin = siteOrigin(req)
  const invoice = await createStandaloneInvoice(supabase, body, origin)
  if (cost > invoice.total) throw new InvoiceInputError('cost cannot exceed the invoice total')
  await recordJobCost(supabase, invoice.invoiceId, cost)

  let referral = null
  if (body.referrerCode || body.referrerEmail) {
    referral = await tieClientToReferrer(supabase, {
      clientId: invoice.clientId,
      clientEmail: invoice.clientEmail,
      affiliateCode: body.referrerCode,
      referrerEmail: body.referrerEmail,
    })
    if (referral.status === 'tied' || referral.status === 'already_tied') {
      await ensureOwnerUpline(supabase, referral.affiliateId)
    }
  }

  const paymentLink = await ensureInvoicePaymentLink(supabase, invoice.invoiceNumber, origin)
  return {
    ...invoice,
    jobCost: cost,
    profit: money(invoice.total - cost),
    paymentLink,
    referral,
    next: 'Send the invoice with /api/invoices/send. The split runs when Stripe settles it.',
  }
}

async function handleAttach(req: VercelRequest, supabase: SupabaseClient) {
  const body = req.body || {}
  if (!body.invoiceNumber) throw new InvoiceInputError('invoiceNumber is required')
  const { data: inv } = await supabase
    .from('invoices').select('*, clients(id, email)').eq('invoice_number', body.invoiceNumber).maybeSingle()
  if (!inv) throw new InvoiceInputError(`Invoice ${body.invoiceNumber} not found`, 404)
  if (inv.booking_id) {
    throw new InvoiceInputError(`${body.invoiceNumber} belongs to a booking; its commission runs on the booking`, 409)
  }
  const client = (inv as any).clients
  if (!client?.email) throw new InvoiceInputError(`${body.invoiceNumber} has no client email`, 409)

  const before = await snapshot(supabase, inv.id, client.email)

  const cost = parseCost(body.cost)
  if (cost !== null) {
    if (cost > Number(inv.total)) throw new InvoiceInputError('cost cannot exceed the invoice total')
    await recordJobCost(supabase, inv.id, cost)
  }

  let referral = null
  if (body.referrerCode || body.referrerEmail) {
    referral = await tieClientToReferrer(supabase, {
      clientId: client.id,
      clientEmail: client.email,
      affiliateCode: body.referrerCode,
      referrerEmail: body.referrerEmail,
    })
    if (referral.status === 'tied' || referral.status === 'already_tied') {
      await ensureOwnerUpline(supabase, referral.affiliateId)
    }
  }

  const commission = inv.status === 'paid'
    ? await triggerInvoiceCommission(supabase, inv.id, { adoptCommissionId: body.adoptCommissionId || null })
    : { triggered: false, reason: 'invoice_not_paid — the split runs when Stripe settles it' }

  const after = await snapshot(supabase, inv.id, client.email)
  return { invoiceNumber: inv.invoice_number, referral, commission, before, after }
}

async function handleInvite(req: VercelRequest) {
  const { referrerEmail, referrerName, testEmail } = (req.body || {}) as {
    referrerEmail?: string; referrerName?: string; testEmail?: string
  }
  if (!referrerEmail?.includes('@')) throw new InvoiceInputError('referrerEmail is required')
  const first = String(referrerName || '').trim().split(/\s+/)[0]
  const greeting = first ? `${first.replace(/[<>&"]/g, '')},` : 'Hi,'
  const link = `${SITE}/become-affiliate?ref=${OWNER_AFFILIATE_CODE}`

  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">THANK YOU FOR THE REFERRAL</h1>
    <p style="${EMAIL_STYLES.paragraph}">${greeting}</p>
    <p style="${EMAIL_STYLES.paragraph}">
      You sent a client our way, and we'd like to pay you for it. <strong>THE AFFILIATE PROGRAM</strong>
      pays 42% of the profit on every job from anyone you refer — for life, not just the first booking.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      Sign up with the button below. The client you already sent is credited to you as soon as your
      account exists, and payouts go straight to your bank through Stripe.
    </p>
    ${renderButton(link, 'JOIN THE AFFILIATE PROGRAM')}
  `
  const to = testEmail?.includes('@') ? testEmail : referrerEmail
  const result = await sendTransactionalEmail({
    to,
    subject: 'You referred a client — here’s your 42%',
    content,
    cc: testEmail ? undefined : MEDIA_CC,
  })
  return { sent: result.success, to, cc: testEmail ? null : MEDIA_CC, test: Boolean(testEmail), link, error: result.error }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  // The admin router gates this too; checked here so the route is never
  // reachable without it.
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const action = (req.body?.action as string) || 'create'
  try {
    const supabase = getSupabaseAdmin()
    if (action === 'create') return res.status(200).json(await handleCreate(req, supabase))
    if (action === 'attach') return res.status(200).json(await handleAttach(req, supabase))
    if (action === 'invite') return res.status(200).json(await handleInvite(req))
    return res.status(400).json({ error: `Unknown action ${action}` })
  } catch (err: any) {
    if (err instanceof InvoiceInputError) return res.status(err.status).json({ error: err.message })
    console.error('[direct-booking] failed:', err)
    return res.status(500).json({ error: err?.message || 'Direct booking failed' })
  }
}
