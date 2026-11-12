import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe } from '../_booking-payment-utils.js'
import { createStandaloneInvoice, ensureInvoicePaymentLink } from '../_standalone-invoice.js'
import { sendInvoiceEmail } from '../_invoice-send.js'
import { recordInvoicePayment } from '../_record-invoice-payment.js'
import { createDirectBooking, attachDirectBooking, sendReferrerInvite } from './direct-booking.js'
import requestPayout from '../affiliates/request-payout.js'
import { recordFieldSale } from './field-sales.js'
import { OWNER_AFFILIATE_CODE, findAffiliateByCode } from '../affiliates/_referral-tie.js'
import { getZohoAuthContext } from '../_zoho-email-utils.js'
import { sendPhotographerInvite } from './photographer-invite.js'
import { sendGalleryInvites } from '../_gallery-invite.js'
import { ADMIN_EMAILS } from '../_admin-auth.js'
import { stripeMoneyKey } from '../_stripe-money-key.js'
import { MAIL_JOB_ACTIONS } from './_mail-jobs.js'

/**
 * The admin actions an agent may queue in `admin_jobs` (see the migration and
 * CLAUDE.md "ADMIN WORK RULE"). Each calls the same function the admin panel's
 * route calls — one implementation per action, no HTTP round-trip, and no
 * change to the admin auth check.
 *
 * Adding an action is a code change reviewed in a PR, on purpose: the table
 * can only ask for what is listed here.
 */

const SITE = 'https://www.thelostandunfounds.com'
const MEDIA_CC = 'media@thelostandunfounds.com'

export interface JobOutcome {
  /** done | failed | waiting_funds */
  status: 'done' | 'failed' | 'waiting_funds'
  httpStatus?: number
  result?: unknown
  error?: string
  /** For waiting_funds: when to look again. */
  retryAt?: string
}

type Action = (supabase: SupabaseClient, payload: Record<string, any>, jobId: string) => Promise<JobOutcome>

/**
 * The platform's own Stripe financial accounts — the only places move_funds
 * can send money. Named so a job says where it means, not a pasted id.
 */
const FINANCIAL_ACCOUNTS: Record<string, string> = {
  business: 'fa_65UbOiP49XIyCjVLt9w16UbOGOJESQ1Wd0tevkXEB3w5km',
  king_midas: 'fa_65Vc0ZpAuxheTRvd98q16UbOGOJESQ1Wd0tevkXEB3wDSi',
  secret_santa: 'fa_65Vc0ZPs07Y7q1ibQPv16UbOGOJESQ1Wd0tevkXEB3wOEa',
  affiliate_pay: 'fa_65Vc0aUTLSwK4YumRSn16UbOGOJESQ1Wd0tevkXEB3wPCa',
}

const ok = (result: unknown, httpStatus = 200): JobOutcome => ({ status: 'done', httpStatus, result })
const fail = (error: string, httpStatus?: number, result?: unknown): JobOutcome => ({
  status: 'failed', httpStatus, error, result,
})

/**
 * Top up the Payments balance from the business financial account to cover a
 * deposit's owner pay — at most once per deposit. Returns the top-up (new or
 * the one already on file). Throws if Stripe refuses, so the job fails with
 * the reason instead of waiting three days for money that is not coming.
 */
async function fundDepositPay(
  supabase: SupabaseClient, depositId: string, cents: number, jobId: string
): Promise<{ id: string; status: string }> {
  const { data: deposit, error } = await supabase
    .from('deposit_checkins').select('id, owner_pay_topup_id').eq('id', depositId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!deposit) throw new Error(`Deposit ${depositId} not found`)
  const stripe = getStripe()
  if (deposit.owner_pay_topup_id) {
    const existing = await stripe.topups.retrieve(deposit.owner_pay_topup_id)
    if (!['failed', 'canceled', 'reversed'].includes(existing.status)) return { id: existing.id, status: existing.status }
    throw new Error(`Top-up ${existing.id} for this deposit ${existing.status}; not retrying automatically`)
  }
  // `source` must name the business financial account. Left out, Stripe pulls
  // the top-up from the platform's default external bank account instead —
  // which failed with "default usd bank account has not been verified" on
  // 2026-11-04, though the money was sitting in the financial account.
  const topup = await stripe.topups.create(
    {
      amount: cents,
      currency: 'usd',
      source: FINANCIAL_ACCOUNTS.business,
      description: `Fund owner pay (10% BTC DCA) for deposit ${depositId}`,
      statement_descriptor: 'TLAU DCA',
      metadata: { admin_job_id: jobId, deposit_id: depositId },
    },
    // On the default API version Stripe refused the financial account as a
    // source ("No such source", 2026-11-05); money-management features need the
    // preview version. New key again: the refused attempts are cached under the old.
    // A money-management move: the restricted key when set (see _stripe-money-key).
    { idempotencyKey: `deposit-topup-fa2-${depositId}`, apiVersion: '2026-09-30.preview' as any, apiKey: stripeMoneyKey() }
  )
  const { error: saveError } = await supabase
    .from('deposit_checkins').update({ owner_pay_topup_id: topup.id }).eq('id', depositId)
  if (saveError) throw new Error(`Top-up ${topup.id} created but not saved: ${saveError.message}`)
  return { id: topup.id, status: topup.status }
}

/** Available USD in the platform's Payments balance, in dollars. */
async function availableUsd(): Promise<number> {
  const balance = await getStripe().balance.retrieve()
  const cents = (balance.available || [])
    .filter((b) => b.currency === 'usd')
    .reduce((sum, b) => sum + b.amount, 0)
  return cents / 100
}

/**
 * Run a plain Vercel handler that does its own work and has no admin gate of
 * its own (request-payout). Never used to get past an admin check.
 */
async function invokeUngated(
  handler: (req: VercelRequest, res: VercelResponse) => unknown,
  body: Record<string, any>
): Promise<{ status: number; body: any }> {
  let statusCode = 200
  let payload: any = null
  const res: any = {
    status(code: number) { statusCode = code; return res },
    json(b: any) { payload = b; return res },
    send(b: any) { payload = b; return res },
    setHeader() { return res },
    end(b?: any) { if (b !== undefined) payload = b; return res },
  }
  const req: any = { method: 'POST', headers: { host: 'www.thelostandunfounds.com' }, body, query: {}, url: '/' }
  await handler(req, res)
  return { status: statusCode, body: payload }
}

export const ADMIN_JOB_ACTIONS: Record<string, Action> = {
  // Zoho mailbox: mail_folders, mail_list, mail_search, mail_read, mail_send.
  ...MAIL_JOB_ACTIONS,

  /** Read-only. { } */
  async stripe_balance() {
    return ok({ availableUsd: await availableUsd() })
  },

  /**
   * Read-only. { } — every company address Zoho says the connected mailbox
   * owns: each account's primary address, aliases and send-as addresses.
   * Answers "is support@ real?" without the Zoho console.
   */
  async zoho_addresses() {
    const auth = await getZohoAuthContext()
    const res = await fetch('https://mail.zoho.com/api/accounts', {
      headers: { Authorization: `Zoho-oauthtoken ${auth.accessToken}` },
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) return fail(`Zoho accounts lookup failed: ${res.status}`, res.status, json)
    const accounts = (json?.data || json?.accounts || []).map((a: any) => ({
      primary: a.primaryEmailAddress || a.mailboxAddress || null,
      aliases: (a.emailAddress || [])
        .map((e: any) => (typeof e === 'string' ? e : e.mailId))
        .filter(Boolean),
      sendAs: (a.sendMailDetails || []).map((d: any) => d.fromAddress).filter(Boolean),
    }))
    return ok({ connectedAs: auth.fromEmail, accounts })
  },

  /** { clientName, clientEmail, clientPhone?, description, eventDate?, lineItems[] } */
  async create_invoice(supabase, payload) {
    return ok(await createStandaloneInvoice(supabase, payload, SITE))
  },

  /** { invoiceNumber } */
  async create_payment_link(supabase, payload) {
    if (!payload.invoiceNumber) return fail('invoiceNumber is required', 400)
    return ok(await ensureInvoicePaymentLink(supabase, payload.invoiceNumber, SITE))
  },

  /**
   * { invoice_id | invoice_number, to_email?, cc_email?, message?, test? }
   * A real send CCs media@ (the business record) unless cc_email is given.
   * test: true sends to to_email only, no CC — the test-to-owner step.
   */
  async send_invoice(supabase, payload) {
    let invoiceId = payload.invoice_id
    if (!invoiceId && payload.invoice_number) {
      const { data } = await supabase
        .from('invoices').select('id').eq('invoice_number', payload.invoice_number).maybeSingle()
      invoiceId = data?.id
    }
    if (!invoiceId) return fail('invoice_id or invoice_number is required', 400)
    if (payload.test && !payload.to_email) return fail('test sends need to_email', 400)
    const result = await sendInvoiceEmail({
      invoice_id: invoiceId,
      to_email: payload.to_email,
      cc_email: payload.test ? undefined : payload.cc_email || MEDIA_CC,
      message: payload.message,
    })
    return result.status < 400 ? ok(result.body, result.status) : fail(result.body?.error || 'send failed', result.status, result.body)
  },

  /**
   * { invoiceNumber, method, amount?, notes? } — money that arrived outside
   * Stripe Checkout (Apple Pay / Apple Cash, Zelle, cash). Same as
   * POST /api/admin/record-invoice-payment. It sends nothing; queue send_invoice
   * after it for the receipt.
   */
  async record_invoice_payment(supabase, payload) {
    const result = await recordInvoicePayment(supabase, payload as any)
    return result.status < 400 ? ok(result.body, result.status) : fail(result.body?.error || 'record failed', result.status, result.body)
  },

  /** { action: 'create' | 'attach' | 'invite', ...same body as /api/admin/direct-booking } */
  async direct_booking(supabase, payload) {
    const action = payload.action || 'create'
    if (action === 'create') return ok(await createDirectBooking(supabase, payload, SITE))
    if (action === 'attach') return ok(await attachDirectBooking(supabase, payload))
    if (action === 'invite') {
      const result = await sendReferrerInvite(payload)
      return result.sent ? ok(result) : fail(result.error || 'invite not sent', 500, result)
    }
    return fail(`Unknown direct_booking action ${action}`, 400)
  },

  /**
   * { email, name?, testEmail? } — the "you're on the roster" invite, same as
   * Admin → Gallery → Invite Photographer. A real send stores the 7-day
   * invitation and CCs media@; testEmail previews it at that address only,
   * storing nothing.
   */
  /**
   * { slug | library_id, emails?, testEmail? } — the client gallery invite
   * (album owners, or à la carte buyers listed in emails; each gets the copy
   * for their list),
   * same as Admin → Gallery → edit a gallery → Resend. Without `emails` it
   * goes to everyone on the gallery's invite list except media@ (which gets
   * a record copy of each instead). Each invite opens the gallery in one tap.
   * testEmail (an admin address) previews it there only: [TEST], no record
   * copy, and its button won't open the gallery (that address isn't invited).
   */
  async gallery_invite(supabase, payload) {
    let query = supabase.from('photo_libraries').select('id, slug, invited_emails, buyer_emails')
    query = payload.library_id ? query.eq('id', payload.library_id) : query.eq('slug', payload.slug || '')
    const { data: library, error } = await query.maybeSingle()
    if (error) return fail(error.message, 500)
    if (!library) return fail('gallery not found (give slug or library_id)', 404)

    const invited = String(library.invited_emails || '')
      .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    // À la carte buyers are invited too (they buy per photo); listed emails
    // may be on either list.
    const buyers = String(library.buyer_emails || '')
      .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)
    let emails: string[]
    let test = false
    if (payload.testEmail) {
      const t = String(payload.testEmail).trim().toLowerCase()
      if (!ADMIN_EMAILS.includes(t)) return fail(`testEmail must be an admin address: ${ADMIN_EMAILS.join(', ')}`, 400)
      emails = [t]
      test = true
    } else if (Array.isArray(payload.emails) && payload.emails.length) {
      emails = payload.emails.map((e: any) => String(e).trim().toLowerCase())
      const notInvited = emails.filter((e) => !invited.includes(e) && !buyers.includes(e))
      // Only people on the list: an invite to anyone else carries a key that
      // can't open the gallery, and this must never mail arbitrary addresses.
      if (notInvited.length) return fail(`not on the invite list: ${notInvited.join(', ')}`, 400)
    } else {
      emails = invited.filter((e) => e !== 'media@thelostandunfounds.com')
    }
    if (!emails.length) return fail('nobody to invite', 400)

    const { results } = await sendGalleryInvites(supabase, library.id, emails, { test })
    const out = { gallery: library.slug, test, ...results }
    return results.failed.length ? fail(`${results.failed.length} invite(s) failed`, 502, out) : ok(out)
  },

  async invite_photographer(supabase, payload) {
    if (!payload.email) return fail('email is required', 400)
    const result = await sendPhotographerInvite(supabase, payload as any)
    return result.sent ? ok(result) : fail(result.error || 'invite not sent', 500, result)
  },

  /**
   * { affiliateCode, amount, notes? }
   * Never attempts a transfer the platform cannot cover: client card payments
   * sit in "pending" for days, and a failed transfer emails the affiliate.
   * Short on funds → waiting_funds, looked at again in an hour.
   */
  async affiliate_payout(_supabase, payload) {
    const amount = Number(payload.amount)
    if (!payload.affiliateCode || !(amount > 0)) return fail('affiliateCode and a positive amount are required', 400)
    const available = await availableUsd()
    if (available < amount) {
      return {
        status: 'waiting_funds',
        error: `Platform available balance $${available.toFixed(2)} < $${amount.toFixed(2)}`,
        retryAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    }
    const result = await invokeUngated(requestPayout as any, {
      affiliateCode: payload.affiliateCode,
      amount,
      notes: payload.notes,
    })
    return result.status < 400 ? ok(result.body, result.status) : fail(result.body?.error || 'payout failed', result.status, result.body)
  },

  /**
   * { to: 'business' | 'king_midas' | 'secret_santa' | 'affiliate_pay', amount, note? }
   * Payments balance → one of the platform's financial accounts (a v1 Payout
   * with payout_method = the account). Refuses rather than waits when the
   * available balance is short: unlike a payout someone is owed, a move the
   * owner sized against today's balance should not fire days later.
   */
  async move_funds(_supabase, payload, jobId) {
    const destination = FINANCIAL_ACCOUNTS[payload.to]
    const cents = Math.round(Number(payload.amount) * 100)
    if (!destination) return fail(`to must be one of: ${Object.keys(FINANCIAL_ACCOUNTS).join(', ')}`, 400)
    if (!(cents > 0)) return fail('a positive amount is required', 400)
    const available = await availableUsd()
    if (Math.round(available * 100) < cents) {
      return fail(`Platform available balance $${available.toFixed(2)} < $${(cents / 100).toFixed(2)}`, 409)
    }
    const payout = await getStripe().payouts.create(
      {
        amount: cents,
        currency: 'usd',
        payout_method: destination,
        description: payload.note || `Move to ${payload.to}`,
        metadata: { admin_job_id: jobId, to: payload.to },
      },
      // payout_method needs a newer API version than the client default.
      { idempotencyKey: `admin-job-${jobId}`, apiVersion: '2025-08-27.basil' as any }
    )
    return ok({ payoutId: payout.id, status: payout.status, amount: payout.amount / 100, to: payload.to })
  },

  /** { night, location?, cashApp?, venmo?, applePay?, cash?, saleCount?, notes? } — same body as /api/admin/field-sales */
  async record_field_sale(supabase, payload) {
    return ok(await recordFieldSale(supabase, payload))
  },

  /**
   * { fieldSaleId?, depositId?, invoiceId?, amount } — the owner's pay (10%) for a
   * street night, an outside deposit (deposit check-in) or a card deposit on an
   * invoice, to his Stripe Connect account
   * (where it is DCA'd into bitcoin). Queued by recordFieldSale and the deposit
   * check-in. Waits (hourly, up to 3 days) when the available balance is short,
   * like affiliate_payout.
   *
   * A deposit's money sits in the business financial account, not the Payments
   * balance a Connect transfer is paid from. So for a deposit, a short balance
   * first triggers ONE top-up (financial account -> Payments balance) for the
   * pay, recorded on the deposit row so a later retry never tops up twice; the
   * job then waits for it to settle like any other.
   */
  async owner_pay(supabase, payload, jobId) {
    const cents = Math.round(Number(payload.amount) * 100)
    if (!(cents > 0)) return fail('a positive amount is required', 400)

    const owner = await findAffiliateByCode(supabase, OWNER_AFFILIATE_CODE)
    const { data: acct } = owner
      ? await supabase.from('affiliates').select('stripe_account_id').eq('id', owner.id).maybeSingle()
      : { data: null }
    if (!acct?.stripe_account_id) return fail('The owner affiliate has no Stripe Connect account', 409)

    const available = await availableUsd()
    if (Math.round(available * 100) < cents) {
      // A top-up Stripe refuses must not fail the pay: the owner is still owed
      // it, and card income settling into the Payments balance covers it. Keep
      // waiting (hourly, up to 3 days) and say why in the job's error.
      let funding = ''
      if (payload.depositId) {
        try {
          const topup = await fundDepositPay(supabase, payload.depositId, cents, jobId)
          funding = ` — top-up ${topup.id} from the business account is ${topup.status}`
        } catch (e: any) {
          funding = ` — top-up from the business account refused (${e?.message || e}); waiting for card income`
        }
      }
      return {
        status: 'waiting_funds',
        error: `Platform available balance $${available.toFixed(2)} < $${(cents / 100).toFixed(2)}${funding}`,
        retryAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    }

    const transfer = await getStripe().transfers.create(
      {
        amount: cents,
        currency: 'usd',
        destination: acct.stripe_account_id,
        description: payload.source
          ? `Owner pay — 10% of kept profit (${payload.source})`
          : payload.depositId || payload.invoiceId ? 'Owner pay — 10% of deposit (BTC DCA)' : 'Owner pay — street night',
        metadata: {
          admin_job_id: jobId, field_sale_id: payload.fieldSaleId || '',
          deposit_id: payload.depositId || '', invoice_id: payload.invoiceId || '',
          source: payload.source || '', source_id: payload.sourceId || '',
        },
      },
      { idempotencyKey: `admin-job-${jobId}` }
    )
    return ok({ transferId: transfer.id, amount: cents / 100 })
  },
}

/** A waiting_funds job gives up after this long and is marked failed. */
const MAX_WAIT_MS = 3 * 24 * 60 * 60 * 1000

export async function runAdminJob(
  supabase: SupabaseClient,
  job: { id: string; action: string; payload: any; created_at: string }
): Promise<JobOutcome> {
  const action = ADMIN_JOB_ACTIONS[job.action]
  if (!action) return fail(`Unknown action "${job.action}". Allowed: ${Object.keys(ADMIN_JOB_ACTIONS).join(', ')}`)
  try {
    const outcome = await action(supabase, job.payload || {}, job.id)
    if (outcome.status === 'waiting_funds' && Date.now() - new Date(job.created_at).getTime() > MAX_WAIT_MS) {
      return fail(`Gave up after 3 days waiting for funds: ${outcome.error}`)
    }
    return outcome
  } catch (err: any) {
    return fail(err?.message || String(err), err?.status)
  }
}
