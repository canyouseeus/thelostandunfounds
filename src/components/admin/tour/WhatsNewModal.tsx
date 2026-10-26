/**
 * NEW FEATURE pop-up on the admin dashboard. Shows the newest announced tour
 * this browser has not finished; GO starts its walkthrough. LATER hides it for
 * this visit only — it comes back next time until the tour is run or skipped.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { announcedTours } from './tours';
import { useTour } from './TourContext';

const SNOOZE_KEY = 'tlu_whats_new_snoozed';

function readSnoozed(): string | null {
  try { return sessionStorage.getItem(SNOOZE_KEY); } catch { return null; }
}

export default function WhatsNewModal() {
  const { start, activeId, seen, markSeen } = useTour();
  const [snoozed, setSnoozed] = useState<string | null>(readSnoozed);

  const tour = announcedTours().find(t => !seen.includes(t.id));
  if (!tour || activeId || snoozed === tour.id) return null;

  const later = () => {
    try { sessionStorage.setItem(SNOOZE_KEY, tour.id); } catch { /* private mode */ }
    setSnoozed(tour.id);
  };

  const shipped = new Date(`${tour.announce}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return createPortal(
    <div
      data-sage-chrome
      className="fixed inset-0 z-[100005] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="w-full max-w-md bg-black p-8 text-left" style={{ borderRadius: 0 }}>
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400 mb-4">
          <SparklesIcon className="w-4 h-4" />
          New Feature · {shipped}
        </p>
        <h2 id="whats-new-title" className="text-2xl font-black uppercase tracking-widest text-white mb-4">
          {tour.title}
        </h2>
        <p className="text-sm text-white/70 leading-relaxed mb-8">{tour.summary}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => start(tour.id)}
            autoFocus
            className="flex-1 px-6 py-4 text-sm font-black uppercase tracking-[0.3em] bg-white text-black hover:bg-white/80 transition-colors"
            style={{ borderRadius: 0 }}
          >
            Go
          </button>
          <button
            onClick={later}
            className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
            style={{ borderRadius: 0 }}
          >
            Later
          </button>
        </div>
        <button
          onClick={() => markSeen(tour.id)}
          className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-colors"
        >
          Don&rsquo;t show again
        </button>
        <p className="mt-6 text-xs text-white/40 leading-relaxed">
          Every walkthrough is in SAGE MODE: tap the triangle at the bottom right, then TUTORIALS.
        </p>
      </div>
    </div>,
    document.body
  );
}
