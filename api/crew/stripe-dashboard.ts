import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '../../lib/api-handlers/affiliates/_stripe-client.js';
import { getSupabaseAdmin, resolveConnectAccount, PHOTOGRAPHER_SELECT, type PhotographerRow } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Mint a one-time link into the contractor's own Stripe Express dashboard,
 * where they can see the deposit, their balance, and their payout schedule.
 *
 * Auth is a verified Supabase JWT, not the `x-admin-email` header the older
 * admin routes use. That header is caller-supplied, and this route hands back
 * a session into someone's financial account — it must prove who is asking.
 * The account is looked up *from the verified user id*, never from the request
 * body, so a caller cannot ask for somebody else's dashboard.
 *
 * Stripe login links are single-use and short-lived by design, which is why
 * this is a button that mints one on demand rather than a URL baked into an
 * email that would be dead by the time it was opened.
 */

async function resolveUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = await resolveUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to open your Stripe dashboard.' });

  try {
    const supabase = getSupabaseAdmin();

    // Look the contractor up by the verified user id only.
    const { data: photographer } = await supabase
      .from('photographers')
      .select(PHOTOGRAPHER_SELECT)
      .eq('user_id', userId)
      .maybeSingle();

    if (!photographer) {
      return res.status(404).json({
        error: 'No contractor record found for this account.',
        code: 'NOT_A_CONTRACTOR',
      });
    }

    const { accountId } = await resolveConnectAccount(supabase, photographer as PhotographerRow);
    if (!accountId) {
      return res.status(400).json({
        error: 'No Stripe account connected yet.',
        code: 'STRIPE_NOT_CONNECTED',
      });
    }

    const link = await getStripe().accounts.createLoginLink(accountId);
    return res.status(200).json({ url: link.url });
  } catch (err: any) {
    console.error('[crew/stripe-dashboard] failed:', err?.message);
    return res.status(500).json({
      error: 'Could not open your Stripe dashboard.',
      message: err?.message,
    });
  }
}
