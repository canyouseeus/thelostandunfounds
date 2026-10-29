/**
 * The ? on a member or photographer dashboard: every walkthrough for that
 * dashboard, one tap away. The admin dashboard keeps its tutorials in SAGE
 * MODE instead; SAGE MODE is admin-only, so everyone else needs this.
 *
 * Bottom left, frosted like the SAGE MODE triangle (bento-design's floating
 * glass: bg-white/10 + backdrop-blur, no shadow), so the two never share a
 * corner when an admin opens one of these dashboards.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DashboardId } from './tours';
import { TutorialList } from './TutorialLibrary';

export default function TourHelpButton({ dashboard }: { dashboard: DashboardId }) {
  const [open, setOpen] = useState(false);

  return createPortal(
    <>
      <button
        data-sage-chrome
        data-tour="tour-help"
        onClick={() => setOpen(true)}
        aria-label="Tutorials"
        title="Tutorials"
        className="fixed left-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[100000] h-12 w-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-md text-white text-lg font-black hover:bg-white hover:text-black transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          data-sage-chrome
          className="fixed inset-0 z-[100005] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-black p-6 text-left"
            style={{ borderRadius: 0 }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tutorials"
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest text-white">Tutorials</h2>
                <p className="text-xs text-white/50 mt-1">Pick one and it walks you through, step by step.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-white/50 hover:text-white" aria-label="Close tutorials">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <TutorialList dashboard={dashboard} onStart={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
