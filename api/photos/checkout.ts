import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { photoIds, email, paidCheckout } = req.body

    // Get affiliate reference from header or cookie
    const affiliateRef = req.headers['x-affiliate-ref'] ||
      (req.headers.cookie?.match(/affiliate_ref=([^;]+)/)?.[1]);

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be a non-empty array' })
    }

    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    const count = photoIds.length;

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Checkout] Missing Supabase credentials')
      return res.status(500).json({ error: 'Database configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify photo IDs exist and find associated library
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, title, library_id')
      .in('id', photoIds)

    if (photoError || photos.length !== photoIds.length) {
      return res.status(400).json({ error: 'One or more invalid photo IDs' })
    }

    const libraryId = photos[0].library_id;

    // Server-side credit guard: never charge for photos a user has credits for,
    // regardless of what the client sent. Apply credits to as many photos as
    // possible, then price/charge only the leftover photos.
    const normalizedEmail = String(email).trim().toLowerCase()
    const { data: creditRow } = await supabase
      .from('gallery_credits')
      .select('credits_remaining')
      .eq('email', normalizedEmail)
      .single()

    const availableCredits = creditRow?.credits_remaining ?? 0
    const creditsToApply = Math.min(availableCredits, count)

    let paidPhotoIds: string[] = photoIds
    let creditedOrderId: string | null = null
    let creditsRemainingAfter = availableCredits

    if (creditsToApply > 0) {
      const { data: deductResult, error: deductError } = await supabase.rpc(
        'deduct_gallery_credits',
        { p_email: normalizedEmail, p_count: creditsToApply }
      )

      if (deductError || !deductResult || deductResult.success === false) {
        console.warn('[Checkout] Credit deduct RPC failed, proceeding without credits:', deductError)
      } else {
        creditsRemainingAfter = deductResult.credits_remaining ?? 0
        const creditedPhotoIds = photoIds.slice(0, creditsToApply)
        paidPhotoIds = photoIds.slice(creditsToApply)

        const freeOrderId = `credits_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const { data: photoOrder, error: dbOrderError } = await supabase
          .from('photo_orders')
          .insert({
            email: normalizedEmail,
            total_amount_cents: 0,
            paypal_order_id: freeOrderId,
            payment_status: 'completed',
            affiliate_code: affiliateRef ? String(affiliateRef) : null
          })
          .select()
          .single()

        if (dbOrderError || !photoOrder) {
          console.error('[Checkout] Credit order insert error:', dbOrderError)
          return res.status(500).json({ error: 'Failed to save credit order', details: dbOrderError?.message })
        }

        creditedOrderId = photoOrder.id

        const creditEntitlements = creditedPhotoIds.map((photoId: string) => ({
          order_id: photoOrder.id,
          photo_id: photoId,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }))

        const { error: dbEntitlementsError } = await supabase
          .from('photo_entitlements')
          .insert(creditEntitlements)

        if (dbEntitlementsError) {
          console.error('[Checkout] Credit entitlements error:', dbEntitlementsError)
          return res.status(500).json({ error: 'Failed to save entitlements', details: dbEntitlementsError.message })
        }

        // All photos covered by credits — done.
        if (paidPhotoIds.length === 0) {
          return res.status(200).json({
            free: true,
            orderId: creditedOrderId,
            credits_used: creditsToApply,
            credits_remaining: creditsRemainingAfter
          })
        }
      }
    }

    // Re-scope pricing variables to the leftover photos only.
    const paidCount = paidPhotoIds.length

    // Fetch pricing options for this library with retry logic
    const MAX_RETRIES = 3;
    let pricingOptions = null;
    let pricingError = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const result = await supabase
          .from('gallery_pricing_options')
          .select('*')
          .eq('library_id', libraryId)
          .eq('is_active', true)
          .order('photo_count', { ascending: false });

        if (!result.error && result.data && result.data.length > 0) {
          pricingOptions = result.data;
          break; // Success
        }

        if (result.error) pricingError = result.error;
        console.warn(`[Checkout] Attempt ${i + 1} failed to fetch pricing options for library ${libraryId}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
      } catch (err) {
        console.error(`[Checkout] Attempt ${i + 1} threw error fetching pricing:`, err);
      }
    }

    if (!pricingOptions || pricingOptions.length === 0) {
      console.warn('No pricing options found for library:', libraryId, pricingError);
    } else {
      console.log(`[Checkout] Found ${pricingOptions.length} options for lib ${libraryId}:`,
        pricingOptions.map((o: any) => `${o.name} (${o.photo_count}) $${o.price}`).join(', ')
      );
    }

    // Dynamic Pricing Calculation (scoped to photos NOT covered by credits)
    let amount = 0;
    let remaining = paidCount;
    const sortedOptions = pricingOptions || [];

    // Fallback single price for any photos that don't fit a bundle.
    // Prefer the library's DB-configured per-photo price; only fall back to
    // a deterrent when nothing is configured AND this is the no-credits path.
    const { data: library } = await supabase
      .from('photo_libraries')
      .select('price')
      .eq('id', libraryId)
      .single();

    const libraryPrice = library?.price != null ? parseFloat(library.price.toString()) : 0;
    const singlePrice = libraryPrice > 0
      ? libraryPrice
      : (paidCheckout && creditsToApply === 0 ? 1000 : 0);

    for (const option of sortedOptions) {
      if (option.photo_count <= 0) continue;
      const numBundles = Math.floor(remaining / option.photo_count);
      if (numBundles > 0) {
        amount += numBundles * parseFloat(option.price.toString());
        remaining %= option.photo_count;
      }
    }

    if (remaining > 0) {
      amount += remaining * parseFloat(singlePrice.toString());
    }

    // Safety Check: Log warning if multiple photos selected but price equals straightforward multiplication of single price
    // This implies no bundle logic was applied, which might be unintended if bundles exist
    if (paidCount > 2 && Math.abs(amount - (paidCount * parseFloat(singlePrice.toString()))) < 0.01) {
      console.warn(`[Pricing Warning] Order for ${paidCount} items resulted in $${amount} (approx ${paidCount} * $${singlePrice}). Possible missed bundle application. Options available: ${pricingOptions ? pricingOptions.length : 0}`);
    }

    // Free path — skip payment entirely, grant access immediately
    if (amount === 0) {
      const freeOrderId = `free_${Date.now()}_${Math.random().toString(36).substring(7)}`

      const { data: photoOrder, error: dbOrderError } = await supabase
        .from('photo_orders')
        .insert({
          email,
          total_amount_cents: 0,
          paypal_order_id: freeOrderId,
          payment_status: 'completed',
          affiliate_code: affiliateRef ? String(affiliateRef) : null
        })
        .select()
        .single()

      if (dbOrderError) {
        console.error('[Checkout] Free order insert error:', dbOrderError)
        return res.status(500).json({ error: 'Failed to save free order', details: dbOrderError.message })
      }

      const entitlements = paidPhotoIds.map((photoId: string) => ({
        order_id: photoOrder.id,
        photo_id: photoId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }))

      const { error: dbEntitlementsError } = await supabase
        .from('photo_entitlements')
        .insert(entitlements)

      if (dbEntitlementsError) {
        console.error('[Checkout] Free entitlements error:', dbEntitlementsError)
        return res.status(500).json({ error: 'Failed to save entitlements', details: dbEntitlementsError.message })
      }

      return res.status(200).json({
        free: true,
        orderId: photoOrder.id,
        credits_used: creditsToApply,
        credits_remaining: creditsRemainingAfter
      })
    }

    // Create Strike Invoice
    const apiKey = process.env.STRIKE_API_KEY
    if (!apiKey) {
      console.error('[Checkout] Missing STRIKE_API_KEY')
      return res.status(500).json({ error: 'Strike API key not configured' })
    }

    const correlationId = `gallery_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const invoiceResponse = await fetch('https://api.strike.me/v1/invoices', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        correlationId,
        description: `Photo Download Access (${paidCount} photos)`,
        amount: {
          currency: 'USD',
          amount: amount.toFixed(2),
        },
      }),
    })

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text()
      console.error('Strike Invoice Error:', errorText)
      return res.status(500).json({ error: 'Failed to create Strike invoice', details: errorText })
    }

    const invoice = await invoiceResponse.json()
    const invoiceId = invoice.invoiceId

    // Get Lightning Quote for the invoice
    const quoteResponse = await fetch(`https://api.strike.me/v1/invoices/${invoiceId}/quote`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text()
      console.error('Strike Quote Error:', errorText)
      return res.status(500).json({ error: 'Failed to generate Lightning quote', details: errorText })
    }

    const quote = await quoteResponse.json()

    // Persist Order to Supabase (Pending Status)
    // We repurpose paypal_order_id to store the Strike invoiceId
    const { data: photoOrder, error: dbOrderError } = await supabase
      .from('photo_orders')
      .insert({
        email,
        total_amount_cents: Math.round(amount * 100),
        paypal_order_id: invoiceId, // Repurposing this column for Strike reference
        payment_status: 'pending', // Initial status
        affiliate_code: affiliateRef ? String(affiliateRef) : null
      })
      .select()
      .single()

    if (dbOrderError) {
      console.error('[Checkout] Database Order Error:', {
        error: dbOrderError,
        payload: {
          email,
          total_amount_cents: Math.round(amount * 100),
          paypal_order_id: invoiceId
        }
      })
      return res.status(500).json({
        error: 'Failed to save order record',
        details: dbOrderError.message
      })
    }

    // Create Pending Entitlements (only for the photos NOT covered by credits)
    const entitlements = paidPhotoIds.map((photoId: string) => ({
      order_id: photoOrder.id,
      photo_id: photoId,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    }))

    const { error: dbEntitlementsError } = await supabase
      .from('photo_entitlements')
      .insert(entitlements)

    if (dbEntitlementsError) {
      console.error('[Checkout] Database Entitlements Error:', {
        error: dbEntitlementsError,
        orderId: photoOrder.id,
        paidPhotoIds
      })
      return res.status(500).json({
        error: 'Failed to save order items',
        details: dbEntitlementsError.message
      })
    }

    return res.status(200).json({
      invoiceId: invoiceId,
      lnInvoice: quote.lnInvoice,
      expirationInSec: quote.expirationInSec,
      amount: amount,
      credits_used: creditsToApply,
      credits_remaining: creditsRemainingAfter,
      credited_order_id: creditedOrderId,
      paid_photo_count: paidCount
    })

  } catch (error: any) {
    console.error('[Checkout] Fatal Error:', error)
    return res.status(500).json({
      error: 'Checkout failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
