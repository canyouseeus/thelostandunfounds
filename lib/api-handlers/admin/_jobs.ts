import type { SupabaseClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe } from '../_booking-payment-utils.js'
import { createStandaloneInvoice, ensureInvoicePaymentLink } from '../_standalone-invoice.js'
import { sendInvoiceEmail } from '../_invoice-send.js'
import { createDirectBooking, attachDirectBooking, sendReferrerInvite } from './direct-booking.js'
import requestPayout from '../affiliates/request-payout.js'

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

type Action = (supabase: SupabaseClient, payload: Record<string, any>) => Promise<JobOutcome>

const ok = (result: unknown, httpStatus = 200): JobOutcome => ({ status: 'done', httpStatus, result })
const fail = (error: string, httpStatus?: number, result?: unknown): JobOutcome => ({
  status: 'failed', httpStatus, error, result,
})

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
  /** Read-only. { } */
  async stripe_balance() {
    return ok({ availableUsd: await availableUsd() })
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
    const outcome = await action(supabase, job.payload || {})
    if (outcome.status === 'waiting_funds' && Date.now() - new Date(job.created_at).getTime() > MAX_WAIT_MS) {
      return fail(`Gave up after 3 days waiting for funds: ${outcome.error}`)
    }
    return outcome
  } catch (err: any) {
    return fail(err?.message || String(err), err?.status)
  }
}
