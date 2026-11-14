import { createHash } from 'crypto';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHAPTERS } from '../../src/lib/game/story.js';
import { triggerReferralCommission } from './affiliates/_commission-trigger.js';

/** Checkout metadata.source for FR33 D. OHM INC. chapter purchases. */
export const GAME_CHECKOUT_SOURCE = 'tlau-game';

/**
 * An affiliate code as the browser sent it, or null. Only letters, digits,
 * dash and underscore pass, because the commission trigger puts the code
 * into a PostgREST filter.
 */
export function cleanAffiliateRef(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : null;
}

/**
 * register_referral_conversion keys a sale by a uuid (its order_id). A
 * chapter sale has only a Stripe session id, so derive a stable uuid from it:
 * the webhook and the confirm backstop land on the same sale, and the RPC's
 * (source, order_id) idempotency keeps it to one commission.
 */
export function gameSaleId(sessionId: string): string {
  const h = createHash('sha256').update(`tlau-game:${sessionId}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * Owner decision, 2026-11-12: a paid chapter pays the same split as every
 * other product (42% / 2% / 1% of profit, KING MIDAS 8%, the rest of the
 * program's shares) and then the owner's 10% of what is kept. A chapter is
 * a digital good with no cost, so the profit is what the buyer paid. With no
 * referrer, only the owner's 10% is queued. Never throws: the unlock already
 * happened, and a missed commission is logged like every other product's.
 */
async function registerChapterCommission(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  userId: string,
): Promise<void> {
  const email = session.customer_details?.email || session.customer_email;
  const grossAmount = (session.amount_total ?? 0) / 100;
  if (!email || !(grossAmount > 0)) return;
  try {
    const result = await triggerReferralCommission(supabase, {
      email,
      source: 'game',
      sourceId: gameSaleId(session.id),
      grossAmount,
      cost: 0,
      userId,
      fallbackAffiliateCode: cleanAffiliateRef(session.metadata?.affiliateRef),
    });
    if (result.triggered) {
      console.log('[game] chapter commission registered', { session: session.id, amount: result.amount });
    } else if (result.reason !== 'no_referrer' && result.reason !== 'already_recorded') {
      console.error('[game] chapter commission not registered', session.id, result.reason);
    }
  } catch (err: any) {
    console.error('[game] chapter commission failed', session.id, err?.message || err);
  }
}

/**
 * Grant a paid chapter from a Stripe Checkout Session that Stripe itself
 * reported (webhook) or that the server fetched from Stripe (confirm).
 * Never call this with a session object that came from the browser.
 * Idempotent: one unlock row per (user, chapter); the session id is unique.
 */
export async function grantChapterUnlock(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ granted: boolean; reason?: string; userId?: string; chapterId?: string }> {
  if (session.metadata?.source !== GAME_CHECKOUT_SOURCE) return { granted: false, reason: 'not_game' };
  if (session.payment_status !== 'paid') return { granted: false, reason: 'unpaid' };
  const userId = session.metadata?.user_id;
  const chapterId = session.metadata?.chapter_id;
  const chapter = chapterId ? CHAPTERS[chapterId] : undefined;
  if (!userId || !chapter || chapter.priceCents <= 0) return { granted: false, reason: 'bad_metadata' };
  if ((session.amount_total ?? 0) < chapter.priceCents) {
    console.error('[game] session paid less than chapter price', session.id, session.amount_total);
    return { granted: false, reason: 'underpaid' };
  }

  const { error } = await supabase.from('game_unlocks').upsert(
    {
      user_id: userId,
      chapter_id: chapter.id,
      stripe_session_id: session.id,
      amount_cents: session.amount_total,
      status: 'active',
    },
    { onConflict: 'user_id,chapter_id', ignoreDuplicates: true },
  );
  if (error) throw new Error(`game unlock failed: ${error.message}`);
  console.log('[game] chapter unlocked', { userId, chapterId: chapter.id, session: session.id });
  await registerChapterCommission(supabase, session, userId);
  return { granted: true, userId, chapterId: chapter.id };
}

/** A refunded chapter purchase stops unlocking the chapter. */
export async function revokeChapterUnlock(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase
    .from('game_unlocks')
    .update({ status: 'refunded' })
    .eq('stripe_session_id', sessionId);
  if (error) console.error('[game] revoke unlock failed', sessionId, error.message);
}
