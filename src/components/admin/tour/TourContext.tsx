/**
 * Runs the admin walkthroughs defined in `tours.ts`.
 *
 * Mounted once at the app root, above the routes, so a tour survives the
 * navigations it makes (/admin → /admin/live) instead of unmounting with the
 * page that started it.
 *
 * The spotlight is four dim panes around the target plus a white outline on
 * the gap. The gap is a real hole, so the outlined control stays tappable;
 * everything else is dimmed and blocked. Which tours have been finished is a
 * per-browser convenience in localStorage — losing it only means the NEW
 * FEATURE pop-up shows once more.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ADMIN_PANEL_EVENT, getTour, Tour } from './tours';

const SEEN_KEY = 'tlu_tours_seen';
// A panel's content can take a moment to mount after the route or panel
// changes; past this the step falls back to a centred card.
const TARGET_WAIT_MS = 5000;
// After a panel is opened, give React a beat before looking, or the header
// of the panel that was already open gets outlined instead.
const PANEL_SETTLE_MS = 300;
const PAD = 6;

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

interface TourContextValue {
  start: (id: string) => void;
  activeId: string | null;
  seen: string[];
  markSeen: (id: string) => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ tour: Tour; index: number } | null>(null);
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
    const tour = getTour(id);
    if (tour) setActive({ tour, index: 0 });
  }, []);

  const finish = useCallback(() => {
    setActive(prev => {
      if (prev) markSeen(prev.tour.id);
      return null;
    });
  }, [markSeen]);

  const value = useMemo(
    () => ({ start, activeId: active?.tour.id ?? null, seen, markSeen }),
    [start, active, seen, markSeen]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          key={`${active.tour.id}:${active.index}`}
          tour={active.tour}
          index={active.index}
          onBack={() => setActive(a => (a && a.index > 0 ? { ...a, index: a.index - 1 } : a))}
          onNext={() => {
            if (active.index >= active.tour.steps.length - 1) finish();
            else setActive(a => (a ? { ...a, index: a.index + 1 } : a));
          }}
          onClose={finish}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}

interface Box { top: number; left: number; width: number; height: number }

function TourOverlay({
  tour, index, onBack, onNext, onClose,
}: {
  tour: Tour;
  index: number;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const step = tour.steps[index];
  const isLast = index === tour.steps.length - 1;
  const navigate = useNavigate();
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [searching, setSearching] = useState(!!step.target);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  // Move the page into position, then wait for the target to exist.
  useEffect(() => {
    // The tour is already covering the page with its own outline and card, so
    // the site's 1.2s route-change loading screen would only hide the very
    // thing the step is pointing at. Layout reads this flag and skips it.
    if (step.route && window.location.pathname !== step.route) navigate(step.route, { state: { skipRouteLoading: true } });

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let panelSentAt = step.panel === undefined ? 0 : -1;
    let eventSent = !step.event;
    const startedAt = Date.now();

    const tick = () => {
      if (cancelled) return;
      // The panel event only lands once the dashboard is mounted.
      if (panelSentAt === -1 && document.querySelector('[data-tour-root="admin"]')) {
        window.dispatchEvent(new CustomEvent(ADMIN_PANEL_EVENT, { detail: step.panel }));
        panelSentAt = Date.now();
      }
      const settled = panelSentAt === 0 || (panelSentAt > 0 && Date.now() - panelSentAt >= PANEL_SETTLE_MS);
      // A step's event (e.g. opening a pop-up) goes out once the panel is in place.
      if (!eventSent && settled) {
        window.dispatchEvent(new CustomEvent(step.event!));
        eventSent = true;
      }
      const found = step.target && settled ? findTarget(step.target) : null;
      if (found) {
        const tall = found.getBoundingClientRect().height > window.innerHeight * 0.6;
        found.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' });
        setEl(found);
        setSearching(false);
        return;
      }
      if (!step.target && settled) { setSearching(false); return; }
      if (Date.now() - startedAt > TARGET_WAIT_MS) { setSearching(false); return; }
      timer = setTimeout(tick, 100);
    };
    timer = setTimeout(tick, 0);
    return () => { cancelled = true; clearTimeout(timer); };
    // The overlay is keyed per step, so this runs once per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the target as it scrolls, animates in or reflows.
  useEffect(() => {
    if (!el) return;
    let raf = 0;
    const loop = () => {
      if (el.isConnected) {
        const r = el.getBoundingClientRect();
        setBox(prev =>
          prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
            ? prev
            : { top: r.top, left: r.left, width: r.width, height: r.height }
        );
      } else {
        setBox(null);
      }
      setVw(w => (w === window.innerWidth ? w : window.innerWidth));
      setVh(h => (h === window.innerHeight ? h : window.innerHeight));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [el]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, onNext, onClose]);

  // The hole, clamped to the viewport so a board taller than the screen still
  // leaves dim panes to click on.
  const hole = box
    ? (() => {
        const top = Math.max(box.top - PAD, 0);
        const left = Math.max(box.left - PAD, 0);
        const bottom = Math.min(box.top + box.height + PAD, vh);
        const right = Math.min(box.left + box.width + PAD, vw);
        return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
      })()
    : null;

  const cardWidth = Math.min(380, vw - 32);
  const CARD_ROOM = 260;
  // No target: centred by a flex wrapper, not translate(-50%), which puts the
  // card on a half pixel and draws a hairline along its edge.
  let cardStyle: CSSProperties | null = null;
  if (hole) {
    const left = Math.min(Math.max(hole.left, 16), vw - cardWidth - 16);
    if (vh - (hole.top + hole.height) >= CARD_ROOM) cardStyle = { top: hole.top + hole.height + 12, left };
    else if (hole.top >= CARD_ROOM) cardStyle = { bottom: vh - hole.top + 12, left };
    else cardStyle = { bottom: 16, left };
  }

  const dim = 'fixed bg-black/80 z-[100010]';
  const missing = !searching && step.target && !box;

  return createPortal(
    // data-sage-chrome: SAGE MODE's capture listener must never swallow these taps.
    <div data-sage-chrome role="dialog" aria-modal="true" aria-label={`${tour.title} walkthrough`}>
      {hole ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, width: vw, height: hole.top }} />
          <div className={dim} style={{ top: hole.top + hole.height, left: 0, width: vw, height: Math.max(vh - hole.top - hole.height, 0) }} />
          <div className={dim} style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div className={dim} style={{ top: hole.top, left: hole.left + hole.width, width: Math.max(vw - hole.left - hole.width, 0), height: hole.height }} />
          {/* The white outline the owner asked for. An outline on an overlay,
              not a border on a component: no-border-design is about surfaces. */}
          <div
            className="fixed z-[100011] pointer-events-none transition-all duration-200"
            style={{ ...hole, outline: '2px solid #FFFFFF', outlineOffset: 0, borderRadius: 0 }}
          />
        </>
      ) : (
        <div className={`${dim} inset-0`} />
      )}

      <div className={cardStyle ? 'contents' : 'fixed inset-0 z-[100012] flex items-center justify-center pointer-events-none'}>
      <div
        className={`${cardStyle ? 'fixed' : 'pointer-events-auto'} z-[100012] bg-black text-white p-5 text-left`}
        style={{ ...cardStyle, width: cardWidth, borderRadius: 0 }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
          {tour.title} · {index + 1} / {tour.steps.length}
        </p>
        <h2 className="text-base font-black uppercase tracking-widest mb-3">{step.title}</h2>
        {searching ? (
          <p className="text-sm text-white/50">Finding it…</p>
        ) : (
          <div className="space-y-2">
            {step.body.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-white/80 leading-relaxed">{para}</p>
            ))}
            {missing && (
              <p className="text-xs text-white/50 leading-relaxed">
                {step.missingNote || 'This isn’t on screen right now.'}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-5">
          <button
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
          >
            {isLast ? 'Close' : 'Skip tour'}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
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
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
