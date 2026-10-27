/**
 * Runs the admin walkthroughs defined in `tours.ts`.
 *
 * Mounted once at the app root, above the routes, so a tour survives the
 * navigations it makes (/admin → /admin/live) instead of unmounting with the
 * page that started it.
 *
 * WALK, DON'T DESCRIBE. A step outlines one real control and says what to do
 * with it. A step with `action: 'click'` waits for you to tap the outlined
 * control — or NEXT taps it for you — and the tour follows into whatever that
 * opens. `action: 'choose'` waits for a pick in a select or input.
 *
 * NO WAITING YOU CAN SEE. Moving between steps used to remount the card,
 * show "Finding it…", sit out a fixed 300ms after every panel change and up
 * to 5s on a target that was not there. Now one overlay lives for the whole
 * tour: the card fades out, the page moves, the target is measured every
 * frame until it holds still for four frames (a scroll in flight or a panel
 * still filling both move it), then the spotlight glides there and the card
 * fades back in. A target that never turns up is skipped, the way the
 * Kattitude dashboard tour does it, unless the step carries a `missingNote`
 * that is worth reading anyway.
 *
 * The spotlight is one element: the white outline the owner asked for plus a
 * page-sized box-shadow that dims everything else. It is overlay chrome, not a
 * component surface, so no-border-design does not apply. Four transparent
 * panes around it block stray taps; the hole itself stays live, which is what
 * lets an action step be done for real.
 *
 * Which tours have been finished is a per-browser convenience in localStorage
 * — losing it only means the NEW FEATURE pop-up shows once more.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PANEL_EVENT, getTour, Tour, TourStep } from './tours';

const SEEN_KEY = 'tlu_tours_seen';
const PAD = 6;
const FADE_MS = 120;
// Frames the target must hold still before it is measured for good.
const STILL_FRAMES = 3;
// How long to look for a target before skipping its step. Right after
// something changed — a new page, a panel opening, a button the last step
// tapped — the new screen may still be downloading its code or data, so the
// first step there waits longer. Everywhere else a missing target is skipped
// quickly instead of leaving the reader staring at a dimmed screen.
const FIND_MS = 800;
const FIND_AFTER_ROUTE_MS = 4000;
// But a target is only declared missing once the page has stopped changing:
// no DOM mutations for this long (longer after a change), and nothing marked
// [data-tour-loading] — a lazy pop-up's Suspense fallback, which is silent
// while its code downloads.
const QUIET_MS = 200;
const QUIET_AFTER_CHANGE_MS = 500;
const MIN_WAIT_AFTER_CHANGE_MS = 600;

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

/** First matching element that is actually laid out (desktop and mobile copies can both exist). */
function findTarget(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const el of Array.from(all)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Is something else painted over the target? The site's route-change loading
 * screen, or a pop-up still animating in, can sit on top of an element that is
 * already in the DOM — outlining it then draws a box around a blank. The
 * tour's own layers don't count.
 */
function covered(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1);
  const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 0), window.innerHeight - 1);
  const top = document.elementsFromPoint(x, y).find(n => !(n as HTMLElement).closest('[data-tour-overlay]'));
  return !!top && !el.contains(top) && !top.contains(el);
}

/** The console panel open on /admin ('' for none), or null off the dashboard. */
function openPanel(): string | null {
  const root = document.querySelector<HTMLElement>('[data-tour-root="admin"]');
  return root ? root.dataset.activePanel ?? '' : null;
}

interface TourContextValue {
  start: (id: string) => void;
  activeId: string | null;
  seen: string[];
  markSeen: (id: string) => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [seen, setSeen] = useState<string[]>(readSeen);

  const markSeen = useCallback((id: string) => {
    setSeen(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeSeen(next);
      return next;
    });
  }, []);

  const start = useCallback((id: string) => {
    const t = getTour(id);
    if (t) setTour(t);
  }, []);

  const finish = useCallback(() => {
    setTour(prev => {
      if (prev) markSeen(prev.id);
      return null;
    });
  }, [markSeen]);

  const value = useMemo(
    () => ({ start, activeId: tour?.id ?? null, seen, markSeen }),
    [start, tour, seen, markSeen]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {tour && <TourOverlay key={tour.id} tour={tour} onClose={finish} />}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}

interface Box { top: number; left: number; width: number; height: number }

const sameBox = (a: Box | null, b: Box | null) =>
  !!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

const measure = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

function TourOverlay({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  const navigate = useNavigate();
  // `index` is where the tour is going; `shown` is the step on the card. They
  // differ while the card is faded out and the page is moving.
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<{ index: number; step: TourStep; el: HTMLElement | null } | null>(null);
  const [visible, setVisible] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  // Which way the reader is travelling, so a skipped step skips the same way.
  const dirRef = useRef<1 | -1>(1);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  // Last time the page (not the tour) changed, and how many steps were shown.
  const lastMutationRef = useRef(performance.now());
  const shownCountRef = useRef(0);

  useEffect(() => {
    const mo = new MutationObserver(records => {
      for (const r of records) {
        const n = r.target as Element;
        const el = n.nodeType === 1 ? n : n.parentElement;
        if (el && !el.closest('[data-tour-overlay]')) { lastMutationRef.current = performance.now(); return; }
      }
    });
    // Elements arriving or leaving only. Text and style churn — the dashboard
    // clock ticks every second behind every panel — would keep the page from
    // ever counting as quiet.
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const go = useCallback((to: number) => {
    if (to >= tour.steps.length) { onClose(); return; }
    if (to < 0) return;
    setIndex(prev => { dirRef.current = to >= prev ? 1 : -1; return to; });
  }, [tour.steps.length, onClose]);

  // Arrive at a step: fade out, move the page, wait for the target to settle,
  // then glide and fade back in.
  useEffect(() => {
    const step = tour.steps[index];
    let cancelled = false;
    let raf = 0;
    setVisible(false);

    const begin = () => {
      if (cancelled) return;
      const routed = !!step.route && window.location.pathname !== step.route;
      // The tour covers the page itself, so the site's route-change loading
      // screen would only hide what the step points at. Layout skips it.
      if (routed) navigate(step.route!, { state: { skipRouteLoading: true } });

      const started = performance.now();
      const prev = shownRef.current;
      // Only the step straight after the tap: steps skipped past it don't count.
      const afterAction = !!prev && prev.step.action === 'click' && dirRef.current === 1 && prev.index === index - 1;
      const panelChanges = step.panel !== undefined && openPanel() !== (step.panel ?? '');
      const limit = routed || afterAction || panelChanges ? FIND_AFTER_ROUTE_MS : FIND_MS;
      let panelSent = false;
      let last: Box | null = null;
      let still = 0;
      let scrolledTo: HTMLElement | null = null;

      const tick = () => {
        if (cancelled) return;
        const elapsed = performance.now() - started;

        // Open or close a console panel, once the dashboard is there to hear it.
        if (step.panel !== undefined) {
          const current = openPanel();
          const want = step.panel ?? '';
          if (current !== null && current !== want) {
            if (!panelSent) {
              window.dispatchEvent(new CustomEvent(ADMIN_PANEL_EVENT, { detail: step.panel }));
              panelSent = true;
            }
            if (elapsed < limit) { raf = requestAnimationFrame(tick); return; }
          }
        }

        if (!step.target) { arrive(step, null); return; }

        const el = findTarget(step.target);
        if (!el) {
          last = null; still = 0;
          const changed = limit === FIND_AFTER_ROUTE_MS;
          const quiet = performance.now() - lastMutationRef.current >= (changed ? QUIET_AFTER_CHANGE_MS : QUIET_MS);
          const loading = !!document.querySelector('[data-tour-loading]');
          const settledPage = quiet && !loading && elapsed >= (changed ? MIN_WAIT_AFTER_CHANGE_MS : 0);
          if (elapsed < limit && !settledPage) { raf = requestAnimationFrame(tick); return; }
          // Never turned up. Say why if the step knows; otherwise skip it.
          if (step.missingNote) { arrive(step, null); return; }
          let to = index + dirRef.current;
          // Backing into a missing first step: stay where the reader was.
          if (to < 0) to = shownRef.current ? shownRef.current.index : index + 1;
          if (to >= tour.steps.length) {
            // Ran off the end skipping. If most of the tour never showed —
            // an empty CRM, no tickets yet — say so rather than vanish.
            if (shownCountRef.current * 2 < tour.steps.length) {
              arrive({ title: 'That\u2019s It For Now', body: 'The rest of this tool appears once it has something in it. Run this tutorial again from TUTORIALS then.' }, null, tour.steps.length - 1);
            } else onClose();
            return;
          }
          setIndex(to);
          return;
        }

        if (scrolledTo !== el) {
          // First sighting: bring it on screen. Tall things align to the top
          // so the card under them is not pushed off the bottom.
          scrolledTo = el;
          const r = el.getBoundingClientRect();
          const offscreen = r.top < 0 || r.bottom > window.innerHeight;
          if (offscreen) el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth' });
        }
        const b = measure(el);
        // Something painted over it: wait, unless it is only off screen
        // because the scroll above is still running.
        const onScreen = b.top >= 0 && b.top < window.innerHeight;
        if (onScreen && covered(el) && elapsed < limit) {
          last = null; still = 0;
          raf = requestAnimationFrame(tick);
          return;
        }
        still = sameBox(last, b) ? still + 1 : 0;
        last = b;
        if (still >= STILL_FRAMES || elapsed > limit + 1500) { arrive(step, el); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const arrive = (s: TourStep, el: HTMLElement | null, at = index) => {
      if (cancelled) return;
      shownCountRef.current += 1;
      setShown({ index: at, step: s, el });
      setBox(el ? measure(el) : null);
      // One frame at the new spot while still transparent, then fade in.
      raf = requestAnimationFrame(() => { if (!cancelled) setVisible(true); });
    };

    // Let the fade-out finish before anything moves. The first step has
    // nothing to fade.
    const wait = shownRef.current ? FADE_MS : 0;
    const t = setTimeout(begin, wait);
    return () => { cancelled = true; clearTimeout(t); cancelAnimationFrame(raf); };
    // Runs once per step; `go` and `navigate` are stable for the tour's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Follow the target while it is shown: scrolling, a panel animating in.
  useEffect(() => {
    const el = shown?.el;
    if (!el) return;
    let raf = 0;
    const loop = () => {
      if (el.isConnected) {
        const b = measure(el);
        setBox(prev => (sameBox(prev, b) ? prev : b));
      }
      setVw(w => (w === window.innerWidth ? w : window.innerWidth));
      setVh(h => (h === window.innerHeight ? h : window.innerHeight));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [shown]);

  // Action steps advance when the reader does the thing.
  useEffect(() => {
    if (!shown || !visible || !shown.el || !shown.step.action) return;
    const el = shown.el;
    const next = () => setTimeout(() => go(shown.index + 1), 0);
    if (shown.step.action === 'click') {
      // Capture phase, so it is seen even if the control stops propagation.
      // The tour moves on after the control's own handler has run.
      const onClick = (e: MouseEvent) => { if (el.contains(e.target as Node)) next(); };
      document.addEventListener('click', onClick, true);
      return () => document.removeEventListener('click', onClick, true);
    }
    const onChange = () => next();
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [shown, visible, go]);

  const onNext = useCallback(() => {
    if (!shown) return;
    // NEXT on a "tap this" step taps it for you, so the tour still follows.
    // A disabled control can't be tapped (it waits on a photo, say), so NEXT
    // just moves on.
    if (shown.step.action === 'click' && shown.el?.isConnected && !(shown.el as HTMLButtonElement).disabled) {
      shown.el.click();
      return; // the click listener above advances
    }
    go(shown.index + 1);
  }, [shown, go]);
  const onBack = useCallback(() => { if (shown) go(shown.index - 1); }, [shown, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, onNext, onClose]);

  // The hole, clamped to the viewport so a target taller than the screen still
  // leaves dim around it. It stays on the old target while the page moves,
  // then glides, rather than collapsing between every step.
  const hole = box
    ? (() => {
        const top = Math.max(box.top - PAD, 0);
        const left = Math.max(box.left - PAD, 0);
        const bottom = Math.min(box.top + box.height + PAD, vh);
        const right = Math.min(box.left + box.width + PAD, vw);
        return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
      })()
    : null;

  const step = shown?.step;
  const isLast = (shown?.index ?? 0) >= tour.steps.length - 1;
  const cardWidth = Math.min(380, vw - 32);
  const CARD_ROOM = 260;
  let cardPos: { top?: number; bottom?: number; left: number } | null = null;
  if (hole) {
    const left = Math.min(Math.max(hole.left, 16), vw - cardWidth - 16);
    if (vh - (hole.top + hole.height) >= CARD_ROOM) cardPos = { top: hole.top + hole.height + 12, left };
    else if (hole.top >= CARD_ROOM) cardPos = { bottom: vh - hole.top + 12, left };
    else cardPos = { bottom: 16, left };
  }

  // With no target the spotlight collapses to a point in the middle, so the
  // whole screen dims without a different element taking over.
  const spot = hole ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  const blocker = 'fixed z-[100010]';
  const fade = { transition: `opacity ${FADE_MS}ms ease`, opacity: visible ? 1 : 0 };
  const missing = !!step?.target && !shown?.el;
  const doIt = step?.action === 'click' && !!shown?.el;

  return createPortal(
    // data-sage-chrome: SAGE MODE's capture listener must never swallow these taps.
    <div data-sage-chrome data-tour-overlay role="dialog" aria-modal="true" aria-label={`${tour.title} walkthrough`}>
      {/* Spotlight: outline + page dim in one element, gliding between steps. */}
      <div
        className="fixed z-[100011] pointer-events-none"
        style={{
          ...spot,
          outline: `2px solid rgba(255,255,255,${hole && visible ? 1 : 0})`,
          boxShadow: '0 0 0 200vmax rgba(0,0,0,0.8)',
          borderRadius: 0,
          transition: `top 250ms ease, left 250ms ease, width 250ms ease, height 250ms ease, outline-color ${FADE_MS}ms ease`,
        }}
      />
      {/* Tap blockers around the hole; one full pane while moving. */}
      {hole && visible ? (
        <>
          <div className={blocker} style={{ top: 0, left: 0, width: vw, height: hole.top }} />
          <div className={blocker} style={{ top: hole.top + hole.height, left: 0, width: vw, height: Math.max(vh - hole.top - hole.height, 0) }} />
          <div className={blocker} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div className={blocker} style={{ top: hole.top, left: hole.left + hole.width, width: Math.max(vw - hole.left - hole.width, 0), height: hole.height }} />
        </>
      ) : (
        <div className={`${blocker} inset-0`} />
      )}

      {step && (
        // No target: centred by a flex wrapper, not translate(-50%), which
        // puts the card on a half pixel and draws a hairline along its edge.
        <div className={cardPos ? 'contents' : 'fixed inset-0 z-[100012] flex items-center justify-center pointer-events-none'}>
          <div
            className={`${cardPos ? 'fixed' : ''} pointer-events-auto z-[100012] bg-black text-white p-5 text-left`}
            style={{ ...cardPos, ...fade, width: cardWidth, borderRadius: 0 }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
              {tour.title} · {(shown?.index ?? 0) + 1} / {tour.steps.length}
            </p>
            <h2 className="text-base font-black uppercase tracking-widest mb-3">{step.title}</h2>
            <div className="space-y-2">
              {step.body.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-white/80 leading-relaxed">{para}</p>
              ))}
              {missing && (
                <p className="text-xs text-white/50 leading-relaxed">{step.missingNote}</p>
              )}
              {doIt && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Tap the outlined button, or NEXT does it for you
                </p>
              )}
              {step.action === 'choose' && shown?.el && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400">
                  Make your pick in the outlined box
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-5">
              <button
                onClick={onClose}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
              >
                {isLast ? 'Close' : 'Skip tour'}
              </button>
              <div className="flex gap-2">
                {(shown?.index ?? 0) > 0 && (
                  <button
                    onClick={onBack}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                    style={{ borderRadius: 0 }}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onNext}
                  autoFocus
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-white/80 transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  {isLast && !doIt ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
