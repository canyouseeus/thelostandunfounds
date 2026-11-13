/**
 * FR33 D. OHM INC. — the WRLD BLDR text RPG.
 *
 * Guests play in the browser (localStorage) to try it. Signed-in players play
 * through /api/game: the server rolls the dice and owns the gold, which
 * redeems into single-use credit codes for the site's Stripe checkouts.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import AuthModal from '../components/auth/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { getAffiliateRef } from '../utils/affiliate-tracking';
import {
  MAX_VIBE,
  atkOf,
  availableChoices,
  classOf,
  combatActions,
  critOf,
  currentNode,
  defOf,
  dodgeOf,
  effectiveStat,
  maxHpOf,
  newGame,
  normalizeState,
  skillsFor,
  startChapter,
  step,
  upcomingSkills,
  xpForLevel,
} from '../lib/game/engine';
import { ENEMIES } from '../lib/game/enemies';
import { CHAPTERS, CHAPTER_ORDER } from '../lib/game/story';
import { ITEMS, gearSummary, itemName } from '../lib/game/items';
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
import { SLOTS, STATS } from '../lib/game/types';

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
      // Older guest saves are upgraded, not thrown away.
      const upgraded = normalizeState(s);
      if (upgraded) return upgraded;
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
const STAT_HELP: Record<Stat, string> = {
  grit: 'ATTACK +1 · MAX HP +2',
  wits: 'CRIT +4% · ACCURACY · ESCAPE',
  style: 'DODGE +3% · PEP TALK',
};
const SLOT_LABEL: Record<string, string> = { weapon: 'WEAPON', head: 'HEAD', body: 'BODY', trinket: 'TRINKET' };
const CLASS_LABEL: Record<string, string> = { builder: 'BUILDER', thinker: 'THINKER', dreamer: 'DREAMER' };

const ERROR_TEXT: Record<string, string> = {
  scrap: 'NOT ENOUGH SCRAP.',
  in_combat: 'FINISH THE FIGHT FIRST.',
  requirement: 'YOU CAN\'T DO THAT YET.',
  bad_choice: 'THAT DIDN\'T WORK. TRY SOMETHING ELSE.',
};

function Bar({ value, max, thin }: { value: number; max: number; thin?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`${thin ? 'h-1' : 'h-2'} bg-white/10`} style={SQUARE} role="presentation">
      <div className={`${thin ? 'h-1' : 'h-2'} bg-white transition-all`} style={{ ...SQUARE, width: `${pct}%` }} />
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block px-1.5 py-0.5 bg-white/10 text-[10px] font-bold uppercase tracking-widest mr-1 mb-1">{children}</span>;
}

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
      return { text: `LEVEL UP: LEVEL ${e.level}. MAX HP +6, FULLY HEALED, +1 STAT POINT TO SPEND.` };
    case 'fallen':
      if (e.revived) return { text: 'SPARE BATTERY KICKS IN. BACK UP AT HALF HP.' };
      return { text: `OUT OF HP. SCOT33 WAKES UP AT THE LAST SAFE SPOT, HEALED, GEAR KEPT${e.scrapLost ? `, ${e.scrapLost} SCRAP DROPPED` : ''}. STILL POSITIVE.` };
    case 'scrap':
      return { text: e.amount < 0 ? `${e.amount} SCRAP` : `+${e.amount} SCRAP` };
    case 'log':
      return { text: e.text };
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
  // Pre-credits (the THE LOST+UNFOUNDS logo animation), then the title screen, then play.
  // Coming back from Stripe Checkout goes straight to play.
  const [phase, setPhase] = useState<'intro' | 'title' | 'play'>(() =>
    new URLSearchParams(location.search).get('purchase') ? 'play' : 'intro',
  );

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
        else setNotice(ERROR_TEXT[r.error] ?? null);
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
        setNotice((r.data.error && ERROR_TEXT[r.data.error]) || r.data.error || 'Something went wrong.');
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
  const maxHp = maxHpOf(state);
  const combat = state.combat ?? null;
  const foe = combat ? ENEMIES[combat.enemy] : null;
  const actions = combat ? combatActions(state) : [];
  const xpFloor = xpForLevel(state.level);
  const xpNext = xpForLevel(state.level + 1);
  const canTrain = state.statPoints > 0 && !combat;
  const shop = !combat ? node.shop ?? [] : [];
  const ownedGear = state.inventory.filter((id) => ITEMS[id]?.slot);
  const keyItems = state.inventory.filter((id) => ITEMS[id] && !ITEMS[id].slot && !ITEMS[id].use);
  const bag = Object.entries(state.bag).filter(([, n]) => n > 0);
  const skills = skillsFor(state);
  const nextSkills = upcomingSkills(state);
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
        <div className={`max-w-5xl mx-auto px-4 sm:px-6 ${phase === 'play' ? 'pt-12 pb-48' : 'py-8'}`}>
          {phase === 'intro' && <GameIntro onDone={() => setPhase('title')} />}

          {phase !== 'play' ? (
            <section
              className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center text-center gap-10"
              aria-label="Title screen"
            >
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-center leading-none">FR33 D. OHM INC.</h1>
              <button
                onClick={() => setPhase('play')}
                className="game-start-blink px-10 py-4 text-base font-black uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                style={SQUARE}
                data-tour="game-start"
              >
                <span className="whitespace-nowrap">START</span>
              </button>
            </section>
          ) : (<>
          <header className="mb-8">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">FR33 D. OHM INC.</h1>
            <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-2">
              THE WRLD BLDR RPG · PLAY FREE · EARN GOLD · SPEND IT AS SITE CREDIT
            </p>
          </header>


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
          <div className="bg-[#0a0a0a] p-4 mb-6" aria-label="Character">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                SCOT33 · {CLASS_LABEL[classOf(state)]} · LEVEL {state.level}
              </div>
              <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                <span>SCRAP <span className="text-white text-sm font-black">{state.scrap}</span></span>
                <span>
                  GOLD <span className="text-white text-sm font-black">{signedIn ? (snap ? snap.gold : '…') : '—'}</span>
                  {signedIn && snap && <span className="text-white/60"> = {formatUsd(goldToCents(snap.gold))}</span>}
                </span>
              </div>
            </div>
            <Bar value={state.hp} max={maxHp} />
            <div className="flex justify-between text-xs font-bold mt-1 mb-2">
              <span>HP {state.hp}/{maxHp}</span>
              <span className="text-white/60 text-[10px] tracking-widest">XP {state.xp - xpFloor}/{xpNext - xpFloor} TO LV {state.level + 1}</span>
            </div>
            <Bar value={state.xp - xpFloor} max={xpNext - xpFloor} thin />
            <div className="grid grid-cols-4 gap-2 mt-3 text-xs font-bold uppercase">
              <div><div className="text-[10px] text-white/60 tracking-widest">ATK</div><div className="text-lg">{atkOf(state)}</div></div>
              <div><div className="text-[10px] text-white/60 tracking-widest">DEF</div><div className="text-lg">{defOf(state)}</div></div>
              <div><div className="text-[10px] text-white/60 tracking-widest">CRIT</div><div className="text-lg">{critOf(state)}%</div></div>
              <div><div className="text-[10px] text-white/60 tracking-widest">DODGE</div><div className="text-lg">{dodgeOf(state)}%</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3" data-tour="game-stats">
              {STATS.map((st) => (
                <div key={st} className="bg-white/5 p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-white/60 tracking-widest">{STAT_LABEL[st]}</div>
                      <div className="text-lg font-black">{effectiveStat(state, st)}</div>
                    </div>
                    {canTrain && (
                      <button
                        onClick={() => choose(`train:${st}`)}
                        disabled={busy}
                        aria-label={`Raise ${STAT_LABEL[st]}`}
                        className="w-9 h-9 text-lg font-black bg-white text-black hover:bg-white/10 hover:text-white disabled:opacity-50"
                        style={SQUARE}
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="text-[9px] text-white/50 tracking-wider leading-tight mt-1 uppercase">{STAT_HELP[st]}</div>
                </div>
              ))}
            </div>
            {canTrain && (
              <div className="mt-2 text-[10px] font-bold uppercase tracking-widest">
                {state.statPoints} STAT POINT{state.statPoints > 1 ? 'S' : ''} TO SPEND. TAP +.
              </div>
            )}
          </div>

          {/* Story */}
          <div className="bg-white/5 p-5 md:p-8 mb-6" aria-live="polite">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">
              CHAPTER {chapter.number}: {chapter.title}
            </div>
            {combat && foe ? (
              <div data-tour="game-fight">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">{foe.name}</h2>
                <p className="text-sm text-white/70 mt-1 mb-3">{foe.blurb}</p>
                <div className="mb-1"><Bar value={combat.hp} max={combat.maxHp} /></div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>{foe.boss ? 'BOSS · ' : ''}HP {combat.hp}/{combat.maxHp}</span>
                  {combat.queue.length > 0 && <span className="text-white/60 text-[10px] tracking-widest">+{combat.queue.length} MORE WAITING</span>}
                </div>
                <div className="min-h-[1.5rem]">
                  {combat.phase === 2 && <Tag>ANGRY</Tag>}
                  {combat.foe.stun > 0 && <Tag>STUNNED</Tag>}
                  {combat.foe.weak > 0 && <Tag>WEAKENED {combat.foe.weak}</Tag>}
                  {combat.foe.guard && <Tag>GUARDING</Tag>}
                </div>

                <div className="mt-4 bg-black/60 p-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                    <span>YOU · HP {state.hp}/{maxHp}</span>
                    <span>TURN {combat.turn}</span>
                  </div>
                  <Bar value={state.hp} max={maxHp} />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest">VIBE</span>
                    <div className="flex gap-1" aria-label={`VIBE ${combat.vibe} of ${MAX_VIBE}`}>
                      {Array.from({ length: MAX_VIBE }, (_, i) => (
                        <span key={i} className={`w-4 h-3 ${i < combat.vibe ? 'bg-white' : 'bg-white/15'}`} style={SQUARE} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 min-h-[1.5rem]">
                    {combat.you.pumped > 0 && <Tag>PUMPED {combat.you.pumped}</Tag>}
                    {combat.you.weak > 0 && <Tag>WEAKENED {combat.you.weak}</Tag>}
                    {combat.you.grey > 0 && <Tag>GREYED {combat.you.grey}</Tag>}
                    {(state.bag['spare-battery'] ?? 0) > 0 && <Tag>SPARE BATTERY READY</Tag>}
                  </div>
                </div>
              </div>
            ) : (<>
            {node.title && <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-4">{node.title}</h2>}
            {node.art && (
              <figure
                className={`mx-auto mb-5 w-full ${node.art.card ? 'bg-white p-3 sm:p-5' : ''}`}
                style={{ ...SQUARE, maxWidth: node.art.maxWidth }}
              >
                <img
                  src={`/game-art/cutouts/${node.art.stem}.webp`}
                  srcSet={`/game-art/cutouts/${node.art.stem}-600.webp 600w, /game-art/cutouts/${node.art.stem}.webp 1200w`}
                  sizes={`(max-width: 480px) 90vw, ${node.art.maxWidth}px`}
                  width={node.art.width}
                  height={node.art.height}
                  alt={node.art.alt}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                />
              </figure>
            )}
            <div className="space-y-3 text-white/90 leading-relaxed text-left">
              {node.text.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            </>)}

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
            ) : combat ? (
              <div className="mt-5 grid grid-cols-2 gap-2" data-tour="game-actions">
                {actions.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => choose(a.id)}
                    disabled={busy || a.disabled}
                    className={`${a.kind === 'attack' || a.kind === 'guard' ? '' : 'col-span-2'} w-full px-3 py-3 text-left bg-white/10 hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:hover:bg-white/10 disabled:hover:text-white`}
                    style={SQUARE}
                  >
                    <span className="block text-sm font-black uppercase tracking-wide">{a.label}</span>
                    {a.detail && <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">{a.detail}</span>}
                  </button>
                ))}
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
                      {c.hint && <span className="text-white/50 ml-2 text-[10px] tracking-widest">[{c.hint}]</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {shop.length > 0 && (
            <div className="bg-white/5 p-5 mb-6" data-tour="game-shop">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest">SUPPORT DESK SHOP</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">YOU HAVE {state.scrap} SCRAP</span>
              </div>
              <ul className="space-y-2">
                {shop.map((id) => {
                  const it = ITEMS[id];
                  if (!it) return null;
                  const owned = !it.use && state.inventory.includes(id);
                  const full = !!it.use && (state.bag[id] ?? 0) >= (it.carry ?? 9);
                  const short = state.scrap < (it.price ?? 0);
                  return (
                    <li key={id} className="flex items-center gap-3 bg-black/40 p-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold uppercase">{it.name}{it.use ? ` · HAVE ${state.bag[id] ?? 0}` : ''}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/60">{it.slot ? `${SLOT_LABEL[it.slot]} · ${gearSummary(id)}` : it.blurb}</div>
                      </div>
                      <button
                        onClick={() => choose(`buy:${id}`)}
                        disabled={busy || owned || full || short}
                        className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-black"
                        style={SQUARE}
                      >
                        <span className="whitespace-nowrap">{owned ? 'OWNED' : full ? 'FULL' : `${it.price} SCRAP`}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gear */}
            <div className="bg-white/5 p-5" data-tour="game-gear">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3">GEAR</h2>
              <ul className="space-y-3">
                {SLOTS.map((slot) => {
                  const on = state.equipped[slot];
                  const spare = ownedGear.filter((id) => ITEMS[id].slot === slot && id !== on);
                  return (
                    <li key={slot}>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">{SLOT_LABEL[slot]}</div>
                      {on ? (
                        <div>
                          <div className="text-xs font-bold uppercase">{itemName(on)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-white/60">{gearSummary(on)}</div>
                          {ITEMS[on]?.shopHandle && (
                            <Link to={`/shop?item=${ITEMS[on].shopHandle}`} className="text-[10px] font-bold uppercase tracking-widest underline hover:text-white/60">
                              MERCH DROP · SHOP IT
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-white/50 uppercase">EMPTY</div>
                      )}
                      {spare.map((id) => (
                        <div key={id} className="flex items-center gap-2 mt-1">
                          <div className="flex-1 min-w-0 text-[10px] uppercase tracking-wider text-white/70">
                            {itemName(id)} · {gearSummary(id)}
                          </div>
                          <button
                            onClick={() => choose(`equip:${id}`)}
                            disabled={busy || !!combat}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black disabled:opacity-40"
                            style={SQUARE}
                          >
                            <span className="whitespace-nowrap">EQUIP</span>
                          </button>
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>

              <h3 className="text-xs font-black uppercase tracking-widest mt-5 mb-2">BAG</h3>
              {bag.length === 0 ? (
                <p className="text-xs text-white/60">Empty.</p>
              ) : (
                <ul className="space-y-1">
                  {bag.map(([id, n]) => {
                    const it = ITEMS[id];
                    const usable = !!it?.use && !it.use.combatOnly && !combat && state.hp < maxHp;
                    return (
                      <li key={id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold uppercase">{itemName(id)} ×{n}</div>
                          <div className="text-[10px] text-white/60">{it?.blurb}</div>
                        </div>
                        {it?.use && !it.use.combatOnly && (
                          <button
                            onClick={() => choose(`use:${id}`)}
                            disabled={busy || !usable}
                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white hover:text-black disabled:opacity-40"
                            style={SQUARE}
                          >
                            <span className="whitespace-nowrap">USE</span>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <h3 className="text-xs font-black uppercase tracking-widest mt-5 mb-2">SKILLS</h3>
              <ul className="space-y-1">
                {skills.map((sk) => (
                  <li key={sk.id} className="text-[10px] uppercase tracking-wider">
                    <span className="font-black text-xs">{sk.name}</span> · {sk.cost} VIBE · <span className="text-white/60">{sk.desc}</span>
                  </li>
                ))}
                {nextSkills.map((sk) => (
                  <li key={sk.id} className="text-[10px] uppercase tracking-wider text-white/40">
                    {sk.name} · LEARNED AT LEVEL {sk.level}
                  </li>
                ))}
              </ul>

              {keyItems.length > 0 && (
                <>
                  <h3 className="text-xs font-black uppercase tracking-widest mt-5 mb-2">KEY ITEMS</h3>
                  <ul className="space-y-2">
                    {keyItems.map((id) => (
                      <li key={id}>
                        <div className="text-xs font-bold uppercase">{itemName(id)}</div>
                        <div className="text-[10px] text-white/60">{ITEMS[id].blurb}</div>
                      </li>
                    ))}
                  </ul>
                </>
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

/**
 * Pre-credits: the THE LOST+UNFOUNDS logo animation from the old site's preloader
 * (public/preloader-video.mp4), full screen and centered. Ends on its own, on SKIP,
 * on a playback error, or after a safety timeout. Skipped for reduced motion.
 */
function GameIntro({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.play().catch(() => finish());
    }
    const safety = window.setTimeout(finish, 12000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" role="presentation">
      <video
        ref={videoRef}
        className="w-full h-full object-contain object-center bg-black pointer-events-none"
        src="/preloader-video.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        aria-label="THE LOST+UNFOUNDS logo animation"
      />
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white"
        style={SQUARE}
      >
        <span className="whitespace-nowrap">SKIP</span>
      </button>
    </div>
  );
}
