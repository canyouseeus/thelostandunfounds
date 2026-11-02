/**
 * Save to Photos — the phone way to take a whole gallery.
 *
 * On a phone, downloading many files one by one is a mess: Safari asks or
 * blocks after the first few, and the files land in the Files app, not the
 * camera roll. The share sheet ("Save N Images") puts them straight into
 * Photos.
 *
 * In batches of BATCH: a phone holds ~10 full-size photos in memory comfortably,
 * and iOS only opens the share sheet from a fresh tap — so each batch is
 * fetched first, then the person taps SAVE for it. Fetching after the tap
 * would outlive the tap and the share would be refused.
 *
 * Noir: black, uppercase, square, no borders.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const BATCH = 10;

export interface SaveItem {
    /** Same-origin URL that returns the file's bytes. */
    url: string;
    /** File name to save under, with extension. */
    filename: string;
    /** MIME type to fall back on when the response doesn't say. */
    type?: string;
}

/** True on a phone or tablet whose browser can share files (iOS 15+, Android Chrome). */
export function canSaveToPhotos(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
    if (!navigator.canShare || !navigator.share) return false;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return false;
    try {
        return navigator.canShare({ files: [new File([''], 'test.jpg', { type: 'image/jpeg' })] });
    } catch {
        return false;
    }
}

/** A file name for a gallery photo: its title, and an extension from its type. */
export function photoFilename(title: string | null | undefined, mimeType: string | null | undefined, fallbackId: string): string {
    const base = (title || fallbackId).replace(/[\\/:*?"<>|]+/g, '_').trim() || fallbackId;
    const type = (mimeType || 'image/jpeg').toLowerCase();
    const ext = type.includes('quicktime') ? 'mov' : type.startsWith('video/') ? 'mp4'
        : type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('heic') ? 'heic' : 'jpg';
    return /\.[a-z0-9]{2,4}$/i.test(base) ? base : `${base}.${ext}`;
}

export default function SaveToPhotosSheet({ items, onClose }: { items: SaveItem[]; onClose: () => void }) {
    const batches = Math.ceil(items.length / BATCH);
    const [batch, setBatch] = useState(0);
    const [files, setFiles] = useState<File[] | null>(null);
    const [fetched, setFetched] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    // Bumped by TRY AGAIN to re-fetch the same batch.
    const [attempt, setAttempt] = useState(0);
    const cancelled = useRef(false);

    const start = batch * BATCH;
    const slice = items.slice(start, start + BATCH);
    const label = slice.length === 1 ? `${start + 1}` : `${start + 1}–${start + slice.length}`;

    useEffect(() => () => { cancelled.current = true; }, []);

    // Fetch the current batch, so SAVE can share it inside the tap.
    useEffect(() => {
        if (done) return;
        let stale = false;
        setFiles(null);
        setFetched(0);
        setError(null);
        (async () => {
            const out: File[] = [];
            let failed = 0;
            for (const item of slice) {
                try {
                    const res = await fetch(item.url);
                    if (!res.ok) throw new Error(String(res.status));
                    const blob = await res.blob();
                    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : (item.type || 'image/jpeg');
                    out.push(new File([blob], item.filename, { type }));
                } catch {
                    failed++;
                }
                if (stale || cancelled.current) return;
                setFetched(n => n + 1);
            }
            if (stale || cancelled.current) return;
            if (out.length === 0) {
                setError('These photos could not be loaded. Check your connection and try again.');
                return;
            }
            if (failed) setError(`${failed} of these could not be loaded and will be skipped.`);
            setFiles(out);
        })();
        return () => { stale = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch, done, attempt]);

    const save = async () => {
        if (!files || saving) return;
        setSaving(true);
        try {
            await navigator.share({ files });
            if (batch + 1 >= batches) setDone(true);
            else setBatch(b => b + 1);
        } catch (err: any) {
            // AbortError: they closed the share sheet. Stay on this batch.
            if (err?.name !== 'AbortError') setError('Your phone didn’t open the save sheet. Tap SAVE again.');
        } finally {
            setSaving(false);
        }
    };

    const retry = () => setAttempt(a => a + 1);

    const content = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Save to Photos">
            <div className="w-full max-w-md bg-black p-6 space-y-5" style={{ borderRadius: 0 }}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-white text-sm font-black uppercase tracking-[0.2em]">Save to Photos</p>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                            {items.length} {items.length === 1 ? 'file' : 'files'}{batches > 1 ? ` · ${BATCH} at a time` : ''}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 text-white/60 hover:text-white" aria-label="Close">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {done ? (
                    <div className="space-y-4">
                        <p className="text-white text-sm">All saved. They’re in your Photos app.</p>
                        <button type="button" onClick={onClose} className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em]" style={{ borderRadius: 0 }}>
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {batches > 1 && (
                            <div className="h-1 bg-white/10">
                                <div className="h-1 bg-white transition-all" style={{ width: `${Math.round((batch / batches) * 100)}%` }} />
                            </div>
                        )}
                        {files ? (
                            <>
                                <p className="text-white/60 text-[13px] leading-relaxed normal-case">
                                    Tap SAVE, then <span className="text-white">Save {files.length === 1 ? 'Image' : `${files.length} Images`}</span>.
                                    {batch + 1 < batches ? ' The next set gets ready right after.' : ''}
                                </p>
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving}
                                    className="w-full py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 disabled:opacity-50"
                                    style={{ borderRadius: 0 }}
                                    data-tour="save-to-photos"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    Save {label} to Photos
                                </button>
                            </>
                        ) : error ? (
                            <button type="button" onClick={retry} className="w-full py-4 bg-white/10 text-white text-xs font-black uppercase tracking-[0.2em]" style={{ borderRadius: 0 }}>
                                Try again
                            </button>
                        ) : (
                            <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.2em]">
                                Getting {label} ready… {fetched}/{slice.length}
                            </p>
                        )}
                        {error && <p className="text-red-400 text-[11px] normal-case">{error}</p>}
                        {batches > 1 && (
                            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em]">Set {batch + 1} of {batches}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
