/**
 * Convert a gallery photo to a DTF print-size file, in the browser.
 *
 * DTF transfers are ordered in inches, not pixels, and the film is printed at a
 * fixed density — so "12 inch at 300 DPI" is 3600px on that edge and nothing
 * else. Working that out by hand for every photo is the step this removes.
 *
 * The resize runs entirely client-side. The alternative was an admin endpoint
 * doing it in sharp, which would have meant the original travelling to a Vercel
 * function and the result travelling back — Drive egress on a project that has
 * already been moved once to escape an egress overage, and a 4.5MB request
 * ceiling that a 12MB camera JPEG does not fit under anyway. Here the only
 * transfer is the one the drawer already makes to show the photo.
 *
 * Canvas gives pixels but no physical size, so `withDpi` writes the density
 * into the container afterwards. Without it every export opens as 72 DPI and
 * the operator retypes the dimensions, which defeats the point.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { withDpi } from '../../lib/imageDpi';
import { logApiCall, logError } from '../../lib/adminErrorLog';

/**
 * The stream endpoint resizes anything it is asked for below 4096 and hands
 * back the original at or above it, so this asks for the largest source the
 * gallery can serve. It caps a 300 DPI export at roughly 13.6in on the long
 * edge; past that the readout reports the upscale rather than hiding it.
 */
const SOURCE_EDGE = 4096;

const SIZE_PRESETS = [8, 10, 11, 12, 14];
const DPI_PRESETS = [150, 300, 600];

type FitRule = 'longest' | 'width' | 'height';
type Format = 'png' | 'jpeg';

interface Props {
    fileId: string;
    title: string | null;
}

/** Uppercase pill used for every choice in this panel. Square, flat, no outline. */
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{ borderRadius: 0 }}
            className={
                'px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ' +
                (active ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')
            }
        >
            {children}
        </button>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="w-16 shrink-0 pt-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{label}</span>
            <div className="flex flex-wrap gap-1.5 min-w-0">{children}</div>
        </div>
    );
}

function slugify(name: string | null): string {
    const base = (name || 'photo').toLowerCase().replace(/\.[a-z0-9]+$/, '');
    return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'photo';
}

export default function DtfExportPanel({ fileId, title }: Props) {
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    const [loading, setLoading] = useState(false);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const [inches, setInches] = useState(12);
    const [customInches, setCustomInches] = useState('');
    const [dpi, setDpi] = useState(300);
    const [fit, setFit] = useState<FitRule>('longest');
    const [format, setFormat] = useState<Format>('png');

    // The source is fetched once per photo and reused for every export, so
    // changing size or DPI never re-downloads it.
    useEffect(() => {
        let cancelled = false;
        let created: ImageBitmap | null = null;

        setBitmap(null);
        setError(null);
        setDone(null);
        setLoading(true);

        const url = `/api/gallery/stream?fileId=${encodeURIComponent(fileId)}&size=${SOURCE_EDGE}`;
        (async () => {
            try {
                const res = await fetch(url);
                logApiCall('GET', '/api/gallery/stream', res.status, `dtf source ${fileId}`);
                if (!res.ok) throw new Error(`Source unavailable (${res.status})`);
                const blob = await res.blob();
                // EXIF-rotated originals must be uprighted before anything is
                // measured, or a portrait frame is sized as a landscape one.
                created = await createImageBitmap(blob, { imageOrientation: 'from-image' });
                if (cancelled) { created.close(); return; }
                setBitmap(created);
            } catch (err) {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Could not load the full-size photo.';
                logError(`DTF source load failed: ${message}`);
                setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            if (created) created.close();
        };
    }, [fileId]);

    /**
     * Output dimensions for the current settings.
     *
     * The photo keeps the orientation it was shot in — a portrait frame exports
     * portrait, a landscape one lands landscape, and only the scale changes.
     * An earlier draft offered buttons to force one or the other, but the only
     * way to reshape a photo without cropping it is to rotate it, which lays a
     * landscape frame on its side. That is right for a sleeve print and wrong
     * for everything else, so the control is gone rather than mislabelled.
     */
    const plan = useMemo(() => {
        if (!bitmap) return null;
        const w = bitmap.width;
        const h = bitmap.height;

        const limit = Math.round(inches * dpi);
        const basis = fit === 'width' ? w : fit === 'height' ? h : Math.max(w, h);
        const scale = limit / basis;
        const outW = Math.max(1, Math.round(w * scale));
        const outH = Math.max(1, Math.round(h * scale));

        return {
            w, h, scale, outW, outH,
            // Largest print this source covers natively, on the same fit rule.
            nativeInches: basis / dpi,
        };
    }, [bitmap, inches, dpi, fit]);

    const runExport = useCallback(async () => {
        if (!bitmap || !plan) return;
        setWorking(true);
        setError(null);
        setDone(null);
        try {
            // A single drawImage from 6240px to 3600px aliases fine detail, so
            // anything below half size is halved repeatedly first. Each step
            // averages neighbouring pixels the way a proper filter would.
            let currentW = plan.w;
            let currentH = plan.h;
            let current: HTMLCanvasElement | ImageBitmap = bitmap;
            while (currentW > plan.outW * 2 && currentH > plan.outH * 2) {
                const stepW = Math.max(plan.outW, Math.round(currentW / 2));
                const stepH = Math.max(plan.outH, Math.round(currentH / 2));
                const step = document.createElement('canvas');
                step.width = stepW;
                step.height = stepH;
                const sctx = step.getContext('2d');
                if (!sctx) throw new Error('Canvas unavailable in this browser.');
                sctx.imageSmoothingEnabled = true;
                sctx.imageSmoothingQuality = 'high';
                sctx.drawImage(current, 0, 0, stepW, stepH);
                current = step;
                currentW = stepW;
                currentH = stepH;
            }

            const canvas = document.createElement('canvas');
            canvas.width = plan.outW;
            canvas.height = plan.outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas unavailable in this browser.');
            // JPEG has no alpha; without a ground, transparent pixels turn black.
            if (format === 'jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, plan.outW, plan.outH);
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(current, 0, 0, plan.outW, plan.outH);

            const mime = format === 'png' ? 'image/png' : 'image/jpeg';
            const raw: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Encoding failed — the image may be too large.'))),
                    mime,
                    format === 'jpeg' ? 0.92 : undefined,
                );
            });

            const stamped = await withDpi(raw, dpi);
            const name = `${slugify(title)}-${plan.outW}x${plan.outH}-${inches}in-${dpi}dpi.${format === 'png' ? 'png' : 'jpg'}`;

            const href = URL.createObjectURL(stamped);
            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.download = name;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            // Revoked on the next tick so the download has taken the handle.
            setTimeout(() => URL.revokeObjectURL(href), 60_000);

            setDone(name);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Export failed.';
            logError(`DTF export failed: ${message}`);
            setError(message);
        } finally {
            setWorking(false);
        }
    }, [bitmap, plan, format, dpi, inches, title]);

    return (
        <div className="space-y-3">
            {loading && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Loading full-size source…</p>
            )}

            {error && !loading && (
                <div className="flex items-start gap-2 bg-white/5 p-2.5">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400 break-words">{error}</p>
                </div>
            )}

            {bitmap && plan && (
                <>
                    <div className="space-y-2">
                        <Row label="Size">
                            {SIZE_PRESETS.map((n) => (
                                <Chip key={n} active={!customInches && inches === n} onClick={() => { setCustomInches(''); setInches(n); }}>
                                    {n}"
                                </Chip>
                            ))}
                            <input
                                type="number"
                                min="1"
                                max="60"
                                step="0.25"
                                value={customInches}
                                placeholder="CUSTOM"
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setCustomInches(raw);
                                    const n = parseFloat(raw);
                                    if (Number.isFinite(n) && n > 0 && n <= 60) setInches(n);
                                }}
                                style={{ borderRadius: 0 }}
                                className="w-20 px-2 py-1.5 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest placeholder:text-white/25 focus:outline-none focus:bg-white/10"
                            />
                        </Row>

                        <Row label="Fit">
                            <Chip active={fit === 'longest'} onClick={() => setFit('longest')}>Longest edge</Chip>
                            <Chip active={fit === 'width'} onClick={() => setFit('width')}>Width</Chip>
                            <Chip active={fit === 'height'} onClick={() => setFit('height')}>Height</Chip>
                        </Row>

                        <Row label="DPI">
                            {DPI_PRESETS.map((n) => (
                                <Chip key={n} active={dpi === n} onClick={() => setDpi(n)}>{n}</Chip>
                            ))}
                        </Row>

                        <Row label="Format">
                            <Chip active={format === 'png'} onClick={() => setFormat('png')}>PNG</Chip>
                            <Chip active={format === 'jpeg'} onClick={() => setFormat('jpeg')}>JPEG</Chip>
                        </Row>
                    </div>

                    <div className="bg-white/5 p-2.5 space-y-1">
                        <div className="flex justify-between gap-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Source</span>
                            <span className="text-[10px] font-bold text-white/70 text-left">{plan.w} × {plan.h} px</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Output</span>
                            <span className="text-[10px] font-bold text-white text-left">{plan.outW} × {plan.outH} px</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Print</span>
                            <span className="text-[10px] font-bold text-white text-left">
                                {(plan.outW / dpi).toFixed(2)} × {(plan.outH / dpi).toFixed(2)} in @ {dpi} DPI
                            </span>
                        </div>
                    </div>

                    {plan.scale > 1.005 && (
                        <div className="flex items-start gap-2 bg-white/5 p-2.5">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400 text-left">
                                Upscaled {plan.scale.toFixed(2)}× — this source covers {plan.nativeInches.toFixed(1)}" at {dpi} DPI without stretching.
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={runExport}
                        disabled={working}
                        style={{ borderRadius: 0 }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-white/80 transition-colors disabled:opacity-40"
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        {working ? 'Rendering…' : `Export ${inches}" ${format.toUpperCase()}`}
                    </button>

                    {done && (
                        <p className="text-[10px] font-bold uppercase tracking-wide text-white/40 break-all text-left">Saved {done}</p>
                    )}
                </>
            )}
        </div>
    );
}
