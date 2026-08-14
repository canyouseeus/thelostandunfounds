import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabaseAdmin,
  siteOrigin,
  createQuoteForBooking,
  type BookingLineItem,
} from '../../lib/api-handlers/_booking-payment-utils.js'

/**
 * Invoice a price agreed over email.
 *
 * Repeat clients negotiate — "this is what I can work with" — and saying yes to
 * a number should not mean hand-writing an invoice. Every automatic path here
 * resolves a price from the rate card on purpose, so there was no way to bill an
 * agreed amount at all.
 *
 * Creates the booking record the job needs, then hands off to the same
 * createQuoteForBooking() the website flow uses, so a negotiated job produces an
 * identical invoice, Stripe deposit link and branded email. The agreed price is
 * accepted verbatim: that is the point of this endpoint, and it is admin-only
 * for exactly that reason.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true
  }
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
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
    clientEmail,
    clientName,
    businessName,
    eventType = 'Airbnb / Short-Term Rental',
    eventDate,
    startTime,
    endTime,
    location,
    notes,
    agreedPrice,
    listPrice,
    depositPct = 50,
    reason,
    sendTo,
  } = (req.body || {}) as Record<string, any>

  if (!clientEmail || !String(clientEmail).includes('@')) {
    return res.status(400).json({ error: 'clientEmail is required' })
  }
  if (typeof agreedPrice !== 'number' || !(agreedPrice > 0)) {
    return res.status(400).json({ error: 'agreedPrice must be a positive number' })
  }
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate))) {
    return res.status(400).json({ error: 'eventDate (YYYY-MM-DD) is required' })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        name: String(clientName || clientEmail).trim(),
        business_name: businessName ? String(businessName).trim() : null,
        email: String(clientEmail).toLowerCase().trim(),
        event_type: String(eventType),
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location ? String(location).trim() : null,
        notes: [
          notes && String(notes).trim(),
          `Negotiated price: $${agreedPrice.toFixed(2)}${listPrice ? ` (list $${Number(listPrice).toFixed(2)})` : ''}`,
          reason && `Reason: ${String(reason).trim()}`,
        ].filter(Boolean).join('\n\n'),
        status: 'confirmed',
      })
      .select('id')
      .single()

    if (bookingErr || !booking) {
      console.error('[negotiated-quote] booking insert failed:', bookingErr)
      return res.status(500).json({ error: 'Failed to create booking', details: bookingErr?.message })
    }

    // Show the concession on the invoice rather than quietly billing less. A
    // client who can see what they were given asks for it again by name, and
    // the record explains the number to whoever reads it later.
    const items: BookingLineItem[] = [{
      description: `Photography — ${eventType}`,
      quantity: 1,
      unit_price: Number(listPrice) > 0 ? Number(listPrice) : agreedPrice,
      amount: Number(listPrice) > 0 ? Number(listPrice) : agreedPrice,
    }]
    if (Number(listPrice) > 0 && Number(listPrice) > agreedPrice) {
      const off = Math.round((Number(listPrice) - agreedPrice) * 100) / 100
      items.push({
        description: reason ? `Adjustment — ${reason}` : 'Agreed adjustment',
        quantity: 1,
        unit_price: -off,
        amount: -off,
      })
    }

    const result = await createQuoteForBooking({
      bookingId: booking.id as string,
      totalPrice: agreedPrice,
      depositPct: Number(depositPct),
      lineItems: items,
      description: `Photography services — ${eventType}`,
      origin: siteOrigin(req),
      // Preview to the owner when asked; the invoice and client record are
      // unaffected either way.
      sendTo: sendTo ? String(sendTo) : undefined,
    })

    return res.status(200).json({ success: true, bookingId: booking.id, ...result })
  } catch (err: any) {
    console.error('[negotiated-quote] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create negotiated quote' })
  }
}
