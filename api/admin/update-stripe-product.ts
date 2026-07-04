// @ts-nocheck
/**
 * POST /api/admin/update-stripe-product
 *
 * Syncs an edited SERVICE_PRODUCTS entry to Stripe: updates the product's
 * name/description/active flag, and — since Stripe prices are immutable —
 * creates a new Price when the amount changed, points the product's
 * default_price at it, and archives the old default price.
 *
 * Products are matched by metadata.service_id (same convention as
 * seed-stripe-products.ts) rather than a stored Stripe ID, so this works
 * whether or not the catalog has been seeded yet.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
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

  const { serviceId, name, description, category, price, priceType, interval, status } = req.body || {};

  if (!serviceId || !name || price === undefined || price === null) {
    return res.status(400).json({ error: 'serviceId, name, and price are required' });
  }

  try {
    const stripe = getStripe();
    const active = status !== 'draft';

    let product = await findProductByServiceId(stripe, serviceId);

    if (!product) {
      product = await stripe.products.create({
        name,
        description: description || undefined,
        active,
        metadata: { service_id: serviceId, category: category || '' },
      });
    } else {
      product = await stripe.products.update(product.id, {
        name,
        description: description || undefined,
        active,
        metadata: { ...product.metadata, service_id: serviceId, category: category || product.metadata?.category || '' },
      });
    }

    const unitAmount = Math.round(parseFloat(price) * 100);
    const recurring = priceType === 'recurring' ? { interval: interval || 'month' } : undefined;

    const currentPriceId = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
    let currentPrice = currentPriceId ? await stripe.prices.retrieve(currentPriceId) : null;

    const priceMatches = currentPrice
      && currentPrice.unit_amount === unitAmount
      && currentPrice.currency === 'usd'
      && (recurring ? currentPrice.recurring?.interval === recurring.interval : !currentPrice.recurring);

    let priceId = currentPriceId || null;

    if (!priceMatches) {
      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'usd',
        ...(recurring ? { recurring } : {}),
        metadata: { service_id: serviceId },
      });
      await stripe.products.update(product.id, { default_price: newPrice.id });
      if (currentPriceId && currentPriceId !== newPrice.id) {
        await stripe.prices.update(currentPriceId, { active: false }).catch(() => null);
      }
      priceId = newPrice.id;
    }

    return res.status(200).json({
      success: true,
      productId: product.id,
      priceId,
    });
  } catch (err: any) {
    console.error('update-stripe-product error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function findProductByServiceId(stripe: ReturnType<typeof getStripe>, serviceId: string) {
  let startingAfter: string | undefined;
  do {
    const page = await stripe.products.list({ limit: 100, starting_after: startingAfter });
    const match = page.data.find((p) => p.metadata?.service_id === serviceId);
    if (match) return match;
    startingAfter = page.has_more ? page.data[page.data.length - 1].id : undefined;
  } while (startingAfter);
  return null;
}
