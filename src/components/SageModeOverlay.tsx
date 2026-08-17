/**
 * SAGE MODE Overlay: tap anything on the live site, say what should change,
 * and it becomes a GitHub issue that names the source file.
 *
 * State shows two ways. The site logo turns gold (see `.sage-brand` in
 * index.css), and a frosted tile holds a triangle that is gold when armed and
 * white when idle. The tile is the only control, and it has to exist: while
 * armed, selection swallows every tap, so without one guaranteed-unswallowed
 * control there is no way back out, and no way to browse to the page you
 * actually wanted to annotate.
 *
 * The earlier full control panel was removed because it covered the page you
 * were trying to look at and vanished behind full-screen views.
 *
 * Selection is a document-level click listener in the capture phase rather than
 * a full-screen overlay div. An overlay that swallows pointer events also
 * swallows touch scrolling; a capture listener intercepts the tap and leaves
 * scrolling completely untouched.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSageMode } from '../contexts/SageModeContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../utils/admin';
import { supabase } from '../lib/supabase';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface TargetInfo {
  source: string | null;
  tag: string;
  id: string;
  className: string;
  text: string;
  rect: { top: number; left: number; width: number; height: number };
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; url: string | null }
  | { status: 'error'; message: string };

/** Walk up from the tapped node to the nearest element carrying a source stamp. */
function describeTarget(el: HTMLElement): TargetInfo {
  let sourced: HTMLElement | null = el;
  while (sourced && !sourced.dataset?.tluSrc) {
    sourced = sourced.parentElement;
  }
  const r = el.getBoundingClientRect();
  return {
    source: sourced?.dataset?.tluSrc ?? null,
    tag: el.tagName.toLowerCase(),
    id: el.id || '',
    className: typeof el.className === 'string' ? el.className : '',
    text: (el.textContent || '').trim().slice(0, 120),
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
  };
}

export default function SageModeOverlay() {
  const { state, addAnnotation, toggleSageMode } = useSageMode();
  const { user, loading: authLoading } = useAuth();

  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [comment, setComment] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const targetRef = useRef<TargetInfo | null>(null);
  targetRef.current = target;
  // The live element, kept so the outline can be re-measured. A rect captured
  // once goes stale the moment anything scrolls or reflows.
  const targetElRef = useRef<HTMLElement | null>(null);

  const isAdmin = isAdminEmail(user?.email || '');

  // SAGE MODE lives in localStorage, so signing out used to leave it armed,
  // and armed means every tap is intercepted, including the "Sign in with
  // Google" button. That locked the account out of its own site. Nothing is
  // ever armed without a signed-in admin, and `enabled` below is the effective
  // state rather than the stored one, so a stale flag can't eat a single tap
  // even before the effect that clears it runs.
  const enabled = state.enabled && isAdmin;

  useEffect(() => {
    // Wait for session restore, or a refresh would switch it off every time.
    if (authLoading) return;
    if (state.enabled && !isAdmin) toggleSageMode();
  }, [authLoading, isAdmin, state.enabled, toggleSageMode]);

  // Voice control, by way of the URL.
  //
  // `?sage=on` / `?sage=off` / `?sage=toggle` flips SAGE MODE, then strips the
  // parameter so a refresh or a shared link doesn't re-fire it. This exists so
  // an iOS Shortcut ("Hey Siri, sage mode") can open the URL and have the site
  // act on it: the browser's own speech API cannot listen for a wake word in
  // the background, but Siri can, and this gives it something to call.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cmd = params.get('sage');
    if (!cmd) return;

    // Turning it OFF is never gated. A kill switch that requires the thing it
    // rescues you from is not a kill switch: with SAGE MODE armed and the
    // session gone, an admin-only `?sage=off` refused to fire on the very page
    // where the taps were being eaten. Turning it ON stays admin-only, so a
    // stray link can't drop a visitor into a mode that swallows their taps.
    if (cmd === 'off') {
      if (state.enabled) toggleSageMode();
    } else if (isAdmin) {
      const want = cmd === 'on' ? true : cmd === 'toggle' ? !enabled : null;
      if (want !== null && want !== enabled) toggleSageMode();
    }

    params.delete('sage');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`, { replace: true });
  }, [location.search, location.pathname, location.hash, isAdmin, enabled, state.enabled, toggleSageMode, navigate]);

  // Paint the site gold while SAGE MODE is on. Done on <html> so it survives
  // route changes and reaches the header from any layout.
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('sage-mode-on');
    } else {
      root.classList.remove('sage-mode-on');
      // Switching off mid-compose shouldn't strand the composer on screen.
      setTarget(null);
      setComment('');
      setSubmit({ status: 'idle' });
    }
    return () => root.classList.remove('sage-mode-on');
  }, [enabled]);

  // Intercept taps in the capture phase, before the page's own handlers run,
  // so tapping a link selects it instead of navigating away.
  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      // Never hijack our own composer, or the header; the header is how you
      // reach the menu to switch SAGE MODE back off.
      if (el.closest('[data-sage-chrome]')) return;
      // While the composer is open, the next tap should land normally.
      if (targetRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const info = describeTarget(el);
      targetElRef.current = el;
      setTarget(info);
      setSubmit({ status: 'idle' });
      addAnnotation({
        id: Date.now().toString(),
        type: 'selector',
        data: {
          source: info.source,
          elementTag: info.tag,
          elementId: info.id,
          elementClass: info.className,
          elementText: info.text,
          position: info.rect,
        },
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
      });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, addAnnotation]);

  const closeComposer = useCallback(() => {
    setTarget(null);
    setComment('');
    setSubmit({ status: 'idle' });
  }, []);

  // Escape closes the composer, then leaves SAGE MODE.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (targetRef.current) closeComposer();
      else toggleSageMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, closeComposer, toggleSageMode]);

  // Focus on selection so dictation lands without an extra tap.
  useEffect(() => {
    if (target) composerRef.current?.focus();
  }, [target]);

  // Keep the outline on the element as things scroll or reflow. Opening the
  // composer shifts layout on its own, so a rect measured at tap time is
  // already wrong by the time it is painted.
  useEffect(() => {
    if (!target) return;
    const remeasure = () => {
      const el = targetElRef.current;
      if (!el || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      setTarget((prev) =>
        prev &&
        (prev.rect.top !== r.top ||
          prev.rect.left !== r.left ||
          prev.rect.width !== r.width ||
          prev.rect.height !== r.height)
          ? { ...prev, rect: { top: r.top, left: r.left, width: r.width, height: r.height } }
          : prev
      );
    };
    remeasure();
    window.addEventListener('scroll', remeasure, true);
    window.addEventListener('resize', remeasure);
    return () => {
      window.removeEventListener('scroll', remeasure, true);
      window.removeEventListener('resize', remeasure);
    };
    // Only re-arm when a different element is picked, not on every rect update.
  }, [target?.source, target?.tag, target?.text]);

  const sendRequest = async () => {
    if (!comment.trim() || !target) return;
    setSubmit({ status: 'sending' });
    try {
      // The endpoint verifies this token server-side rather than trusting a
      // claimed email header, since it can open issues on the repo.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const res = await fetch('/api/admin/sage-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': user?.email || '',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          comment: comment.trim(),
          source: target.source,
          element: {
            tag: target.tag,
            id: target.id,
            className: target.className,
            text: target.text,
          },
          pageUrl: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setSubmit({ status: 'sent', url: body.url ?? null });
      setComment('');
    } catch (err: any) {
      setSubmit({ status: 'error', message: err?.message || 'Something went wrong' });
    }
  };

  // Everything below is portalled to <body>.
  //
  // Rendered in place, these sit inside whatever the current page wraps them
  // in. Any ancestor with a transform (an animated expandable card, say)
  // becomes the containing block for `position: fixed`, so viewport
  // coordinates land offset, and it opens a stacking context that traps
  // z-index no matter how high the value; which is how the composer ended up
  // behind the card that triggered it. A body portal has no such ancestor.
  return createPortal(
    <>
      {/* Always-present toggle. Selection swallows every tap while armed, so
          there has to be one control that never gets swallowed and never
          scrolls away: otherwise turning SAGE MODE off means hunting for a
          menu that SAGE MODE has eaten. Admin-only; visitors never see it. */}
      {isAdmin && !target && (
        <button
          data-sage-chrome
          onClick={toggleSageMode}
          aria-pressed={enabled}
          aria-label={enabled ? 'SAGE MODE on: tap to turn off' : 'Turn SAGE MODE on'}
          title={enabled ? 'SAGE MODE on: tap to turn off' : 'Turn SAGE MODE on'}
          // Frosted circle on the same bottom line as the gallery console tray,
          // off to its right. bg-white/10 + backdrop-blur-md are the
          // floating-tray glass values from bento-design, which also forbids a
          // shadow: separation comes from the blur, not elevation.
          //
          // It used to sit at a standing bottom-24, which on a phone floats it a
          // third of the way up the screen. The one place that offset earned its
          // keep is /admin: AdminLayout mounts MusicPlayer, whose player bar is
          // fixed bottom-0 and 59px tall (h-0.5 progress + h-14 row + border-t),
          // so the button would land on top of it. Everywhere else
          // there is no bottom bar and it rides at the bottom edge. The calc()
          // adds the home-indicator inset (index.html sets viewport-fit=cover,
          // so fixed elements can sit under it) and resolves to the bare offset
          // where there is no inset.
          //
          // Below 375px it stacks above the line instead of sharing it. The
          // gallery console tray is a fixed 208px centred pill, so on a 320px
          // screen its right edge reaches 264px while this button starts at
          // 256px, an 8px overlap, and at z-[100000] this button wins and eats
          // the tray's last icon. From 375px up the gap is 20px or more.
          className={`fixed right-4 z-[100000] h-12 w-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md transition-colors ${
            location.pathname.startsWith('/admin')
              ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))]'
              : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] max-[374px]:bottom-[calc(5rem+env(safe-area-inset-bottom))]'
          }`}
        >
          {/* Triangle outline: gold when armed, white when idle. Points are
              centred on the circle: the bounding box spans x 7-18, so it sits
              a touch right of dead centre, which is how a pointing triangle
              reads as optically centred inside a round button. */}
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 transition-colors"
            fill="none"
            stroke={enabled ? '#FFD700' : '#FFFFFF'}
            strokeWidth={2}
            strokeLinejoin="round"
          >
            <polygon points="7,5 18,12 7,19" />
          </svg>
        </button>
      )}

      {/* Outline of the selected element */}
      {enabled && target && (
        <div
          className="fixed z-[99991] pointer-events-none"
          style={{
            top: target.rect.top,
            left: target.rect.left,
            width: target.rect.width,
            height: target.rect.height,
            outline: '2px solid #FFD700',
            outlineOffset: 2,
            background: 'rgba(255,215,0,0.08)',
          }}
        />
      )}

      {/* Composer */}
      {enabled && target && (
        <div
          data-sage-chrome
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-[380px] z-[99999] bg-black/95 border border-yellow-400/50 p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-yellow-400 text-xs font-bold">REQUEST A CHANGE</p>
              <p className="text-white/50 text-[10px] font-mono truncate mt-1">
                {target.source || `<${target.tag}>: no source stamp`}
              </p>
            </div>
            <button
              onClick={closeComposer}
              className="p-1 text-white/50 hover:text-white shrink-0"
              title="Cancel (Esc)"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <textarea
            ref={composerRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendRequest();
            }}
            rows={4}
            placeholder="Say what should change: dictate or type…"
            className="w-full bg-white/5 text-white text-sm p-2 outline-none resize-none placeholder:text-white/30 focus:bg-white/10"
          />

          {submit.status === 'error' && (
            <p className="text-red-400 text-xs mt-2">{submit.message}</p>
          )}
          {submit.status === 'sent' && (
            <p className="text-green-400 text-xs mt-2">
              Sent.{' '}
              {submit.url && (
                <a href={submit.url} target="_blank" rel="noreferrer" className="underline">
                  View issue
                </a>
              )}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-white/30 text-[10px] hidden sm:inline">⌘↵ to send</span>
            <button
              onClick={sendRequest}
              disabled={!comment.trim() || submit.status === 'sending'}
              className="ml-auto px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 disabled:opacity-40 disabled:hover:bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 text-xs font-medium transition flex items-center gap-1"
            >
              <PaperAirplaneIcon className="w-3 h-3" />
              {submit.status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
