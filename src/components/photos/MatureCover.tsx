/**
 * 18+ photos: blurred until the viewer says they are an adult.
 *
 * A photo marked is_mature (nudity — see the Photographer Terms §7) renders
 * blurred under an "18+" card. Tapping it asks once; "I'm 18 or older"
 * reveals every 18+ photo on the site for this browser. It is an age
 * warning, not access control: the photo is still served to anyone with its
 * link, the same as every other gallery photo.
 *
 * Noir: black, uppercase, square, no borders and no shadows.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const KEY = 'tlau_mature_ok';
const EVENT = 'tlau:mature-ok';

function readConsent(): boolean {
    try {
        return localStorage.getItem(KEY) === '1';
    } catch {
        return false;
    }
}

// Held here too, so one confirmation reveals every 18+ photo on the page even
// when storage is unavailable (private mode, blocked site data).
let confirmedThisPage = readConsent();

/** Whether this viewer has confirmed they are 18+, kept in step across every photo on the page. */
export function useMatureConsent(): [boolean, () => void] {
    const [ok, setOk] = useState(confirmedThisPage);
    useEffect(() => {
        const sync = () => setOk(confirmedThisPage);
        window.addEventListener(EVENT, sync);
        return () => window.removeEventListener(EVENT, sync);
    }, []);
    const confirm = useCallback(() => {
        confirmedThisPage = true;
        try { localStorage.setItem(KEY, '1'); } catch { /* private mode: holds for this page only */ }
        window.dispatchEvent(new Event(EVENT));
    }, []);
    return [ok, confirm];
}

/** Classes for the photo itself while it is hidden. */
export const MATURE_BLUR = 'blur-2xl scale-110';

/**
 * The cover over a hidden 18+ photo. Sits above the photo's own overlays and
 * swallows taps, so nothing behind it opens until the viewer confirms.
 */
export function MatureCover({ onConfirm, compact = false }: { onConfirm: () => void; compact?: boolean }) {
    const [asking, setAsking] = useState(false);
    const stop = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); };

    return (
        <>
            <div
                className="absolute inset-0 z-[50] flex items-center justify-center bg-black/40 text-white text-center p-3 cursor-pointer select-none"
                onClick={(e) => { stop(e); setAsking(true); }}
                onContextMenu={stop}
                role="button"
                aria-label="18+ content. Tap to view."
            >
                <div>
                    <p className={`${compact ? 'text-lg' : 'text-2xl'} font-black tracking-[0.2em]`}>18+</p>
                    {!compact && (
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 mt-1">Contains nudity · Tap to view</p>
                    )}
                </div>
            </div>

            {/* Portalled: a gallery tile is a small, transformed box that would clip
                (and re-anchor) a fixed dialog drawn inside it. */}
            {asking && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 text-white text-left"
                    onClick={(e) => { stop(e); setAsking(false); }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="18+ only"
                >
                    <div className="bg-[#0A0A0A] p-6 w-full max-w-xs" style={{ borderRadius: 0 }} onClick={stop}>
                        <p className="text-2xl font-black tracking-[0.2em] mb-2">18+</p>
                        <p className="text-sm text-white/70 mb-6">
                            This photo contains nudity. You must be 18 or older to view it.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={(e) => { stop(e); setAsking(false); onConfirm(); }}
                                className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
                                style={{ borderRadius: 0 }}
                            >
                                I'm 18 or older
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { stop(e); setAsking(false); }}
                                className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white hover:bg-white hover:text-black transition-colors"
                                style={{ borderRadius: 0 }}
                            >
                                Keep hidden
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
