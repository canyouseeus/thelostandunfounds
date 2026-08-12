/**
 * Shared helpers for the booking payment flow (quote deposit + final balance).
 *
 * Centralises: Stripe client, client-record upsert, invoice-number generation,
 * Stripe Payment Link creation, and the branded payment email.
 *
 * Payment Links (not Checkout Sessions) are used here on purpose: the link is
 * embedded in a PDF the client may open days later, and Checkout Sessions
 * expire within 24h. The Stripe webhook matches a paid session back to its
 * invoice via the payment link id stored on the invoice row.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import crypto from 'crypto'
import { wrapEmailContent, BRAND } from '../../api/email-template.js'
import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js'

const FROM_EMAIL = 'media@thelostandunfounds.com'

export const BOOKING_PAYMENT_SOURCE = 'tlau-booking'

export interface BookingLineItem {
  description: string
  quantity?: number
  unit_price?: number
  amount: number
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' as any, typescript: true })
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service credentials not configured')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function siteOrigin(req?: { headers: Record<string, any> }): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  const proto = req?.headers['x-forwarded-proto']
  const host = req?.headers['host']
  if (proto && host) return `${proto}://${host}`.replace(/\/$/, '')
  return 'https://www.thelostandunfounds.com'
}

export function randomToken(): string {
  return crypto.randomBytes(18).toString('hex')
}

/**
 * Find an existing client by email (case-insensitive), otherwise create one
 * from the booking's contact details. Returns the client row.
 */
export async function upsertClientForBooking(
  supabase: SupabaseClient,
  booking: { name: string; email: string; phone?: string | null; business_name?: string | null }
): Promise<{ id: string; name: string; email: string | null; business: string | null }> {
  const email = (booking.email || '').toLowerCase().trim()

  if (email) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id, name, email, business')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    if (existing) return existing
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      name: booking.name,
      email: email || null,
      phone: booking.phone || null,
      business: booking.business_name || null,
    })
    .select('id, name, email, business')
    .single()

  if (error || !created) {
    throw new Error(`Failed to create client: ${error?.message || 'unknown error'}`)
  }
  return created
}

/**
 * Generate the next sequential invoice number for a prefix, e.g. INV-007.
 * Quotes use the QUO- series; final invoices continue the legacy INV- series.
 */
export async function nextInvoiceNumber(supabase: SupabaseClient, prefix: 'INV' | 'QUO'): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}-%`)

  let max = 0
  for (const row of data || []) {
    const m = /-(\d+)$/.exec(row.invoice_number || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

/**
 * Create a single-use Stripe Payment Link for a fixed USD amount.
 * A Price (with an inline product) is created first since Payment Links
 * require a Price id rather than inline price_data.
 */
export async function createPaymentLink(
  stripe: Stripe,
  args: {
    amountCents: number
    productName: string
    description: string
    metadata: Record<string, string>
    redirectUrl: string
  }
): Promise<{ id: string; url: string }> {
  const price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: args.amountCents,
    product_data: { name: args.productName },
  })

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: args.metadata,
    // Single-use: once paid, the link can't be paid again.
    restrictions: { completed_sessions: { limit: 1 } },
    after_completion: { type: 'redirect', redirect: { url: args.redirectUrl } },
    payment_intent_data: {
      description: args.description,
      metadata: args.metadata,
    },
  })

  return { id: link.id, url: link.url }
}

function fmtUSD(n: number): string {
  return `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return d
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build the branded HTML body for a quote / final-invoice payment email.
 */
export function buildBookingPaymentEmailBody(args: {
  kind: 'quote' | 'final'
  clientName: string
  invoiceNumber: string
  eventType: string | null
  eventDate: string | null
  projectTotal: number
  amountDue: number
  amountDueLabel: string
  paymentUrl: string
  pdfUrl: string
}): string {
  const text = BRAND.colors.text
  const muted = BRAND.colors.textMuted
  const border = BRAND.colors.border
  const firstName = (args.clientName || '').split(' ')[0] || 'there'

  const intro =
    args.kind === 'quote'
      ? `Here's the quote for your ${escapeHtml(args.eventType || 'shoot')}. To lock the date, a <b>50% deposit</b> is due now — the rest is invoiced after the shoot.`
      : `Thanks again for your ${escapeHtml(args.eventType || 'shoot')}. Here's the final invoice for the remaining balance.`

  const heading = args.kind === 'quote' ? 'YOUR QUOTE IS READY' : 'FINAL INVOICE'

  return `
    <h1 style="color:${text} !important;font-size:26px;font-weight:bold;letter-spacing:0.08em;margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;">${heading}</h1>
    <p style="color:${muted};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(args.invoiceNumber)}</p>

    <p style="color:${text} !important;font-size:15px;line-height:1.6;margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;">
      Hey ${escapeHtml(firstName)} — ${intro}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;border-top:1px solid ${border};border-bottom:1px solid ${border};">
      <tr>
        <td style="padding:16px 0;color:${muted};font-size:13px;font-family:Arial,Helvetica,sans-serif;">Event date</td>
        <td align="right" style="padding:16px 0;color:${text} !important;font-size:13px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(fmtDate(args.eventDate))}</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px 0;color:${muted};font-size:13px;font-family:Arial,Helvetica,sans-serif;">Project total</td>
        <td align="right" style="padding:0 0 16px 0;color:${text} !important;font-size:13px;font-family:'Courier New',monospace;">${fmtUSD(args.projectTotal)}</td>
      </tr>
    </table>

    <!-- Amount due -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:#ffffff;padding:20px 24px;">
          <p style="color:#666;font-size:10px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(args.amountDueLabel)}</p>
          <p style="color:#000;font-size:32px;font-weight:bold;margin:0;font-family:Arial,Helvetica,sans-serif;">${fmtUSD(args.amountDue)}</p>
        </td>
      </tr>
    </table>

    <!-- Pay button -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px 0;">
      <tr>
        <!-- The fill lives on the anchor as well as the cell: a client that
             drops the td background must not be able to turn the only
             call-to-action on a payment email into blank space. It has. -->
        <td align="center" bgcolor="#000000" style="background-color:#000000 !important;">
          <a href="${escapeHtml(args.paymentUrl)}" style="display:block;padding:16px 24px;background-color:#000000 !important;color:#ffffff !important;font-size:14px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
            Pay ${escapeHtml(args.amountDueLabel)} &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="color:${muted};font-size:12px;line-height:1.6;margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;">
      Secure payment via Stripe. Prefer the full document?
      <a href="${escapeHtml(args.pdfUrl)}" style="color:${text};text-decoration:underline;">View the ${args.kind === 'quote' ? 'quote' : 'invoice'} PDF</a>.
    </p>

    <hr style="border:none;border-top:1px solid ${border};margin:24px 0;">
    <p style="color:${muted} !important;font-size:12px;line-height:1.6;margin:0;font-family:Arial,Helvetica,sans-serif;">
      Questions? Just reply to this email.
    </p>
    <p style="color:${text} !important;font-size:13px;margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;">— Joshua / TLAU</p>
  `
}

/**
 * Send the branded payment email to the client via Zoho.
 */
export async function sendBookingPaymentEmail(args: {
  to: string
  kind: 'quote' | 'final'
  invoiceNumber: string
  bodyHtml: string
}): Promise<void> {
  const htmlContent = wrapEmailContent(args.bodyHtml, {
    includeUnsubscribe: false,
    includeFooter: true,
  })
  const subject =
    args.kind === 'quote'
      ? `Your quote ${args.invoiceNumber} — ${BRAND.name}`
      : `Invoice ${args.invoiceNumber} — ${BRAND.name}`

  const auth = await getZohoAuthContext()
  const result = await sendZohoEmail({
    auth: { ...auth, fromEmail: FROM_EMAIL },
    to: args.to,
    // Client billing correspondence stays on the business record.
    cc: FROM_EMAIL,
    subject,
    htmlContent,
  })
  if (!result.success) {
    throw new Error(result.error || 'Failed to send payment email')
  }
}

/**
 * Create a quote for a booking: invoice row, Stripe deposit link, branded email.
 *
 * Extracted so the admin endpoint (api/booking/create-quote.ts) and automatic
 * quoting at booking time run the same code. A duplicated implementation of a
 * payment path is how the two drift and one of them starts charging the wrong
 * amount.
 *
 * Throws on validation or Stripe/DB failure. A failed *email* is not fatal —
 * the invoice and link exist and can be resent — so it is reported instead.
 */
export async function createQuoteForBooking(args: {
  bookingId: string
  totalPrice: number
  depositPct?: number
  lineItems?: BookingLineItem[]
  description?: string
  origin: string
}): Promise<{
  invoiceId: string
  invoiceNumber: string
  paymentUrl: string
  pdfUrl: string
  total: number
  depositAmount: number
  emailed: boolean
  emailError?: string
}> {
  const { bookingId, totalPrice, origin } = args
  const pct = Number(args.depositPct ?? 50)

  if (!bookingId) throw new Error('bookingId is required')
  if (!(totalPrice > 0)) throw new Error('totalPrice must be a positive number')
  if (!(pct > 0) || pct >= 100) throw new Error('depositPct must be between 1 and 99')

  const supabase = getSupabaseAdmin()
  const stripe = getStripe()

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings').select('*').eq('id', bookingId).single()
  if (bookingErr || !booking) throw new Error('Booking not found')

  const client = await upsertClientForBooking(supabase, booking)
  const recipient = client.email || booking.email
  if (!recipient || !recipient.includes('@')) {
    throw new Error('No client email available to send the quote to')
  }

  const items: BookingLineItem[] =
    Array.isArray(args.lineItems) && args.lineItems.length > 0
      ? args.lineItems.map((li) => ({
          description: String(li.description || 'Photography services'),
          quantity: li.quantity != null ? Number(li.quantity) : 1,
          unit_price: li.unit_price != null ? Number(li.unit_price) : undefined,
          amount: Number(li.amount) || 0,
        }))
      : [{
          description: `Photography — ${booking.event_type || 'shoot'}`,
          quantity: 1,
          unit_price: totalPrice,
          amount: totalPrice,
        }]

  const subtotal = items.reduce((s, li) => s + (Number(li.amount) || 0), 0)
  const total = Math.round(totalPrice * 100) / 100
  const depositAmount = Math.round(total * pct) / 100
  const depositCents = Math.round(depositAmount * 100)
  if (depositCents < 50) throw new Error('Deposit amount is below Stripe minimum ($0.50)')

  const invoiceNumber = await nextInvoiceNumber(supabase, 'QUO')
  const pdfToken = randomToken()

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      client_id: client.id,
      booking_id: bookingId,
      invoice_number: invoiceNumber,
      invoice_type: 'quote',
      date: new Date().toISOString().slice(0, 10),
      event_date: booking.event_date || null,
      description: args.description || `Photography services — ${booking.event_type || 'shoot'}`,
      line_items: items,
      subtotal,
      total,
      amount_due: depositAmount,
      status: 'sent',
      payment_method: 'Stripe',
      pdf_token: pdfToken,
    })
    .select('id')
    .single()

  if (invErr || !invoice) throw new Error(`Failed to create quote invoice: ${invErr?.message}`)

  const link = await createPaymentLink(stripe, {
    amountCents: depositCents,
    productName: `Deposit (${pct}%) — ${booking.event_type || 'Photography'} — ${invoiceNumber}`,
    description: `${invoiceNumber} deposit — booking ${bookingId}`,
    metadata: {
      source: BOOKING_PAYMENT_SOURCE,
      kind: 'quote',
      invoiceId: invoice.id,
      bookingId,
    },
    redirectUrl: `${origin}/booking?payment=success`,
  })

  await supabase
    .from('invoices')
    .update({ stripe_payment_link_id: link.id, stripe_payment_link_url: link.url })
    .eq('id', invoice.id)

  await supabase
    .from('bookings')
    .update({
      total_amount_cents: Math.round(total * 100),
      deposit_amount_cents: depositCents,
    })
    .eq('id', bookingId)

  const pdfUrl = `${origin}/api/invoices/pdf?id=${invoice.id}&token=${pdfToken}`

  let emailed = false
  let emailError: string | undefined
  try {
    const bodyHtml = buildBookingPaymentEmailBody({
      kind: 'quote',
      clientName: client.name || booking.name,
      invoiceNumber,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      projectTotal: total,
      amountDue: depositAmount,
      amountDueLabel: `Deposit Due (${pct}%)`,
      paymentUrl: link.url,
      pdfUrl,
    })
    await sendBookingPaymentEmail({ to: recipient, kind: 'quote', invoiceNumber, bodyHtml })
    emailed = true
  } catch (mailErr: any) {
    emailError = mailErr?.message || String(mailErr)
    console.warn('[createQuoteForBooking] email send failed:', emailError)
  }

  return {
    invoiceId: invoice.id,
    invoiceNumber,
    paymentUrl: link.url,
    pdfUrl,
    total,
    depositAmount,
    emailed,
    emailError,
  }
}

/**
 * Confirm a paid deposit to the client.
 *
 * Paying the deposit used to be silent: the webhook advanced the booking to
 * deposit_paid and sent nothing, so a client paid and heard back only when
 * someone got round to it. This closes the loop and sets the expectation that
 * the balance is collected on the day of the shoot.
 */
export async function sendDepositConfirmationEmail(args: {
  to: string
  clientName?: string | null
  invoiceNumber: string
  eventType?: string | null
  eventDate?: string | null
  startTime?: string | null
  location?: string | null
  depositPaid: number
  balanceDue: number
}): Promise<void> {
  const fmt = (n: number) => `$${n.toFixed(2)}`
  const when = args.eventDate
    ? new Date(`${args.eventDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'your scheduled date'
  const time = args.startTime ? String(args.startTime).slice(0, 5) : null

  const row = (label: string, value: string) => `
    <p style="color: ${BRAND.colors.text}; font-size: 15px; line-height: 1.6; margin: 0 0 6px 0; text-align: left;">
      <strong>${label}:</strong> ${value}
    </p>`

  const bodyHtml = `
    <h1 style="color: ${BRAND.colors.text}; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 0.1em;">DEPOSIT RECEIVED</h1>
    <p style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
      ${args.clientName ? `Hi ${args.clientName},` : 'Hi,'}
    </p>
    <p style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
      Thank you for booking with us — we've received your deposit of <strong>${fmt(args.depositPaid)}</strong>
      against ${args.invoiceNumber}. Your shoot is confirmed.
    </p>
    ${row('Shoot', args.eventType || 'Photography')}
    ${row('Date', when)}
    ${time ? row('Time', time) : ''}
    ${args.location ? row('Location', args.location) : ''}
    <hr style="border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;">
    <p style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
      <strong>Remaining balance: ${fmt(args.balanceDue)}</strong>, collected on the day of the shoot
      once it's complete. We'll send the final invoice and payment link then — nothing to do before that.
    </p>
    <p style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
      If anything about the date, time or access changes, just reply to this email.
    </p>
    <p style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">
      &mdash; Joshua<br />THE LOST+UNFOUNDS
    </p>`

  const htmlContent = wrapEmailContent(bodyHtml, {
    includeUnsubscribe: false,
    includeFooter: true,
  })

  const auth = await getZohoAuthContext()
  await sendZohoEmail({
    auth,
    to: args.to,
    cc: FROM_EMAIL,
    subject: `Deposit received — your shoot is confirmed (${args.invoiceNumber})`,
    htmlContent,
  })
}

/**
 * House commission on subcontracted work.
 *
 * The house takes 20% for booking the session; the photographer keeps the rest.
 * This is the standing arrangement for every photography subcontractor, not a
 * per-person deal — photographers.payout_pct defaults to 80 and exists only so
 * an individual arrangement can differ if one is ever agreed.
 */
export const HOUSE_COMMISSION_PCT = 20

export interface AssignedPhotographer {
  id: string
  name: string
  email: string
  payout_pct: number
}

/** The photographer a new booking goes to. */
export async function getDefaultPhotographer(
  supabase: SupabaseClient,
): Promise<AssignedPhotographer | null> {
  const { data } = await supabase
    .from('photographers')
    .select('id, name, email, payout_pct')
    .eq('active', true)
    .eq('is_default', true)
    .maybeSingle()
  return (data as AssignedPhotographer) || null
}

/**
 * Tell the photographer they have a job.
 *
 * Everything they need to turn up and get in — date, window, address, access —
 * plus what the job pays them, so the split is never a conversation after the
 * fact. Never sent to the client: it carries the payout.
 */
export async function sendPhotographerAssignment(args: {
  photographer: AssignedPhotographer
  clientName: string
  eventType: string
  eventDate: string | null
  startTime: string | null
  endTime: string | null
  location: string | null
  accessNotes: string | null
  jobTotal: number
  invoiceNumber?: string | null
}): Promise<void> {
  const payout = Math.round(args.jobTotal * (args.photographer.payout_pct / 100) * 100) / 100
  const fmt = (n: number) => `$${n.toFixed(2)}`
  const hhmm = (t: string | null) => (t ? String(t).slice(0, 5) : null)

  const when = args.eventDate
    ? new Date(`${args.eventDate}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : 'TBC'
  const window = [hhmm(args.startTime), hhmm(args.endTime)].filter(Boolean).join(' – ') || 'TBC'

  const row = (label: string, value: string) => `
    <p style="color:${BRAND.colors.text};font-size:15px;line-height:1.6;margin:0 0 8px 0;text-align:left;">
      <strong>${label}:</strong> ${value}
    </p>`

  const bodyHtml = `
    <h1 style="color:${BRAND.colors.text};font-size:28px;font-weight:bold;margin:0 0 20px 0;letter-spacing:0.1em;">SHOOT ASSIGNED</h1>
    <p style="color:${BRAND.colors.text};font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">Hi ${args.photographer.name.split(' ')[0]}, you're booked for this one.</p>
    ${row('Date', when)}
    ${row('Time', window)}
    ${row('Location', args.location || 'TBC — will confirm')}
    ${row('Access', args.accessNotes || 'None supplied — check before the day')}
    ${row('Client', args.clientName)}
    ${row('Shoot', args.eventType)}
    <hr style="border:none;border-top:1px solid ${BRAND.colors.border};margin:30px 0;">
    ${row('Job total', fmt(args.jobTotal))}
    ${row('Your payout', `<strong>${fmt(payout)}</strong> (${args.photographer.payout_pct}%)`)}
    <p style="color:${BRAND.colors.textMuted};font-size:14px;line-height:1.5;margin:0 0 20px 0;">
      The house takes ${HOUSE_COMMISSION_PCT}% for booking the session. Paid out after the client settles.
    </p>
    <p style="color:${BRAND.colors.text};font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">
      If the date, time or access doesn't work, reply here and we'll sort it with the client.
    </p>
    <p style="color:${BRAND.colors.text};font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">&mdash; Joshua<br />THE LOST+UNFOUNDS</p>`

  const htmlContent = wrapEmailContent(bodyHtml, { includeUnsubscribe: false, includeFooter: true })

  const auth = await getZohoAuthContext()
  await sendZohoEmail({
    auth,
    to: args.photographer.email,
    cc: FROM_EMAIL,
    subject: `Shoot assigned — ${when}${window !== 'TBC' ? `, ${window.split(' – ')[0]}` : ''}${args.location ? ` — ${args.location}` : ''}`,
    htmlContent,
  })
}
