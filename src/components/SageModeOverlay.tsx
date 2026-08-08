/**
 * SAGE MODE Overlay — tap something on the live site, say what should change,
 * and it becomes a GitHub issue that names the source file.
 *
 * One tool, deliberately: the selector. The pen/circle/rectangle/text tools were
 * removed because nothing downstream consumed a drawing — a shape on a screenshot
 * can't tell a coding agent which file to open, and a source-stamped element can.
 *
 * Pointer events (not mouse events) so this works the same under touch, where
 * there is no hover state to preview a selection with.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSageMode } from '../contexts/SageModeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  CursorArrowRaysIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

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

  const [armed, setArmed] = useState(false);
  const [hovered, setHovered] = useState<TargetInfo | null>(null);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [comment, setComment] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const overlayRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const exitSageMode = useCallback(() => {
    setArmed(false);
    setTarget(null);
    setHovered(null);
    setComment('');
    setSubmit({ status: 'idle' });
    toggleSageMode();
  }, [toggleSageMode]);

  // Escape backs out one level at a time, then leaves SAGE MODE.
  useEffect(() => {
    if (!state.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (target) setTarget(null);
      else if (armed) setArmed(false);
      else exitSageMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.enabled, target, armed, exitSageMode]);

  // Focus on selection so dictation lands without an extra tap.
  useEffect(() => {
    if (target) composerRef.current?.focus();
  }, [target]);

  if (!state.enabled) return null;

  const elementUnder = (clientX: number, clientY: number): HTMLElement | null => {
    const found = document
      .elementsFromPoint(clientX, clientY)
      .find(
        (el) =>
          el !== overlayRef.current &&
          !overlayRef.current?.contains(el) &&
          !el.closest('[data-sage-chrome]') &&
          el !== document.body &&
          el !== document.documentElement
      );
    return (found as HTMLElement) || null;
  };

  const selectAt = (clientX: number, clientY: number) => {
    const el = elementUnder(clientX, clientY);
    if (!el) return;
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

  const highlight = target ?? hovered;

  return (
    <>
      {/* Capture layer. Inert unless armed, so SAGE MODE never blocks scrolling
          or normal use of the page — which matters most on touch. */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[99990]"
        style={{
          pointerEvents: armed && !target ? 'auto' : 'none',
          touchAction: armed && !target ? 'none' : 'auto',
          cursor: armed ? 'crosshair' : 'default',
        }}
        onPointerDown={(e) => selectAt(e.clientX, e.clientY)}
        onPointerMove={(e) => {
          // Hover preview is a mouse affordance; touch has no hover, and
          // previewing on drag would fight the tap.
          if (e.pointerType !== 'mouse' || target) return;
          const el = elementUnder(e.clientX, e.clientY);
          setHovered(el ? describeTarget(el) : null);
        }}
        onPointerLeave={() => setHovered(null)}
      />

      {/* Selection highlight, drawn as its own layer rather than mutating the
          target element's inline styles. */}
      {armed && highlight && (
        <div
          className="fixed z-[99991] pointer-events-none"
          style={{
            top: highlight.rect.top,
            left: highlight.rect.left,
            width: highlight.rect.width,
            height: highlight.rect.height,
            outline: `2px solid ${target ? '#FFD700' : 'rgba(255,215,0,0.55)'}`,
            outlineOffset: 2,
            background: target ? 'rgba(255,215,0,0.08)' : 'transparent',
          }}
        >
          <span className="absolute -top-6 left-0 max-w-[90vw] truncate bg-yellow-400 px-2 py-0.5 text-[10px] font-mono text-black">
            {highlight.source || `<${highlight.tag}> — no source stamp`}
          </span>
        </div>
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
              onClick={() => setTarget(null)}
              className="p-1 text-white/50 hover:text-white shrink-0"
              title="Pick a different element (Esc)"
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

      {/* Control panel — one tool, one exit. */}
      {!target && (
        <div
          data-sage-chrome
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-[99999] bg-black/95 border border-yellow-400/50 px-4 py-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shrink-0"></div>
            <span className="text-yellow-400 font-bold text-xs whitespace-nowrap">
              SAGE MODE
            </span>

            <button
              onClick={() => {
                setArmed((a) => !a);
                setHovered(null);
              }}
              className={`ml-auto flex items-center gap-2 px-3 py-2 border text-xs font-medium transition ${
                armed
                  ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
            >
              <CursorArrowRaysIcon className="w-4 h-4" />
              {armed ? 'Selecting…' : 'Select'}
            </button>

            <button
              onClick={exitSageMode}
              className="p-2 text-white/50 hover:text-white transition shrink-0"
              title="Exit SAGE MODE (Esc)"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <p className="text-white/40 text-[10px] mt-2">
            {armed
              ? 'Tap any element to describe a change.'
              : 'Tap Select, then pick an element.'}
          </p>
        </div>
      )}
    </>
  );
}
