/**
 * DEMO MODE — the "ready to save or not save?" confirm.
 *
 * Shown after a demo form has run its full submit path. It does two jobs:
 * it stops the write, and it *teaches* — the panel names the table and prints
 * the exact payload the live form would have sent. That turns the walkthrough
 * into documentation of the data model, which is the thing that is otherwise
 * impossible to show somebody without giving them the database.
 *
 * Both buttons discard. SAVE flashes the real success state first, then the
 * form resets to the beginning; DISCARD resets immediately.
 *
 * Overlay is rgba(0,0,0,0.95) + backdrop-blur per noir-design's glassmorphism
 * rule — the blur and the tone do the separating, no border, no shadow. Square
 * corners: a modal is neither a tool tray nor an avatar.
 */

import { useDemo } from '../../lib/demo/DemoContext';
import { DEMO_LAYER } from '../../lib/demo/layers';

export default function DemoSaveDialog() {
  const { pending, resolve } = useDemo();
  if (!pending) return null;

  const entries = Object.entries(pending.payload);

  return (
    <div
      className={`fixed inset-0 ${DEMO_LAYER.saveDialog} flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-save-title"
    >
      <div className="w-full max-w-lg bg-white/5 p-6 sm:p-8" style={{ borderRadius: 0 }}>
        <h2
          id="demo-save-title"
          className="text-white text-lg sm:text-xl font-black uppercase tracking-[0.2em] text-left"
        >
          Ready To Save?
        </h2>

        <p className="mt-3 text-white/60 text-[13px] leading-relaxed text-left">
          This is demo mode, so this will not be written. Here is what the live form
          would have sent, and where it would have landed.
        </p>

        <div className="mt-6 bg-black p-4" style={{ borderRadius: 0 }}>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 text-left">
            {pending.action} → {pending.table}
          </p>
          <dl className="mt-4 space-y-2.5">
            {entries.length === 0 && (
              <p className="text-[13px] text-white/40 text-left">Empty payload.</p>
            )}
            {entries.map(([key, value]) => (
              <div key={key} className="flex gap-4 items-baseline">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-white/40 w-28 shrink-0 text-left">
                  {key}
                </dt>
                <dd className="text-[13px] text-white/80 break-words min-w-0 text-left">
                  {String(value ?? '').trim() || <span className="text-white/25">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => resolve(true)}
            className="flex-1 h-12 bg-white text-black text-[11px] font-black uppercase tracking-[0.25em] hover:bg-white/80 transition-colors"
            style={{ borderRadius: 0 }}
          >
            Save
          </button>
          <button
            onClick={() => resolve(false)}
            className="flex-1 h-12 bg-white/5 text-white/70 text-[11px] font-black uppercase tracking-[0.25em] hover:bg-white/10 hover:text-white transition-colors"
            style={{ borderRadius: 0 }}
          >
            Don't Save
          </button>
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/25 text-left">
          Either way the form resets
        </p>
      </div>
    </div>
  );
}
