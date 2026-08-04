import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * The full-screen card every dashboard widget expands into: long-press on
 * touch, click with a mouse, and the tile's face opens to the full thing —
 * weather to the forecast, the calendar to its month, a data tile to its
 * breakdown. One shell so they all close the same way (X, Escape) and stack
 * the same way (z-[9999], per modal-z-index-manager).
 */
export function DetailSheet({ onClose, label, children, wide = false }: {
  onClose: () => void;
  /** Accessible name for the close control — "Close weather detail" etc. */
  label: string;
  children: ReactNode;
  /** Widens the card for content that wants a full month grid or a chart. */
  wide?: boolean;
}) {
  // Escape closes, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black p-4 select-none"
      // Tailwind mis-parses vendor-prefixed arbitrary properties, so these go inline.
      style={{ WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className={`relative mx-auto my-8 w-full bg-black p-6 ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
        style={{ borderRadius: 0 }}
      >
        <button
          onClick={onClose}
          aria-label={label}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors z-10"
          style={{ borderRadius: 0 }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
