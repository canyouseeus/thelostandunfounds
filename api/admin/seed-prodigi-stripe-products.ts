// @ts-nocheck
/**
 * POST /api/admin/seed-prodigi-stripe-products
 *
 * Creates Stripe Products + Prices for every active prodigi_products row
 * that doesn't already have one, and persists stripe_product_id/
 * stripe_price_id back onto the row. Idempotent — matched by
 * metadata.prodigi_product_id, safe to run repeatedly (e.g. after adding a
 * new print to the catalog).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdmin(req: VercelRequest): boolean {
  const email = (req.headers['x-admin-email'] as string || '').toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;
  const host = req.headers.host || '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Database not configured' });

  try {
    const stripe = getStripe();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error } = await supabase
      .from('prodigi_products')
      .select('*')
      .eq('status', 'active');

    if (error) return res.status(500).json({ error: error.message });
    if (!products || products.length === 0) {
      return res.status(200).json({ success: true, results: [] });
    }

    const existingProducts: any[] = [];
    let startingAfter: string | undefined;
    do {
      const page = await stripe.products.list({ limit: 100, starting_after: startingAfter, active: true });
      existingProducts.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1].id : undefined;
    } while (startingAfter);

    const results: any[] = [];

    for (const p of products) {
      let stripeProduct = existingProducts.find((sp) => sp.metadata?.prodigi_product_id === p.id);
      let productCreated = false;

      if (!stripeProduct) {
        stripeProduct = await stripe.products.create({
          name: p.title,
          description: p.description || undefined,
          images: p.image_url ? [p.image_url] : undefined,
          metadata: { prodigi_product_id: p.id, sku: p.sku },
        });
        productCreated = true;
      }

      const existingPrices = await stripe.prices.list({ product: stripeProduct.id, active: true, limit: 100 });
      const unitAmount = Math.round(Number(p.price) * 100);
      let price = existingPrices.data.find((pr) => pr.unit_amount === unitAmount && pr.currency === (p.currency || 'USD').toLowerCase() && !pr.recurring);
      let priceCreated = false;

      if (!price) {
        price = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: unitAmount,
          currency: (p.currency || 'USD').toLowerCase(),
          metadata: { prodigi_product_id: p.id },
        });
        priceCreated = true;
      }

      await supabase
        .from('prodigi_products')
        .update({ stripe_product_id: stripeProduct.id, stripe_price_id: price.id })
        .eq('id', p.id);

      results.push({ productId: p.id, sku: p.sku, stripeProductId: stripeProduct.id, stripePriceId: price.id, productCreated, priceCreated });
    }

    return res.status(200).json({ success: true, results });
  } catch (err: any) {
    console.error('seed-prodigi-stripe-products error:', err);
    return res.status(500).json({ error: err.message });
  }
}
