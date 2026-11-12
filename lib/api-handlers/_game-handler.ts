/**
 * FR33 D. OHM INC. — /api/game?action=…
 *
 * Signed-in players only (verified Supabase token). The browser never tells
 * the server what happened: it sends a choice id, the server rolls the dice
 * with crypto randomness, moves the save, and writes any gold as ledger rows.
 * Each story reward is unique per player (game_gold_ledger unique(user_id, ref)),
 * so replaying never pays twice.
 *
 * GET  state                 save, gold, unlocks, credits, quests
 * POST choose   {choiceId}   take a choice
 * POST chapter  {chapterId}  jump to a chapter start you own / have reached
 * POST reset                 new game (gold, unlocks and claimed rewards stay)
 * POST daily                 daily check-in gold (once per Central day)
 * POST redeem   {gold}       gold → single-use Stripe promotion code
 * POST buy      {chapterId}  Stripe Checkout for a paid chapter
 * POST confirm  {sessionId}  backstop for a slow webhook: fetch the session from Stripe
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomInt, randomBytes } from 'crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { verifiedUser } from './_turnstile.js';
import { getStripe, getSiteOrigin } from './affiliates/_stripe-client.js';
import { cleanAffiliateRef, grantChapterUnlock, GAME_CHECKOUT_SOURCE } from './_game-unlock.js';
import { isValidState, newGame, startChapter, step } from '../../src/lib/game/engine.js';
import { CHAPTERS, STORY_REWARDS } from '../../src/lib/game/story.js';
import {
  AFFILIATE_QUEST_GOLD,
  CREDIT_EXPIRY_DAYS,
  DAILY_GOLD,
  REDEEM_OPTIONS_GOLD,
  centralDay,
  goldToCents,
  minOrderCents,
} from '../../src/lib/game/economy.js';
import type { GameEvent, GameState } from '../../src/lib/game/types.js';

/** Commission statuses that count as earned (not pending, not cancelled). */
const EARNED_COMMISSION = ['confirmed', 'approved', 'available', 'paid'];

function db(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Uniform [0, 1) from crypto, so a player can't predict or replay rolls. */
const serverRng = () => randomInt(0, 1_000_000) / 1_000_000;

async function loadSave(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('game_saves')
    .select('state, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data && isValidState(data.state)) return data as { state: GameState; created_at: string; updated_at: string };
  const state = newGame();
  const now = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from('game_saves')
    .upsert({ user_id: userId, state, updated_at: now }, { onConflict: 'user_id' })
    .select('state, created_at, updated_at')
    .single();
  if (insErr) throw new Error(insErr.message);
  return inserted as { state: GameState; created_at: string; updated_at: string };
}

/** Write the new state only if nobody else moved the save since we read it. */
async function saveState(supabase: SupabaseClient, userId: string, prevUpdatedAt: string, state: GameState) {
  const { data, error } = await supabase
    .from('game_saves')
    .update({ state, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('updated_at', prevUpdatedAt)
    .select('user_id');
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function unlockedChapters(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('game_unlocks').select('chapter_id').eq('user_id', userId).eq('status', 'active');
  return new Set((data ?? []).map((r: any) => r.chapter_id));
}

async function goldBalance(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.from('game_gold_ledger').select('amount').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((a: number, r: any) => a + r.amount, 0);
}

/** Insert ledger rows; a ref already claimed is skipped. Returns the refs actually inserted. */
async function award(
  supabase: SupabaseClient,
  userId: string,
  rows: { ref: string; amount: number; kind: string; note?: string }[],
): Promise<Set<string>> {
  if (!rows.length) return new Set();
  const { data, error } = await supabase
    .from('game_gold_ledger')
    .upsert(rows.map((r) => ({ user_id: userId, ...r })), { onConflict: 'user_id,ref', ignoreDuplicates: true })
    .select('ref');
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r: any) => r.ref));
}

/** Story gold events → ledger. Only amounts that match the story file are paid. */
async function awardStoryGold(supabase: SupabaseClient, userId: string, events: GameEvent[]) {
  const rows = events
    .filter((e): e is Extract<GameEvent, { type: 'gold' }> => e.type === 'gold')
    .filter((e) => STORY_REWARDS[e.id] === e.amount)
    .map((e) => ({ ref: `story:${e.id}`, amount: e.amount, kind: 'story', note: e.id }));
  const inserted = await award(supabase, userId, rows);
  return events.map((e) =>
    e.type === 'gold' ? { ...e, claimed: inserted.has(`story:${e.id}`) } : e,
  );
}

/**
 * Affiliate quests: each earned commission on the player's own affiliate code,
 * created after they started playing, pays AFFILIATE_QUEST_GOLD once.
 * Reads affiliate_commissions only — the one split writer is untouched.
 */
async function syncAffiliateQuests(supabase: SupabaseClient, userId: string, since: string) {
  const { data: aff } = await supabase.from('affiliates').select('id, code').eq('user_id', userId).maybeSingle();
  if (!aff) return { code: null as string | null, completed: 0, newlyAwarded: 0 };
  const { data: rows } = await supabase
    .from('affiliate_commissions')
    .select('id')
    .eq('affiliate_id', aff.id)
    .in('status', EARNED_COMMISSION)
    .gte('created_at', since);
  const ids = (rows ?? []).map((r: any) => r.id as string);
  const inserted = await award(
    supabase,
    userId,
    ids.map((id) => ({ ref: `aff:${id}`, amount: AFFILIATE_QUEST_GOLD, kind: 'affiliate_quest', note: 'Referral booked' })),
  );
  return { code: aff.code as string, completed: ids.length, newlyAwarded: inserted.size };
}

async function snapshot(supabase: SupabaseClient, user: User) {
  const save = await loadSave(supabase, user.id);
  const quests = await syncAffiliateQuests(supabase, user.id, save.created_at);
  const [gold, unlocked, credits, daily] = await Promise.all([
    goldBalance(supabase, user.id),
    unlockedChapters(supabase, user.id),
    supabase
      .from('game_redemptions')
      .select('id, gold, amount_cents, code, status, expires_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('game_gold_ledger')
      .select('id')
      .eq('user_id', user.id)
      .eq('ref', `daily:${centralDay()}`)
      .maybeSingle(),
  ]);
  return {
    state: save.state,
    gold,
    unlocked: [...unlocked],
    credits: (credits.data ?? []).filter((c: any) => c.status === 'issued'),
    dailyClaimed: !!daily.data,
    quests,
  };
}

async function couponFor(stripe: ReturnType<typeof getStripe>, amountCents: number) {
  const id = `tlau-game-credit-${amountCents}`;
  try {
    return await stripe.coupons.retrieve(id);
  } catch (err: any) {
    if (err?.statusCode !== 404 && err?.code !== 'resource_missing') throw err;
    return stripe.coupons.create({
      id,
      amount_off: amountCents,
      currency: 'usd',
      duration: 'once',
      name: `FR33 D. OHM INC. CREDIT $${amountCents / 100}`,
      metadata: { source: GAME_CHECKOUT_SOURCE },
    });
  }
}

function creditCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return 'FR33-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function redeem(supabase: SupabaseClient, userId: string, gold: number) {
  if (!(REDEEM_OPTIONS_GOLD as readonly number[]).includes(gold)) return { status: 400, body: { error: 'Pick one of the credit sizes.' } };
  const amountCents = goldToCents(gold);
  const { data: redemptionId, error } = await supabase.rpc('game_redeem_gold', {
    p_user: userId,
    p_gold: gold,
    p_amount_cents: amountCents,
  });
  if (error) {
    if (error.message.includes('insufficient_gold')) return { status: 402, body: { error: 'Not enough gold yet.' } };
    throw new Error(error.message);
  }

  const expiresAt = new Date(Date.now() + CREDIT_EXPIRY_DAYS * 86_400_000);
  try {
    const stripe = getStripe();
    const coupon = await couponFor(stripe, amountCents);
    const code = creditCode();
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      max_redemptions: 1,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      restrictions: { minimum_amount: minOrderCents(amountCents), minimum_amount_currency: 'usd' },
      metadata: { source: GAME_CHECKOUT_SOURCE, user_id: userId, redemption_id: String(redemptionId) },
    } as any);
    await supabase
      .from('game_redemptions')
      .update({ status: 'issued', code, stripe_promotion_code_id: promo.id, expires_at: expiresAt.toISOString() })
      .eq('id', redemptionId);
    return {
      status: 200,
      body: { code, amountCents, minOrderCents: minOrderCents(amountCents), expiresAt: expiresAt.toISOString() },
    };
  } catch (err: any) {
    // Stripe failed: give the gold back and record why.
    console.error('[game] promotion code failed', redemptionId, err?.message);
    await supabase.from('game_redemptions').update({ status: 'failed', error: String(err?.message ?? err).slice(0, 500) }).eq('id', redemptionId);
    await award(supabase, userId, [{ ref: `redeem_reversal:${redemptionId}`, amount: gold, kind: 'redeem_reversal', note: 'Credit not issued' }]);
    return { status: 502, body: { error: 'Could not issue the credit. Your gold was returned.' } };
  }
}

async function buyChapter(req: VercelRequest, user: User, chapterId: string) {
  const chapter = CHAPTERS[chapterId];
  if (!chapter || chapter.priceCents <= 0) return { status: 400, body: { error: 'That chapter is not for sale.' } };
  const origin = getSiteOrigin(req.headers.host as string | undefined, (req.headers['x-forwarded-proto'] as string) || 'https');
  const stripe = getStripe();
  // The referrer's code, as other checkouts carry it: the affiliate_ref cookie,
  // else what the page sent. Used only when the buyer has no tie yet.
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const cookieRef = (req.headers.cookie || '').match(/affiliate_ref=([^;]+)/)?.[1];
  const affiliateRef = cleanAffiliateRef(cookieRef ? decodeURIComponent(cookieRef) : body.affiliateRef);
  const meta: Record<string, string> = { source: GAME_CHECKOUT_SOURCE, user_id: user.id, chapter_id: chapter.id };
  if (affiliateRef) meta.affiliateRef = affiliateRef;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: chapter.priceCents,
          product_data: {
            name: `FR33 D. OHM INC. — CHAPTER ${chapter.number}: ${chapter.title}`,
            description: chapter.tagline,
          },
        },
      },
    ],
    customer_email: user.email ?? undefined,
    metadata: meta,
    payment_intent_data: { description: `FR33 D. OHM INC. chapter ${chapter.number}`, metadata: meta },
    success_url: `${origin}/game?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/game?purchase=cancelled`,
  });
  return { status: 200, body: { url: session.url } };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || '');
  const user = await verifiedUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to save your game and earn gold.' });

  try {
    const supabase = db();

    if (req.method === 'GET' && action === 'state') {
      return res.status(200).json(await snapshot(supabase, user));
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;

    if (action === 'choose' || action === 'chapter') {
      const save = await loadSave(supabase, user.id);
      const unlocked = await unlockedChapters(supabase, user.id);
      const result =
        action === 'choose'
          ? step(save.state, String(body.choiceId || ''), serverRng, unlocked)
          : startChapter(save.state, String(body.chapterId || ''), unlocked);
      if (!result.ok) {
        const status = result.error === 'locked' ? 402 : 400;
        return res.status(status).json({ error: result.error, chapter: result.chapter });
      }
      const saved = await saveState(supabase, user.id, save.updated_at, result.state);
      if (!saved) return res.status(409).json({ error: 'Your game moved in another tab. Reloading.' });
      const events = await awardStoryGold(supabase, user.id, result.events);
      return res.status(200).json({ state: result.state, events, gold: await goldBalance(supabase, user.id) });
    }

    if (action === 'reset') {
      const save = await loadSave(supabase, user.id);
      const fresh = newGame();
      const saved = await saveState(supabase, user.id, save.updated_at, fresh);
      if (!saved) return res.status(409).json({ error: 'Your game moved in another tab. Reloading.' });
      return res.status(200).json(await snapshot(supabase, user));
    }

    if (action === 'daily') {
      const day = centralDay();
      const inserted = await award(supabase, user.id, [{ ref: `daily:${day}`, amount: DAILY_GOLD, kind: 'daily', note: day }]);
      return res.status(200).json({ claimed: inserted.size > 0, gold: await goldBalance(supabase, user.id) });
    }

    if (action === 'redeem') {
      const out = await redeem(supabase, user.id, Number(body.gold));
      return res.status(out.status).json({ ...out.body, gold: await goldBalance(supabase, user.id) });
    }

    if (action === 'buy') {
      const out = await buyChapter(req, user, String(body.chapterId || ''));
      return res.status(out.status).json(out.body);
    }

    if (action === 'confirm') {
      const sessionId = String(body.sessionId || '');
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Bad session id' });
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.user_id !== user.id) return res.status(403).json({ error: 'Not your purchase' });
      const result = await grantChapterUnlock(supabase, session);
      return res.status(200).json({ ...result, unlocked: [...(await unlockedChapters(supabase, user.id))] });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err: any) {
    console.error('[game] error', action, err?.message || err);
    return res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
