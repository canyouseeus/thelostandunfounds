/**
 * SAGE MODE Overlay — point at something on the live site, say what's wrong,
 * and it becomes a change request with the source file attached.
 *
 * The previous version defined mouse handlers and an overlayRef but never
 * rendered the overlay, so nothing was ever wired up: the selector couldn't
 * select, drawings were stored but never painted, and the only red button was
 * "clear", which is why SAGE MODE could not be exited from its own panel.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSageMode, SageModeAnnotation } from '../contexts/SageModeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PencilIcon,
  StopIcon,
  ChatBubbleBottomCenterTextIcon,
  CursorArrowRaysIcon,
  TrashIcon,
  CheckIcon,
  LifebuoyIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

type ToolType = 'pen' | 'circle' | 'rectangle' | 'text' | 'selector' | null;

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

/** Walk up from the clicked node to the nearest element carrying a source stamp. */
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

  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [localAnnotations, setLocalAnnotations] = useState<SageModeAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  const [hovered, setHovered] = useState<TargetInfo | null>(null);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [comment, setComment] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const overlayRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const capturing = activeTool !== null;

  const exitSageMode = useCallback(() => {
    setActiveTool(null);
    setTarget(null);
    setHovered(null);
    setComment('');
    setSubmit({ status: 'idle' });
    toggleSageMode();
  }, [toggleSageMode]);

  // Escape backs out one level at a time, then leaves SAGE MODE entirely.
  useEffect(() => {
    if (!state.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (target) setTarget(null);
      else if (activeTool) setActiveTool(null);
      else exitSageMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.enabled, target, activeTool, exitSageMode]);

  // Focus the box on selection so dictation lands without an extra click.
  useEffect(() => {
    if (target) composerRef.current?.focus();
  }, [target]);

  if (!state.enabled) return null;

  /** What is under the cursor, ignoring our own overlay chrome. */
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

  const localPoint = (e: React.MouseEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeTool) return;
    const pt = localPoint(e);
    if (!pt) return;

    if (activeTool === 'selector') {
      const el = elementUnder(e.clientX, e.clientY);
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
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([pt]);
    } else if (activeTool === 'circle' || activeTool === 'rectangle') {
      setIsDrawing(true);
      setStartPos(pt);
      setEndPos(pt);
    } else if (activeTool === 'text') {
      setTextPosition(pt);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'selector') {
      if (target) return; // selection is frozen while the composer is open
      const el = elementUnder(e.clientX, e.clientY);
      setHovered(el ? describeTarget(el) : null);
      return;
    }
    if (!isDrawing || !activeTool) return;
    const pt = localPoint(e);
    if (!pt) return;
    if (activeTool === 'pen') setCurrentPath((prev) => [...prev, pt]);
    else if (activeTool === 'circle' || activeTool === 'rectangle') setEndPos(pt);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !activeTool) return;

    if (activeTool === 'pen' && currentPath.length > 0) {
      setLocalAnnotations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'pen',
          data: { path: currentPath },
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
        },
      ]);
      setCurrentPath([]);
    } else if ((activeTool === 'circle' || activeTool === 'rectangle') && startPos && endPos) {
      setLocalAnnotations((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: activeTool,
          data: {
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
            width: Math.abs(endPos.x - startPos.x),
            height: Math.abs(endPos.y - startPos.y),
          },
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
        },
      ]);
    }

    setIsDrawing(false);
    setStartPos(null);
    setEndPos(null);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textPosition) return;
    const annotation: SageModeAnnotation = {
      id: Date.now().toString(),
      type: 'text',
      data: { text: textInput, x: textPosition.x, y: textPosition.y },
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };
    setLocalAnnotations((prev) => [...prev, annotation]);
    addAnnotation(annotation);
    setTextInput('');
    setTextPosition(null);
  };

  const clearAnnotations = () => {
    setLocalAnnotations([]);
    setTarget(null);
    setHovered(null);
  };

  const saveAnnotations = () => {
    localAnnotations.forEach(addAnnotation);
    setLocalAnnotations([]);
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
      {/* Capture layer. Transparent to pointer events unless a tool is armed,
          so SAGE MODE never blocks normal browsing. */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[99990]"
        style={{
          pointerEvents: capturing && !target ? 'auto' : 'none',
          cursor: activeTool === 'selector' ? 'crosshair' : activeTool ? 'crosshair' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="w-full h-full" style={{ pointerEvents: 'none' }}>
          {localAnnotations.map((ann) => {
            if (ann.type === 'pen') {
              const d = (ann.data.path as { x: number; y: number }[])
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ');
              return <path key={ann.id} d={d} stroke="#FFD700" strokeWidth={2} fill="none" />;
            }
            if (ann.type === 'rectangle') {
              return (
                <rect
                  key={ann.id}
                  x={ann.data.x}
                  y={ann.data.y}
                  width={ann.data.width}
                  height={ann.data.height}
                  stroke="#FFD700"
                  strokeWidth={2}
                  fill="none"
                />
              );
            }
            if (ann.type === 'circle') {
              return (
                <ellipse
                  key={ann.id}
                  cx={ann.data.x + ann.data.width / 2}
                  cy={ann.data.y + ann.data.height / 2}
                  rx={ann.data.width / 2}
                  ry={ann.data.height / 2}
                  stroke="#FFD700"
                  strokeWidth={2}
                  fill="none"
                />
              );
            }
            if (ann.type === 'text') {
              return (
                <text key={ann.id} x={ann.data.x} y={ann.data.y} fill="#FFD700" fontSize={14}>
                  {ann.data.text}
                </text>
              );
            }
            return null;
          })}

          {/* In-progress shapes */}
          {isDrawing && activeTool === 'pen' && currentPath.length > 0 && (
            <path
              d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
              stroke="#FFD700"
              strokeWidth={2}
              fill="none"
            />
          )}
          {isDrawing && activeTool === 'rectangle' && startPos && endPos && (
            <rect
              x={Math.min(startPos.x, endPos.x)}
              y={Math.min(startPos.y, endPos.y)}
              width={Math.abs(endPos.x - startPos.x)}
              height={Math.abs(endPos.y - startPos.y)}
              stroke="#FFD700"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          )}
          {isDrawing && activeTool === 'circle' && startPos && endPos && (
            <ellipse
              cx={(startPos.x + endPos.x) / 2}
              cy={(startPos.y + endPos.y) / 2}
              rx={Math.abs(endPos.x - startPos.x) / 2}
              ry={Math.abs(endPos.y - startPos.y) / 2}
              stroke="#FFD700"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          )}
        </svg>
      </div>

      {/* Selection highlight — drawn as its own layer rather than mutating the
          page element's inline styles, which the old version did and never
          fully undid. */}
      {activeTool === 'selector' && highlight && (
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
          <span className="absolute -top-6 left-0 whitespace-nowrap bg-yellow-400 px-2 py-0.5 text-[10px] font-mono text-black">
            {highlight.source || `<${highlight.tag}> — no source stamp`}
          </span>
        </div>
      )}

      {/* Inline text-tool input */}
      {textPosition && activeTool === 'text' && (
        <div
          data-sage-chrome
          className="fixed z-[99999] bg-black/95 border border-yellow-400/50 p-2"
          style={{ top: textPosition.y, left: textPosition.x }}
        >
          <input
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setTextPosition(null);
            }}
            placeholder="Note…"
            className="bg-transparent text-yellow-400 text-xs outline-none placeholder:text-white/30"
          />
        </div>
      )}

      {/* Composer — the actual point of the thing */}
      {target && (
        <div
          data-sage-chrome
          className="fixed bottom-4 right-4 z-[99999] w-[380px] bg-black/95 border border-yellow-400/50 p-4 shadow-lg"
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
            <span className="text-white/30 text-[10px]">⌘↵ to send</span>
            <button
              onClick={sendRequest}
              disabled={!comment.trim() || submit.status === 'sending'}
              className="px-3 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 disabled:opacity-40 disabled:hover:bg-yellow-400/20 border border-yellow-400/50 text-yellow-400 text-xs font-medium transition flex items-center gap-1"
            >
              <PaperAirplaneIcon className="w-3 h-3" />
              {submit.status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div
        data-sage-chrome
        className={`fixed right-4 z-[99999] bg-black/95 border border-yellow-400/50 p-4 shadow-lg transition-all ${
          target ? 'bottom-[280px]' : 'bottom-4'
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400 font-bold text-sm">SAGE MODE ACTIVE</span>
          </div>
          <button
            onClick={exitSageMode}
            className="p-1 text-white/50 hover:text-white transition"
            title="Exit SAGE MODE (Esc)"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {(
            [
              ['selector', CursorArrowRaysIcon, 'Select an element'],
              ['pen', PencilIcon, 'Pen'],
              ['circle', LifebuoyIcon, 'Circle'],
              ['rectangle', StopIcon, 'Rectangle'],
              ['text', ChatBubbleBottomCenterTextIcon, 'Text note'],
            ] as [Exclude<ToolType, null>, typeof PencilIcon, string][]
          ).map(([tool, Icon, label]) => (
            <button
              key={tool}
              onClick={() => {
                setActiveTool(activeTool === tool ? null : tool);
                setTarget(null);
                setHovered(null);
              }}
              className={`p-2 border transition ${
                activeTool === tool
                  ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveAnnotations}
            className="flex-1 px-3 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/50 text-yellow-400 text-xs font-medium transition flex items-center justify-center gap-1"
          >
            <CheckIcon className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={clearAnnotations}
            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 text-xs font-medium transition"
            title="Clear annotations"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-white/60 text-xs">
            {activeTool === 'selector' && !target
              ? 'Click any element to describe a change.'
              : activeTool
              ? `Active: ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool`
              : 'Pick a tool to begin. Esc exits.'}
          </p>
        </div>
      </div>
    </>
  );
}
