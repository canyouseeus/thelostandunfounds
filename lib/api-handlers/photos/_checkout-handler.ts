import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { roleFor, emailList } from '../_gallery-pass.js'
import { verifiedUser } from '../_turnstile.js'
import { buyerTotal, cleanBundles, galleryTotal } from '../../../src/lib/buyerPricing.js'

type PaymentMethod = 'stripe' | 'strike'

// Only allow returning the user to a same-origin gallery path. Anything else
// (absolute URLs, protocol-relative URLs, weird characters) gets rejected
// to prevent open-redirect abuse via the Stripe success/cancel URLs.
function safeReturnPath(input: string | undefined): string {
  if (!input) return '/gallery'
  if (!input.startsWith('/')) return '/gallery'
  if (input.startsWith('//')) return '/gallery'
  if (!/^\/[A-Za-z0-9/_-]*$/.test(input)) return '/gallery'
  return input
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { photoIds: bodyPhotoIds, email: bodyEmail, paymentMethod = 'strike', returnPath, wholeAlbum } = req.body as {
      photoIds: string[]
      /** À la carte "buy the whole album": every photo in it, at buyer_album_price. */
      wholeAlbum?: boolean
      email: string
      paymentMethod?: PaymentMethod
      returnPath?: string
    }

    const affiliateRef =
      (req.headers['x-affiliate-ref'] as string | undefined) ||
      req.headers.cookie?.match(/affiliate_ref=([^;]+)/)?.[1] ||
      null

    let photoIds: string[] = Array.isArray(bodyPhotoIds) ? [...new Set(bodyPhotoIds)] : []
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be a non-empty array' })
    }
    // The buyer's address. For an à la carte buyer it is replaced by their
    // signed-in address below, so the purchase is tied to who they really are.
    let email = typeof bodyEmail === 'string' ? bodyEmail.trim() : ''
    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }
    if (paymentMethod !== 'stripe' && paymentMethod !== 'strike') {
      return res.status(400).json({ error: 'paymentMethod must be "stripe" or "strike"' })
    }

    let count = photoIds.length

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Checkout] Missing Supabase credentials')
      return res.status(500).json({ error: 'Database configuration error' })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, title, library_id')
      .in('id', photoIds)

    if (photoError || !photos || photos.length !== photoIds.length) {
      return res.status(400).json({ error: 'One or more invalid photo IDs' })
    }

    // All selected photos must belong to the same gallery so a single price
    // tier applies. (Storefront UI selects within one gallery at a time.)
    const libraryIds = new Set(photos.map(p => p.library_id))
    if (libraryIds.size !== 1) {
      return res.status(400).json({
        error: 'All selected photos must come from the same gallery',
      })
    }
    const libraryId = photos[0].library_id

    const { data: library, error: libraryError } = await supabase
      .from('photo_libraries')
      .select('id, name, price, is_private, invited_emails, buyer_emails, buyer_price, buyer_bundles, buyer_album_price, album_price, owner_id, user_id')
      .eq('id', libraryId)
      .single()

    if (libraryError || !library) {
      return res.status(500).json({ error: 'Failed to load gallery' })
    }

    const { data: pricingOptions } = await supabase
      .from('gallery_pricing_options')
      .select('name, price, photo_count')
      .eq('library_id', libraryId)
      .eq('is_active', true)
      .order('photo_count', { ascending: false })

    // Whole album (owner, 2026-11-02): one price for every photo in the
    // gallery, for every buyer. Counted from the database, not the page.
    const albumPrice = Number(library.album_price) > 0 ? Number(library.album_price) : null
    const allAlbumIds = async (): Promise<string[]> => {
      const { data: albumPhotos } = await supabase.from('photos').select('id').eq('library_id', library.id)
      return (albumPhotos || []).map(p => p.id)
    }

    // À la carte (owner, 2026-11-02): a private album sells every photo to the
    // people on its buyer list at buyer_price each. Album owners never pay,
    // and nobody else can buy from a private album. Checked against the
    // signed-in session, never an address from the request.
    let buyerPrice: number | null = null
    let buyerAmount: number | null = null
    if (library.is_private || emailList(library.buyer_emails).length > 0) {
      const user = await verifiedUser(req)
      const role = user ? roleFor(library, { email: user.email, userId: user.id }) : null
      if (role === 'buyer' && user?.email) {
        buyerPrice = Number(library.buyer_price) || 5
        email = user.email.trim().toLowerCase()
        // Every photo in the album, for "buy the whole album" — from the
        // database, not the page (which may not have loaded them all).
        const albumIds = await allAlbumIds()
        if (wholeAlbum === true) {
          photoIds = albumIds
          count = photoIds.length
        }
        buyerAmount = buyerTotal(count, {
          single: buyerPrice,
          bundles: cleanBundles(library.buyer_bundles),
          // Their own whole-album price, else the gallery's.
          albumPrice: Number(library.buyer_album_price) > 0 ? Number(library.buyer_album_price) : albumPrice,
          albumCount: albumIds.length,
        })
      } else if (role === 'owner') {
        return res.status(400).json({ error: 'You already have every photo in this album — no purchase needed.' })
      } else if (library.is_private) {
        return res.status(403).json({ error: 'Sign in with the email your invite was sent to.' })
      }
    }

    const singlePrice = buyerPrice ?? (Number(library.price) || 0)
    if (singlePrice <= 0) {
      console.error('[Checkout] Gallery has no price set:', libraryId)
      return res.status(500).json({ error: 'This gallery is not available for purchase' })
    }

    // Bundle math: greedily apply the largest bundles first, fall back to the
    // gallery's per-photo price for the remainder. À la carte buyers use their
    // own bundles and whole-album price (src/lib/buyerPricing.ts).
    let amount = buyerAmount ?? 0
    if (buyerAmount == null) {
      let albumCount = 0
      if (albumPrice || wholeAlbum === true) {
        const albumIds = await allAlbumIds()
        albumCount = albumIds.length
        if (wholeAlbum === true) {
          if (!albumPrice) return res.status(400).json({ error: 'This gallery has no whole-album price.' })
          photoIds = albumIds
          count = photoIds.length
        }
      }
      amount = galleryTotal(count, {
        single: singlePrice,
        options: (pricingOptions || []).map(o => ({ photo_count: Number(o.photo_count), price: Number(o.price) })),
        albumPrice,
        albumCount,
      })
    }

    if (amount <= 0) {
      return res.status(500).json({ error: 'Unable to compute a valid price' })
    }

    const description = `${library.name} — ${count} photo${count === 1 ? '' : 's'}`

    if (paymentMethod === 'stripe') {
      return await createStripeCheckout({
        res,
        req,
        supabase,
        amount,
        description,
        email,
        photoIds,
        libraryId,
        affiliateRef,
        count,
        returnPath,
      })
    }

    return await createStrikeInvoice({
      res,
      supabase,
      amount,
      description,
      email,
      photoIds,
      affiliateRef,
      count,
    })
  } catch (error: any) {
    console.error('[Checkout] Fatal Error:', error)
    return res.status(500).json({
      error: 'Checkout failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

async function createStripeCheckout(args: {
  res: VercelResponse
  req: VercelRequest
  supabase: any
  amount: number
  description: string
  email: string
  photoIds: string[]
  libraryId: string
  affiliateRef: string | null
  count: number
  returnPath?: string
}) {
  const {
    res,
    req,
    supabase,
    amount,
    description,
    email,
    photoIds,
    libraryId,
    affiliateRef,
    count,
    returnPath,
  } = args

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    console.error('[Checkout] Missing STRIPE_SECRET_KEY')
    return res.status(500).json({ error: 'Stripe not configured' })
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

  // Pre-create the order row in pending state so the webhook only has to flip
  // it to completed and can locate it by stripe session id.
  const { data: photoOrder, error: orderError } = await supabase
    .from('photo_orders')
    .insert({
      email,
      total_amount_cents: Math.round(amount * 100),
      paypal_order_id: `stripe_pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payment_status: 'pending',
      affiliate_code: affiliateRef,
    })
    .select()
    .single()

  if (orderError || !photoOrder) {
    console.error('[Checkout] Failed to insert pending Stripe order:', orderError)
    return res.status(500).json({ error: 'Failed to create order' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    // Omitted so Checkout uses the Dashboard payment method configuration
    // (adds Link, Cash App, Klarna, Amazon Pay). See _payments-stripe-handler.
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          product_data: { name: description },
        },
      },
    ],
    metadata: {
      source: 'tlau-photos',
      photoOrderId: photoOrder.id,
      libraryId,
      photoIds: photoIds.join(','),
      email,
      affiliateRef: affiliateRef || '',
      count: String(count),
    },
    payment_intent_data: {
      description,
      metadata: {
        source: 'tlau-photos',
        photoOrderId: photoOrder.id,
        affiliateRef: affiliateRef || '',
      },
    },
    success_url: `${origin}${safeReturnPath(returnPath)}?payment=success&order=${photoOrder.id}`,
    cancel_url: `${origin}${safeReturnPath(returnPath)}?payment=cancelled`,
    allow_promotion_codes: true,
  })

  // Stamp the real session id onto the order so the webhook can find it.
  await supabase
    .from('photo_orders')
    .update({ paypal_order_id: session.id })
    .eq('id', photoOrder.id)

  return res.status(200).json({
    method: 'stripe',
    sessionId: session.id,
    url: session.url,
    orderId: photoOrder.id,
    amount,
  })
}

async function createStrikeInvoice(args: {
  res: VercelResponse
  supabase: any
  amount: number
  description: string
  email: string
  photoIds: string[]
  affiliateRef: string | null
  count: number
}) {
  const { res, supabase, amount, description, email, photoIds, affiliateRef, count } = args

  const apiKey = process.env.STRIKE_API_KEY
  if (!apiKey) {
    console.error('[Checkout] Missing STRIKE_API_KEY')
    return res.status(500).json({ error: 'Strike API key not configured' })
  }

  const correlationId = `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const invoiceResponse = await fetch('https://api.strike.me/v1/invoices', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      correlationId,
      description: `${description} (BTC)`,
      amount: { currency: 'USD', amount: amount.toFixed(2) },
    }),
  })

  if (!invoiceResponse.ok) {
    const errorText = await invoiceResponse.text()
    console.error('[Checkout] Strike Invoice Error:', errorText)
    return res.status(500).json({ error: 'Failed to create Strike invoice', details: errorText })
  }

  const invoice = await invoiceResponse.json()
  const invoiceId = invoice.invoiceId

  const quoteResponse = await fetch(`https://api.strike.me/v1/invoices/${invoiceId}/quote`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!quoteResponse.ok) {
    const errorText = await quoteResponse.text()
    console.error('[Checkout] Strike Quote Error:', errorText)
    return res.status(500).json({ error: 'Failed to generate Lightning quote', details: errorText })
  }

  const quote = await quoteResponse.json()

  const { data: photoOrder, error: dbOrderError } = await supabase
    .from('photo_orders')
    .insert({
      email,
      total_amount_cents: Math.round(amount * 100),
      paypal_order_id: invoiceId,
      payment_status: 'pending',
      affiliate_code: affiliateRef,
    })
    .select()
    .single()

  if (dbOrderError || !photoOrder) {
    console.error('[Checkout] Strike order insert error:', dbOrderError)
    return res.status(500).json({ error: 'Failed to save order record' })
  }

  // Existing pattern: entitlements created at order-creation time with a
  // 48-hour expiry. Strike-side payment confirmation is currently best-effort.
  const entitlements = photoIds.map(photoId => ({
    order_id: photoOrder.id,
    photo_id: photoId,
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }))

  const { error: dbEntitlementsError } = await supabase
    .from('photo_entitlements')
    .insert(entitlements)

  if (dbEntitlementsError) {
    console.error('[Checkout] Strike entitlements insert error:', dbEntitlementsError)
    return res.status(500).json({ error: 'Failed to save order items' })
  }

  return res.status(200).json({
    method: 'strike',
    invoiceId,
    lnInvoice: quote.lnInvoice,
    expirationInSec: quote.expirationInSec,
    orderId: photoOrder.id,
    amount,
    count,
  })
}
