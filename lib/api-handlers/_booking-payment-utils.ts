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
        <td align="center" style="background-color:#ffffff;">
          <a href="${escapeHtml(args.paymentUrl)}" style="display:block;padding:16px 24px;color:#000000;font-size:14px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
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
    subject,
    htmlContent,
  })
  if (!result.success) {
    throw new Error(result.error || 'Failed to send payment email')
  }
}
