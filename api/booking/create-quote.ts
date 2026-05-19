/**
 * POST /api/booking/create-quote
 *
 * Joshua reviews a booking, sets a price, and this generates a quote:
 *   - a 'quote' invoice row linked to the booking
 *   - a single-use Stripe Payment Link for the 50% deposit
 *   - a branded email to the client with the pay button + quote PDF link
 *
 * Body (JSON):
 *   bookingId    string                 — UUID of the booking
 *   totalPrice   number                 — full project price in USD
 *   depositPct?  number                 — deposit percentage, default 50
 *   lineItems?   Array<LineItem>         — optional itemised breakdown
 *   description? string
 *
 * Auth: x-admin-secret, x-admin-email, or localhost.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch {
  // .env.local is optional (present in local dev only)
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  BOOKING_PAYMENT_SOURCE,
  BookingLineItem,
  buildBookingPaymentEmailBody,
  createPaymentLink,
  getStripe,
  getSupabaseAdmin,
  nextInvoiceNumber,
  randomToken,
  sendBookingPaymentEmail,
  siteOrigin,
  upsertClientForBooking,
} from '../../lib/api-handlers/_booking-payment-utils.js'

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true
  }
  const adminEmail = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(adminEmail)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const {
    bookingId,
    totalPrice,
    depositPct = 50,
    lineItems,
    description,
  } = (req.body || {}) as {
    bookingId?: string
    totalPrice?: number
    depositPct?: number
    lineItems?: BookingLineItem[]
    description?: string
  }

  if (!bookingId || typeof bookingId !== 'string') {
    return res.status(400).json({ error: 'bookingId is required' })
  }
  if (typeof totalPrice !== 'number' || !(totalPrice > 0)) {
    return res.status(400).json({ error: 'totalPrice must be a positive number' })
  }
  const pct = Number(depositPct)
  if (!(pct > 0) || pct >= 100) {
    return res.status(400).json({ error: 'depositPct must be between 1 and 99' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const stripe = getStripe()
    const origin = siteOrigin(req)

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const client = await upsertClientForBooking(supabase, booking)
    const recipient = client.email || booking.email
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ error: 'No client email available to send the quote to' })
    }

    // Normalise line items — synthesize one if the caller didn't itemise.
    const items: BookingLineItem[] =
      Array.isArray(lineItems) && lineItems.length > 0
        ? lineItems.map((li) => ({
            description: String(li.description || 'Photography services'),
            quantity: li.quantity != null ? Number(li.quantity) : 1,
            unit_price: li.unit_price != null ? Number(li.unit_price) : undefined,
            amount: Number(li.amount) || 0,
          }))
        : [
            {
              description: `Photography — ${booking.event_type || 'shoot'}`,
              quantity: 1,
              unit_price: totalPrice,
              amount: totalPrice,
            },
          ]

    const subtotal = items.reduce((s, li) => s + (Number(li.amount) || 0), 0)
    const total = Math.round(totalPrice * 100) / 100
    const depositAmount = Math.round(total * pct) / 100 // round to cents
    const depositCents = Math.round(depositAmount * 100)
    if (depositCents < 50) {
      return res.status(400).json({ error: 'Deposit amount is below Stripe minimum ($0.50)' })
    }

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
        description: description || `Photography services — ${booking.event_type || 'shoot'}`,
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

    if (invErr || !invoice) {
      console.error('[create-quote] invoice insert failed:', invErr)
      return res.status(500).json({ error: 'Failed to create quote invoice', details: invErr?.message })
    }

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
      // Non-fatal: the quote + link exist; the email can be resent.
      emailError = mailErr?.message || String(mailErr)
      console.warn('[create-quote] email send failed:', emailError)
    }

    return res.status(200).json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
      invoiceType: 'quote',
      total,
      depositAmount,
      paymentLinkUrl: link.url,
      pdfUrl,
      emailed,
      emailError,
    })
  } catch (err: any) {
    console.error('[create-quote] error:', err)
    return res.status(500).json({ error: 'Server error', message: err?.message || String(err) })
  }
}
