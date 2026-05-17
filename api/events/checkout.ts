/**
 * POST /api/events/checkout
 *
 * Creates a Stripe Checkout Session for a paid event ticket.
 * On success the frontend redirects the buyer to Stripe; when payment
 * completes the Stripe webhook finalises the event_order, creates the
 * event_ticket row, and triggers affiliate commissions.
 *
 * Body:
 *   eventId      string  – UUID of the event
 *   tierId?      string  – ticket_tiers element id (null for flat-price events)
 *   amountCents  number  – final price in cents (validated server-side)
 *   quantity?    number  – defaults to 1
 *   email        string  – buyer's email
 *   name?        string  – buyer's display name
 *   formResponses? object – custom-form answers to persist with order
 *   returnPath?  string  – safe same-origin path for success/cancel redirect
 */

import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

function safeReturnPath(input: string | undefined): string {
  if (!input) return '/events'
  if (!input.startsWith('/')) return '/events'
  if (input.startsWith('//')) return '/events'
  if (!/^\/[A-Za-z0-9/_?=-]*$/.test(input)) return '/events'
  return input
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    eventId,
    tierId,
    amountCents,
    quantity = 1,
    email,
    name,
    formResponses,
    returnPath,
    userId,
  } = req.body as {
    eventId: string
    tierId?: string | null
    amountCents: number
    quantity?: number
    email: string
    name?: string
    formResponses?: Record<string, any>
    returnPath?: string
    userId?: string
  }

  // Read affiliate ref from cookie or header (same pattern as photo/shop checkouts)
  const affiliateRef =
    (req.headers['x-affiliate-ref'] as string | undefined) ||
    req.headers.cookie?.match(/affiliate_ref=([^;]+)/)?.[1] ||
    null

  if (!eventId) return res.status(400).json({ error: 'eventId is required' })
  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!amountCents || amountCents <= 0) return res.status(400).json({ error: 'amountCents must be > 0' })

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration error' })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch the event to validate it's still purchasable and get display name
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, price_cents, capacity, status, ticket_tiers')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  if (event.status !== 'published') {
    return res.status(400).json({ error: 'Event is not available for purchase' })
  }

  // Server-side price validation: resolve expected price from event data
  let expectedCents: number
  if (tierId && event.ticket_tiers) {
    const tiers = Array.isArray(event.ticket_tiers) ? event.ticket_tiers : []
    const tier = tiers.find((t: any) => t.id === tierId)
    expectedCents = tier ? Number(tier.price_cents) * (quantity || 1) : 0
  } else {
    expectedCents = Number(event.price_cents) * (quantity || 1)
  }

  // Allow a small tolerance for dynamic-pricing events where price may have
  // ticked up between the user seeing the price and POSTing. Reject if the
  // client is sending LESS than what is currently expected (fraud guard) but
  // accept MORE (buyer already saw the updated price).
  if (amountCents < expectedCents) {
    return res.status(400).json({
      error: 'Ticket price has changed. Please refresh and try again.',
      expectedCents,
    })
  }

  // Pre-create the event_order in pending state so the webhook can find it
  const { data: order, error: orderError } = await supabase
    .from('event_orders')
    .insert({
      event_id: eventId,
      user_id: userId || null,
      customer_email: email.toLowerCase(),
      customer_name: name || null,
      tier_id: tierId || null,
      quantity: quantity || 1,
      amount_cents: amountCents,
      affiliate_ref: affiliateRef,
      form_responses: formResponses || null,
      status: 'pending',
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('[events/checkout] Failed to insert event_order:', orderError)
    return res.status(500).json({ error: 'Failed to create order' })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
  })

  const origin = (
    process.env.SITE_URL ||
    (req.headers['x-forwarded-proto'] && req.headers['host']
      ? `${req.headers['x-forwarded-proto']}://${req.headers['host']}`
      : 'https://www.thelostandunfounds.com')
  ).replace(/\/$/, '')

  const tierLabel = tierId
    ? (() => {
        const tiers = Array.isArray(event.ticket_tiers) ? event.ticket_tiers : []
        const t = tiers.find((x: any) => x.id === tierId)
        return t ? ` — ${t.name}` : ''
      })()
    : ''

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [
      {
        quantity: quantity || 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amountCents / (quantity || 1)),
          product_data: {
            name: `${event.title}${tierLabel}`,
            description: `Event ticket`,
          },
        },
      },
    ],
    metadata: {
      source: 'tlau-events',
      eventOrderId: order.id,
      eventId,
      tierId: tierId || '',
      email,
      affiliateRef: affiliateRef || '',
      quantity: String(quantity || 1),
    },
    payment_intent_data: {
      description: `Ticket: ${event.title}`,
      metadata: {
        source: 'tlau-events',
        eventOrderId: order.id,
        affiliateRef: affiliateRef || '',
      },
    },
    success_url: `${origin}${safeReturnPath(returnPath)}?payment=success&order=${order.id}`,
    cancel_url: `${origin}${safeReturnPath(returnPath)}?payment=cancelled`,
    allow_promotion_codes: true,
  })

  // Stamp the real session id so the webhook can look up the order
  await supabase
    .from('event_orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id)

  return res.status(200).json({
    sessionId: session.id,
    url: session.url,
    orderId: order.id,
  })
}
