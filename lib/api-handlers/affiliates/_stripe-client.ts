import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  cached = new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  });
  return cached;
}

export function getSiteOrigin(reqHost?: string, proto?: string): string {
  const env = process.env.SITE_URL;
  if (env) return env.replace(/\/$/, '');
  if (reqHost && proto) return `${proto}://${reqHost}`.replace(/\/$/, '');
  return 'https://www.thelostandunfounds.com';
}
