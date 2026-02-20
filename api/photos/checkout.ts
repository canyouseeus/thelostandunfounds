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
    const { photoIds, email } = req.body

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

    // Dynamic Pricing Calculation
    let amount = 0;
    let remaining = count;
    const sortedOptions = pricingOptions || [];

    // Fallback single price
    const { data: library } = await supabase
      .from('photo_libraries')
      .select('price')
      .eq('id', libraryId)
      .single();

    const singlePrice = sortedOptions.find((o: any) => o.photo_count === 1)?.price || library?.price || 5.00;

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
    if (count > 2 && Math.abs(amount - (count * parseFloat(singlePrice.toString()))) < 0.01) {
      console.warn(`[Pricing Warning] Order for ${count} items resulted in $${amount} (approx ${count} * $${singlePrice}). Possible missed bundle application. Options available: ${pricingOptions ? pricingOptions.length : 0}`);
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
        description: `Photo Download Access (${count} photos)`,
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

    // Create Pending Entitlements
    const entitlements = photoIds.map((photoId: string) => ({
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
        photoIds
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
