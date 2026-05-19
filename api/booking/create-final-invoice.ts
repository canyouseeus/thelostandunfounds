/**
 * POST /api/booking/create-final-invoice
 *
 * After the shoot, Joshua triggers the final invoice. This generates:
 *   - a 'final' invoice row linked to the booking for the remaining balance
 *   - a single-use Stripe Payment Link for that balance
 *   - a branded email to the client with the pay button + invoice PDF link
 *
 * The balance is computed as the booking's project total minus everything
 * already paid against its invoices (i.e. the deposit).
 *
 * Body (JSON):
 *   bookingId    string   — UUID of the booking
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

  const { bookingId, description } = (req.body || {}) as {
    bookingId?: string
    description?: string
  }

  if (!bookingId || typeof bookingId !== 'string') {
    return res.status(400).json({ error: 'bookingId is required' })
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

    if (!booking.total_amount_cents || booking.total_amount_cents <= 0) {
      return res.status(400).json({
        error: 'This booking has no project total. Create a quote first.',
      })
    }

    // Existing invoices for this booking — to compute what is already paid.
    const { data: bookingInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_type, status')
      .eq('booking_id', bookingId)

    const existingFinal = (bookingInvoices || []).find((i) => i.invoice_type === 'final')
    if (existingFinal && existingFinal.status !== 'overdue') {
      return res.status(409).json({
        error: 'A final invoice already exists for this booking.',
        invoiceId: existingFinal.id,
      })
    }

    const invoiceIds = (bookingInvoices || []).map((i) => i.id)
    let paidSoFar = 0
    if (invoiceIds.length > 0) {
      const { data: payments } = await supabase
        .from('invoice_payments')
        .select('amount')
        .in('invoice_id', invoiceIds)
      paidSoFar = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    }

    const total = Math.round(booking.total_amount_cents) / 100
    const balance = Math.round((total - paidSoFar) * 100) / 100
    const balanceCents = Math.round(balance * 100)

    if (balanceCents < 50) {
      return res.status(400).json({
        error: 'Remaining balance is below Stripe minimum ($0.50) — nothing to invoice.',
        total,
        paidSoFar,
      })
    }

    const client = await upsertClientForBooking(supabase, booking)
    const recipient = client.email || booking.email
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ error: 'No client email available to send the invoice to' })
    }

    const lineItems = [
      {
        description: `Remaining balance — ${booking.event_type || 'photography'}`,
        quantity: 1,
        unit_price: balance,
        amount: balance,
      },
    ]

    const invoiceNumber = await nextInvoiceNumber(supabase, 'INV')
    const pdfToken = randomToken()

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        client_id: client.id,
        booking_id: bookingId,
        invoice_number: invoiceNumber,
        invoice_type: 'final',
        date: new Date().toISOString().slice(0, 10),
        event_date: booking.event_date || null,
        description: description || `Final invoice — ${booking.event_type || 'shoot'}`,
        line_items: lineItems,
        subtotal: balance,
        total,
        amount_due: balance,
        status: 'sent',
        payment_method: 'Stripe',
        pdf_token: pdfToken,
      })
      .select('id')
      .single()

    if (invErr || !invoice) {
      console.error('[create-final-invoice] invoice insert failed:', invErr)
      return res.status(500).json({ error: 'Failed to create final invoice', details: invErr?.message })
    }

    const link = await createPaymentLink(stripe, {
      amountCents: balanceCents,
      productName: `Final balance — ${booking.event_type || 'Photography'} — ${invoiceNumber}`,
      description: `${invoiceNumber} balance — booking ${bookingId}`,
      metadata: {
        source: BOOKING_PAYMENT_SOURCE,
        kind: 'final',
        invoiceId: invoice.id,
        bookingId,
      },
      redirectUrl: `${origin}/booking?payment=success`,
    })

    await supabase
      .from('invoices')
      .update({ stripe_payment_link_id: link.id, stripe_payment_link_url: link.url })
      .eq('id', invoice.id)

    const pdfUrl = `${origin}/api/invoices/pdf?id=${invoice.id}&token=${pdfToken}`

    let emailed = false
    let emailError: string | undefined
    try {
      const bodyHtml = buildBookingPaymentEmailBody({
        kind: 'final',
        clientName: client.name || booking.name,
        invoiceNumber,
        eventType: booking.event_type,
        eventDate: booking.event_date,
        projectTotal: total,
        amountDue: balance,
        amountDueLabel: 'Balance Due',
        paymentUrl: link.url,
        pdfUrl,
      })
      await sendBookingPaymentEmail({ to: recipient, kind: 'final', invoiceNumber, bodyHtml })
      emailed = true
    } catch (mailErr: any) {
      emailError = mailErr?.message || String(mailErr)
      console.warn('[create-final-invoice] email send failed:', emailError)
    }

    return res.status(200).json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
      invoiceType: 'final',
      total,
      paidSoFar,
      balanceDue: balance,
      paymentLinkUrl: link.url,
      pdfUrl,
      emailed,
      emailError,
    })
  } catch (err: any) {
    console.error('[create-final-invoice] error:', err)
    return res.status(500).json({ error: 'Server error', message: err?.message || String(err) })
  }
}
