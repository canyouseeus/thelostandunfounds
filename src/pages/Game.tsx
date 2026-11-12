/**
 * FR33 D. OHM INC. — the WRLD BLDR text RPG.
 *
 * Guests play in the browser (localStorage) to try it. Signed-in players play
 * through /api/game: the server rolls the dice and owns the gold, which
 * redeems into single-use credit codes for the site's Stripe checkouts.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { getAffiliateRef } from '../utils/affiliate-tracking';
import { availableChoices, currentNode, effectiveStat, isValidState, newGame, startChapter, step } from '../lib/game/engine';
import { CHAPTERS, CHAPTER_ORDER, FIRST_CHAPTER } from '../lib/game/story';
import { ITEMS } from '../lib/game/items';
import {
  AFFILIATE_QUEST_GOLD,
  CREDIT_EXPIRY_DAYS,
  DAILY_GOLD,
  MIN_ORDER_MULTIPLE,
  REDEEM_OPTIONS_GOLD,
  formatUsd,
  goldToCents,
  minOrderCents,
} from '../lib/game/economy';
import type { GameEvent, GameState, Stat } from '../lib/game/types';
import { STATS } from '../lib/game/types';

const GUEST_KEY = 'fr33dom-inc-guest-save';
const SQUARE = { borderRadius: 0 } as const;

type ShownEvent = GameEvent & { claimed?: boolean };

interface Credit {
  id: string;
  gold: number;
  amount_cents: number;
  code: string;
  expires_at: string;
}

interface Snapshot {
  state: GameState;
  gold: number;
  unlocked: string[];
  credits: Credit[];
  dailyClaimed: boolean;
  quests: { code: string | null; completed: number; newlyAwarded: number };
}

function loadGuest(): GameState {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (isValidState(s)) return s;
    }
  } catch { /* storage blocked: play without saving */ }
  return newGame();
}

function saveGuest(s: GameState) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

async function api<T>(action: string, body?: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(`/api/game?action=${action}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' });
  const data = await res.json().catch(() => ({ error: 'Bad response' }));
  return { ok: res.ok, status: res.status, data };
}

const STAT_LABEL: Record<Stat, string> = { grit: 'GRIT', wits: 'WITS', style: 'STYLE' };

function describe(e: ShownEvent, signedIn: boolean): { text: string; shopHandle?: string } | null {
  switch (e.type) {
    case 'roll':
      return { text: `${STAT_LABEL[e.stat]} CHECK: ROLLED ${e.roll} + ${e.bonus} = ${e.total} VS ${e.dc}. ${e.passed ? 'SUCCESS.' : 'NOT QUITE.'}` };
    case 'gold':
      if (!signedIn) return { text: `+${e.amount} GOLD (SIGN IN TO KEEP IT)` };
      return { text: e.claimed === false ? `+${e.amount} GOLD (ALREADY EARNED ON A PAST RUN)` : `+${e.amount} GOLD` };
    case 'item': {
      const item = ITEMS[e.id];
      return { text: `FOUND: ${item?.name ?? e.id}${item?.blurb ? ` — ${item.blurb}` : ''}`, shopHandle: item?.shopHandle };
    }
    case 'hp':
      return { text: e.amount < 0 ? `${e.amount} HP` : `+${e.amount} HP` };
    case 'xp':
      return { text: `+${e.amount} XP` };
    case 'level':
      return { text: `LEVEL UP: LEVEL ${e.level}. MAX HP +3, FULLY HEALED.` };
    case 'fallen':
      return { text: 'OUT OF HP. SCOT33 DUSTS HIMSELF OFF AND STARTS THE CHAPTER AGAIN, GEAR KEPT. STILL POSITIVE.' };
    case 'chapter_complete':
      return { text: `CHAPTER COMPLETE: ${CHAPTERS[e.chapter]?.title ?? e.chapter}` };
  }
}

export default function Game() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const signedIn = !!user;

  const [state, setState] = useState<GameState>(() => loadGuest());
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<ShownEvent[]>([]);
  const [locked, setLocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [newCredit, setNewCredit] = useState<{ code: string; amountCents: number; minOrderCents: number } | null>(null);
  // Title screen with the WRLD BLDR 3000 poster. Skipped when coming back from Stripe Checkout.
  const [onTitle, setOnTitle] = useState(() => !new URLSearchParams(location.search).get('purchase'));

  const unlocked = useMemo(() => new Set(snap?.unlocked ?? []), [snap]);

  const refresh = useCallback(async () => {
    const r = await api<Snapshot>('state');
    if (r.ok) {
      setSnap(r.data);
      setState(r.data.state);
    } else {
      setNotice(r.data.error || 'Could not load your game.');
    }
  }, []);

  // Signed in → server save. Returning from Stripe → confirm the purchase first.
  useEffect(() => {
    if (authLoading || !signedIn) return;
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    const purchase = params.get('purchase');
    (async () => {
      if (purchase === 'success' && sessionId) {
        const r = await api<{ granted: boolean }>('confirm', { sessionId });
        setNotice(r.ok ? 'CHAPTER UNLOCKED. THANK YOU FOR SUPPORTING THE BUILD.' : r.data.error || 'Payment still processing. Refresh in a minute.');
      } else if (purchase === 'cancelled') {
        setNotice('CHECKOUT CANCELLED. NOTHING WAS CHARGED.');
      }
      if (purchase) navigate('/game', { replace: true });
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, signedIn]);

  useEffect(() => {
    if (!signedIn) saveGuest(state);
  }, [state, signedIn]);

  const choose = async (choiceId: string) => {
    if (busy) return;
    setLocked(null);
    setNotice(null);
    if (!signedIn) {
      const r = step(state, choiceId, Math.random, new Set());
      if (!r.ok) {
        if (r.error === 'locked') setLocked(r.chapter ?? null);
        return;
      }
      setState(r.state);
      setEvents(r.events);
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ state: GameState; events: ShownEvent[]; gold: number; chapter?: string }>('choose', { choiceId });
      if (r.ok) {
        setState(r.data.state);
        setEvents(r.data.events);
        setSnap((s) => (s ? { ...s, state: r.data.state, gold: r.data.gold } : s));
      } else if (r.status === 402) {
        setLocked(r.data.chapter ?? null);
      } else if (r.status === 409) {
        await refresh();
      } else {
        setNotice(r.data.error || 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  };

  const goToChapter = async (chapterId: string) => {
    setNotice(null);
    setLocked(null);
    if (!signedIn) {
      const r = startChapter(state, chapterId, new Set());
      if (r.ok) { setState(r.state); setEvents(r.events); }
      else if (r.error === 'locked') setLocked(chapterId);
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ state: GameState; events: ShownEvent[]; gold: number }>('chapter', { chapterId });
      if (r.ok) { setState(r.data.state); setEvents(r.data.events); setSnap((s) => (s ? { ...s, gold: r.data.gold } : s)); }
      else if (r.status === 402) setLocked(chapterId);
      else setNotice(r.data.error === 'requirement' ? 'FINISH THE CHAPTER BEFORE IT FIRST.' : r.data.error || 'Could not open that chapter.');
    } finally { setBusy(false); }
  };

  const buy = async (chapterId: string) => {
    if (!signedIn) { setAuthOpen(true); return; }
    setBusy(true);
    try {
      const r = await api<{ url: string }>('buy', { chapterId, affiliateRef: getAffiliateRef() });
      if (r.ok && r.data.url) window.location.href = r.data.url;
      else setNotice(r.data.error || 'Could not start checkout.');
    } finally { setBusy(false); }
  };

  const claimDaily = async () => {
    setBusy(true);
    try {
      const r = await api<{ claimed: boolean; gold: number }>('daily', {});
      if (r.ok) {
        setSnap((s) => (s ? { ...s, gold: r.data.gold, dailyClaimed: true } : s));
        setNotice(r.data.claimed ? `+${DAILY_GOLD} GOLD. SEE YOU TOMORROW.` : 'ALREADY CLAIMED TODAY.');
      }
    } finally { setBusy(false); }
  };

  const redeem = async (gold: number) => {
    setBusy(true);
    setNewCredit(null);
    try {
      const r = await api<{ code: string; amountCents: number; minOrderCents: number; gold: number }>('redeem', { gold });
      if (r.ok) {
        setNewCredit({ code: r.data.code, amountCents: r.data.amountCents, minOrderCents: r.data.minOrderCents });
        await refresh();
      } else {
        setNotice(r.data.error || 'Could not redeem.');
      }
    } finally { setBusy(false); }
  };

  const reset = async () => {
    if (!window.confirm('Start a new game? Your gold, credits and unlocked chapters stay.')) return;
    setEvents([]);
    setLocked(null);
    if (!signedIn) { const s = newGame(); setState(s); return; }
    setBusy(true);
    try {
      const r = await api<Snapshot>('reset', {});
      if (r.ok) { setSnap(r.data); setState(r.data.state); }
    } finally { setBusy(false); }
  };

  const chapter = CHAPTERS[state.chapter];
  const node = currentNode(state);
  const choices = availableChoices(state);
  const lockedChapter = locked ? CHAPTERS[locked] : null;
  const isFreshGame = state.chapter === FIRST_CHAPTER && state.node === CHAPTERS[FIRST_CHAPTER].start && state.xp === 0 && state.completed.length === 0;
  const hpPct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
  const shownEvents = events.map((e) => describe(e, signedIn)).filter(Boolean) as { text: string; shopHandle?: string }[];
  const referralLink = snap?.quests.code ? `https://www.thelostandunfounds.com/?ref=${encodeURIComponent(snap.quests.code)}` : null;

  return (
    <>
      <SEOHead
        title="FR33 D. OHM INC."
        description="FR33 D. OHM INC. is a free text RPG from THE LOST+UNFOUNDS. Help SCOT33 build a world where everyone can be positive with his WRLD BLDR 3000, and earn gold for real site credit."
        canonicalPath="/game"
      />
      <div className="min-h-screen bg-black text-white text-left">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-48">
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">FR33 D. OHM INC.</h1>
            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2">
              THE WRLD BLDR RPG · PLAY FREE · EARN GOLD · SPEND IT AS SITE CREDIT
            </p>
          </header>

          {onTitle && (
            <section className="mb-8 flex flex-col md:flex-row md:items-start gap-6 md:gap-10" aria-label="Title screen">
              <picture className="block w-full max-w-[420px] md:max-w-[360px] shrink-0">
                <source
                  type="image/webp"
                  srcSet="/game-art/wrld-bldr-3000-poster-600.webp 600w, /game-art/wrld-bldr-3000-poster-1200.webp 1200w"
                  sizes="(min-width: 768px) 360px, min(420px, calc(100vw - 2rem))"
                />
                <img
                  src="/game-art/wrld-bldr-3000-poster-600.png"
                  width={600}
                  height={800}
                  alt="WRLD BLDR 3000 poster: BUILD YOUR OWN REALITY! A boxy robot, Model 666, pops out of its FR33 D. OHM INC. WRLD BLDR 3000 Deluxe Edition box, with the THE LOST+UNFOUNDS logo below."
                  className="block w-full h-auto"
                  style={SQUARE}
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
              <div className="flex-1 min-w-0">
                <p className="text-xl md:text-3xl font-black uppercase tracking-tight">BUILD YOUR OWN REALITY!</p>
                <p className="text-sm text-white/80 mt-3 max-w-prose">
                  SCOT33's brand-new WRLD BLDR 3000 DELUXE EDITION just arrived from FR33 D. OHM INC. Help him build a world where everyone can be positive. Chapter 1 is free.
                </p>
                <button
                  onClick={() => setOnTitle(false)}
                  className="mt-6 px-6 py-3 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors text-left"
                  style={SQUARE}
                  data-tour="game-start"
                >
                  <span className="whitespace-nowrap">{isFreshGame ? 'PRESS START' : 'CONTINUE'}</span>
                </button>
              </div>
            </section>
          )}

          {!onTitle && (<>

          {!signedIn && !authLoading && (
            <div className="bg-white/5 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3" data-tour="game-signin">
              <p className="text-sm text-white/80 flex-1">
                You're playing as a guest. Progress stays on this device and gold is only a preview.
                Sign in before you play to save your game and earn gold you can spend in the shop.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors justify-start text-left"
                style={SQUARE}
              >
                <span className="whitespace-nowrap">SIGN IN</span>
              </button>
            </div>
          )}

          {notice && <div className="bg-white/10 p-3 mb-6 text-xs font-bold uppercase tracking-widest">{notice}</div>}

          {/* Status */}
          <div className="bg-[#0a0a0a] p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Character">
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
                SCOT33 · LEVEL {state.level} · {state.xp} XP
              </div>
              <div className="h-2 bg-white/10" style={SQUARE}>
                <div className="h-2 bg-white" style={{ ...SQUARE, width: `${hpPct}%` }} />
              </div>
              <div className="text-xs font-bold mt-1">HP {state.hp}/{state.maxHp}</div>
            </div>
            <div className="flex gap-4 text-xs font-bold uppercase">
              {STATS.map((s) => (
                <div key={s}>
                  <div className="text-[10px] text-white/60 tracking-widest">{STAT_LABEL[s]}</div>
                  <div className="text-lg">{effectiveStat(state, s)}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">GOLD</div>
              <div className="text-lg font-black">
                {signedIn ? (snap ? snap.gold : '…') : '—'}
              </div>
              {signedIn && snap && (
                <div className="text-[10px] text-white/60 uppercase tracking-widest">= {formatUsd(goldToCents(snap.gold))} CREDIT</div>
              )}
            </div>
          </div>

          {/* Story */}
          <div className="bg-white/5 p-5 md:p-8 mb-6" aria-live="polite">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
              CHAPTER {chapter.number}: {chapter.title}
            </div>
            {node.title && <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-4">{node.title}</h2>}
            <div className="space-y-3 text-white/90 leading-relaxed text-left">
              {node.text.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            {shownEvents.length > 0 && (
              <ul className="mt-5 space-y-1 bg-black/60 p-3 text-xs font-bold uppercase tracking-wider text-white/80">
                {shownEvents.map((e, i) => (
                  <li key={i}>
                    › {e.text}
                    {e.shopHandle && (
                      <Link to={`/shop?item=${e.shopHandle}`} className="ml-2 underline text-white hover:text-white/60">
                        GET THE REAL ONE IN THE SHOP
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {lockedChapter ? (
              <div className="mt-6 bg-black p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">LOCKED</div>
                <div className="text-lg font-black uppercase mt-1">CHAPTER {lockedChapter.number}: {lockedChapter.title}</div>
                <p className="text-sm text-white/80 mt-1 mb-3">{lockedChapter.tagline}</p>
                <button
                  onClick={() => buy(lockedChapter.id)}
                  disabled={busy}
                  className="px-4 py-3 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 text-left"
                  style={SQUARE}
                  data-tour="game-unlock"
                >
                  <span className="whitespace-nowrap">UNLOCK FOR {formatUsd(lockedChapter.priceCents)}</span>
                </button>
                {!signedIn && <p className="text-[10px] uppercase tracking-widest text-white/60 mt-2">SIGN IN FIRST SO THE CHAPTER IS SAVED TO YOUR ACCOUNT.</p>}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-2" data-tour="game-choices">
                {choices.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => choose(c.id)}
                    disabled={busy}
                    className="w-full px-4 py-3 text-sm font-bold uppercase tracking-wide bg-white/10 hover:bg-white hover:text-black transition-colors disabled:opacity-50 text-left flex justify-start"
                    style={SQUARE}
                  >
                    <span>
                      {c.label}
                      {c.check && <span className="text-white/50 ml-2 text-[10px] tracking-widest">[{STAT_LABEL[c.check.stat]} {c.check.dc}]</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory */}
            <div className="bg-white/5 p-5">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3">GEAR</h2>
              {state.inventory.length === 0 ? (
                <p className="text-sm text-white/60">Nothing yet. Open the box.</p>
              ) : (
                <ul className="space-y-3">
                  {state.inventory.map((id) => {
                    const it = ITEMS[id];
                    if (!it) return null;
                    return (
                      <li key={id}>
                        <div className="text-xs font-bold uppercase">{it.name}</div>
                        <div className="text-xs text-white/60">{it.blurb}</div>
                        {it.shopHandle && (
                          <Link to={`/shop?item=${it.shopHandle}`} className="text-[10px] font-bold uppercase tracking-widest underline hover:text-white/60">
                            MERCH DROP · SHOP IT
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Chapters */}
            <div className="bg-white/5 p-5">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3">CHAPTERS</h2>
              <ul className="space-y-3">
                {CHAPTER_ORDER.map((c) => {
                  const owned = c.priceCents === 0 || unlocked.has(c.id);
                  const done = state.completed.includes(c.id);
                  return (
                    <li key={c.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="text-xs font-bold uppercase">{c.number}. {c.title}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/60">
                          {c.priceCents === 0 ? 'FREE' : owned ? 'OWNED' : formatUsd(c.priceCents)}{done ? ' · COMPLETE' : ''}
                        </div>
                      </div>
                      {owned ? (
                        <button onClick={() => goToChapter(c.id)} disabled={busy} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black disabled:opacity-50" style={SQUARE}>
                          <span className="whitespace-nowrap">PLAY</span>
                        </button>
                      ) : (
                        <button onClick={() => buy(c.id)} disabled={busy} className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white disabled:opacity-50" style={SQUARE}>
                          <span className="whitespace-nowrap">UNLOCK</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button onClick={reset} disabled={busy} className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white">
                START A NEW GAME
              </button>
            </div>

            {/* Daily + quests */}
            <div className="bg-white/5 p-5" data-tour="game-quests">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3">QUESTS</h2>
              <div className="mb-4">
                <div className="text-xs font-bold uppercase">DAILY CHECK-IN · +{DAILY_GOLD} GOLD</div>
                {signedIn ? (
                  <button onClick={claimDaily} disabled={busy || snap?.dailyClaimed} className="mt-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black disabled:opacity-50" style={SQUARE}>
                    <span className="whitespace-nowrap">{snap?.dailyClaimed ? 'CLAIMED TODAY' : 'CLAIM'}</span>
                  </button>
                ) : (
                  <p className="text-xs text-white/60">Sign in to claim gold every day.</p>
                )}
              </div>
              <div>
                <div className="text-xs font-bold uppercase">BRING SOMEONE INTO THE WORLD · +{AFFILIATE_QUEST_GOLD} GOLD EACH</div>
                <p className="text-xs text-white/60 mt-1">
                  Share your affiliate link. Every booking or sale it brings in pays your normal affiliate commission, plus {AFFILIATE_QUEST_GOLD} bonus gold here.
                </p>
                {referralLink ? (
                  <>
                    <div className="mt-2 bg-black p-2 text-[11px] break-all">{referralLink}</div>
                    <div className="flex gap-3 mt-2 items-center">
                      <button onClick={() => navigator.clipboard?.writeText(referralLink)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black" style={SQUARE}>
                        <span className="whitespace-nowrap">COPY LINK</span>
                      </button>
                      <span className="text-[10px] uppercase tracking-widest text-white/60">{snap?.quests.completed ?? 0} COMPLETED</span>
                    </div>
                  </>
                ) : (
                  <Link to="/become-affiliate" className="inline-block mt-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black" style={SQUARE}>
                    <span className="whitespace-nowrap">JOIN THE AFFILIATE PROGRAM</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Gold → credit */}
            <div className="bg-white/5 p-5" data-tour="game-redeem">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3">SPEND GOLD</h2>
              <p className="text-xs text-white/60 mb-3">
                Turn gold into a one-time code for gallery photos, prints, event tickets and shop items. Each code needs an order of {MIN_ORDER_MULTIPLE}× its value, and expires after {CREDIT_EXPIRY_DAYS} days.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {REDEEM_OPTIONS_GOLD.map((g) => {
                  const cents = goldToCents(g);
                  const enough = (snap?.gold ?? 0) >= g;
                  return (
                    <button
                      key={g}
                      onClick={() => (signedIn ? redeem(g) : setAuthOpen(true))}
                      disabled={busy || (signedIn && !enough)}
                      className="w-full px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black disabled:opacity-40 text-left flex justify-start"
                      style={SQUARE}
                    >
                      <span className="whitespace-nowrap">{g} GOLD → {formatUsd(cents)} OFF {formatUsd(minOrderCents(cents))}+</span>
                    </button>
                  );
                })}
              </div>
              {newCredit && (
                <div className="mt-3 bg-white text-black p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest">YOUR CODE</div>
                  <div className="text-lg font-black tracking-widest">{newCredit.code}</div>
                  <div className="text-[10px] uppercase tracking-widest">
                    {formatUsd(newCredit.amountCents)} OFF ORDERS OF {formatUsd(newCredit.minOrderCents)}+. ENTER IT AT CHECKOUT.
                  </div>
                </div>
              )}
              {snap && snap.credits.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {snap.credits.map((c) => (
                    <li key={c.id} className="text-[11px] flex gap-2 items-center">
                      <span className="font-black tracking-widest">{c.code}</span>
                      <span className="text-white/60 uppercase">{formatUsd(c.amount_cents)} · UNTIL {new Date(c.expires_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</span>
                      <button onClick={() => navigator.clipboard?.writeText(c.code)} className="text-[10px] font-bold uppercase underline">COPY</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          </>)}
        </div>
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
