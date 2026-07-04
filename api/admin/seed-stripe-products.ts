// @ts-nocheck
/**
 * POST /api/admin/seed-stripe-products
 *
 * One-time endpoint: creates Stripe Products + Prices for the real service
 * catalog (SERVICE_PRODUCTS in src/data/stripe-products.ts). Idempotent —
 * safe to run more than once. Existing products are matched by
 * metadata.service_id rather than recreated.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js';
import { SERVICE_PRODUCTS } from '../../src/data/stripe-products.js';

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

  try {
    const stripe = getStripe();

    // Pull every product we already have so we can match by metadata.service_id
    // without relying on the (eventually-consistent) Search API.
    const existingProducts: any[] = [];
    let startingAfter: string | undefined;
    do {
      const page = await stripe.products.list({ limit: 100, starting_after: startingAfter, active: true });
      existingProducts.push(...page.data);
      startingAfter = page.has_more ? page.data[page.data.length - 1].id : undefined;
    } while (startingAfter);

    const results: any[] = [];

    for (const svc of SERVICE_PRODUCTS) {
      let product = existingProducts.find((p) => p.metadata?.service_id === svc.id);
      let productCreated = false;

      if (!product) {
        product = await stripe.products.create({
          name: svc.name,
          description: svc.description,
          metadata: { service_id: svc.id, category: svc.category },
        });
        productCreated = true;
      }

      const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
      const unitAmount = Math.round(svc.price * 100);
      let price = existingPrices.data.find((p) => {
        const sameAmount = p.unit_amount === unitAmount && p.currency === 'usd';
        const sameRecurrence = svc.priceType === 'recurring'
          ? p.recurring?.interval === svc.interval
          : !p.recurring;
        return sameAmount && sameRecurrence;
      });
      let priceCreated = false;

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: 'usd',
          ...(svc.priceType === 'recurring' ? { recurring: { interval: svc.interval || 'month' } } : {}),
          metadata: { service_id: svc.id },
        });
        priceCreated = true;
      }

      results.push({
        serviceId: svc.id,
        name: svc.name,
        productId: product.id,
        priceId: price.id,
        productCreated,
        priceCreated,
      });
    }

    return res.status(200).json({ success: true, results });
  } catch (err: any) {
    console.error('seed-stripe-products error:', err);
    return res.status(500).json({ error: err.message });
  }
}
