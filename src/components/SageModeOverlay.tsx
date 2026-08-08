/**
 * SAGE MODE Overlay — tap anything on the live site, say what should change,
 * and it becomes a GitHub issue that names the source file.
 *
 * There is no control panel. A floating box covers the page you are trying to
 * look at, and it disappeared entirely on full-screen views. The only indicator
 * is the site logo turning gold (see `.sage-brand` in index.css), which rides
 * along with the header and is therefore always wherever the header is.
 *
 * Selection is a document-level click listener in the capture phase rather than
 * a full-screen overlay div. An overlay that swallows pointer events also
 * swallows touch scrolling; a capture listener intercepts the tap and leaves
 * scrolling completely untouched.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { user } = useAuth();

  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [comment, setComment] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const targetRef = useRef<TargetInfo | null>(null);
  targetRef.current = target;

  const enabled = state.enabled;

  // Voice control, by way of the URL.
  //
  // `?sage=on` / `?sage=off` / `?sage=toggle` flips SAGE MODE, then strips the
  // parameter so a refresh or a shared link doesn't re-fire it. This exists so
  // an iOS Shortcut ("Hey Siri, sage mode") can open the URL and have the site
  // act on it — the browser's own speech API cannot listen for a wake word in
  // the background, but Siri can, and this gives it something to call.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cmd = params.get('sage');
    if (!cmd) return;

    // Gate to admins: the composer is admin-only server-side anyway, and a
    // stray link shouldn't put a visitor into a mode that eats their taps.
    if (isAdminEmail(user?.email || '')) {
      const want =
        cmd === 'on' ? true : cmd === 'off' ? false : cmd === 'toggle' ? !enabled : null;
      if (want !== null && want !== enabled) toggleSageMode();
    }

    params.delete('sage');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`, { replace: true });
  }, [location.search, location.pathname, location.hash, user?.email, enabled, toggleSageMode, navigate]);

  // Paint the site gold while SAGE MODE is on. Done on <html> so it survives
  // route changes and reaches the header from any layout.
  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add('sage-mode-on');
    else root.classList.remove('sage-mode-on');
    return () => root.classList.remove('sage-mode-on');
  }, [enabled]);

  // Intercept taps in the capture phase, before the page's own handlers run,
  // so tapping a link selects it instead of navigating away.
  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      // Never hijack our own composer, or the header — the header is how you
      // reach the menu to switch SAGE MODE back off.
      if (el.closest('[data-sage-chrome]')) return;
      // While the composer is open, the next tap should land normally.
      if (targetRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const info = describeTarget(el);
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

  if (!enabled) return null;

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

  return (
    <>
      {/* Outline of the selected element */}
      {target && (
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
      {target && (
        <div
          data-sage-chrome
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-[380px] z-[99999] bg-black/95 border border-yellow-400/50 p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-yellow-400 text-xs font-bold">REQUEST A CHANGE</p>
              <p className="text-white/50 text-[10px] font-mono truncate mt-1">
                {target.source || `<${target.tag}> — no source stamp`}
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
            placeholder="Say what should change — dictate or type…"
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
    </>
  );
}
