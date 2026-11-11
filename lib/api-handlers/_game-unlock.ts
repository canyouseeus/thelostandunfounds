import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHAPTERS } from '../../src/lib/game/story.js';

/** Checkout metadata.source for FR33DOM INC. chapter purchases. */
export const GAME_CHECKOUT_SOURCE = 'tlau-game';

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
