import { useState, useEffect } from 'react';

const BUCKET = 'product-images-transparent';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/** Stable filename derived from the original image URL */
function toFilename(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 80) + '.png';
}

/** Public URL in Supabase storage for a given filename */
function supabasePublicUrl(filename: string): string {
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

/** Returns true if the file already exists in Supabase storage */
async function existsInSupabase(filename: string): Promise<boolean> {
    try {
        const res = await fetch(supabasePublicUrl(filename), { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Uploads a processed PNG blob via the server-side API route so that the
 * Supabase service-role key is never exposed to the browser.
 */
async function uploadViaApi(filename: string, blob: Blob): Promise<string | null> {
    try {
        const res = await fetch('/api/upload-processed-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'x-filename': filename,
            },
            body: blob,
        });
        if (res.ok) {
            const data = await res.json();
            return data.url ?? null;
        }
        const body = await res.text().catch(() => '');
        console.warn('Upload API failed', res.status, body);
        return null;
    } catch (e) {
        console.warn('Upload API error', e);
        return null;
    }
}

/**
 * Global serial queue — WASM background removal runs on the main thread
 * (numThreads=1 fallback when SharedArrayBuffer is unavailable). Processing
 * all images simultaneously would block the UI and crash the page. This
 * ensures only ONE image is processed at a time.
 */
let queueTail: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
    const next = queueTail.then(() => task());
    // Swallow errors in the chain so a failed task doesn't block the queue
    queueTail = next.catch(() => {});
    return next;
}

/**
 * Removes the background from a product image.
 *
 * Cache hierarchy:
 *   1. localStorage (instant — same browser)
 *   2. Supabase storage (shared across ALL visitors — processed once, instant forever)
 *   3. Process in browser via @imgly/background-removal, then upload via API
 *
 * onComplete(wasNew) fires when settled:
 *   wasNew = true  → image was freshly processed by AI this session
 *   wasNew = false → image was already cached (localStorage or Supabase)
 */
export function useBackgroundRemoval(
    imageUrl: string | null,
    onComplete?: (wasNew: boolean) => void,
) {
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!imageUrl) return;

        const filename = toFilename(imageUrl);
        const localKey = 'bgr_v2_' + filename;
        let cancelled = false;

        async function run() {
            // 1. localStorage hit — instant
            const cached = localStorage.getItem(localKey);
            if (cached) {
                setProcessedUrl(cached);
                onComplete?.(false);
                return;
            }

            // 2. Supabase hit — already processed by a previous visitor
            const exists = await existsInSupabase(filename);
            if (cancelled) return;
            if (exists) {
                const url = supabasePublicUrl(filename);
                localStorage.setItem(localKey, url);
                setProcessedUrl(url);
                onComplete?.(false);
                return;
            }

            // 3. Process fresh — serialised through global queue so only one
            //    WASM session runs at a time (prevents main-thread overload).
            setProcessing(true);
            await enqueue(async () => {
                if (cancelled) return;

                // onnxruntime-web creates a type:"module" Worker via
                //   new Worker(new URL("ort-wasm-simd-threaded.mjs", import.meta.url), {type:"module"})
                // In the Vite production bundle import.meta.url is the chunk URL so the
                // resolved path doesn't exist → "Importing a module script failed".
                // Fix: intercept Worker construction and redirect to our static copy.
                const staticBase = `${window.location.origin}/onnxruntime-web/`;
                const OrigWorker = (globalThis as any).Worker;
                (globalThis as any).Worker = class extends OrigWorker {
                    constructor(url: string | URL, options?: WorkerOptions) {
                        const urlStr = url instanceof URL ? url.href : String(url);
                        if (urlStr.includes('ort-wasm-simd-threaded') || urlStr.includes('ort.wasm')) {
                            url = `${staticBase}ort-wasm-simd-threaded.mjs`;
                        }
                        super(url, options);
                    }
                };
                try {
                    const ort = await import('onnxruntime-web');
                    ort.env.wasm.wasmPaths = staticBase;

                    const { removeBackground } = await import('@imgly/background-removal');

                    // Proxy through our server so WASM isn't blocked by Fourthwall CORS.
                    // Must be absolute — @imgly resolves relative URLs against publicPath (CDN).
                    const proxiedUrl = `${window.location.origin}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
                    const blob = await removeBackground(proxiedUrl, {
                        output: { format: 'image/png', quality: 0.9 },
                    });
                    if (cancelled) return;

                    const uploadedUrl = await uploadViaApi(filename, blob);
                    if (cancelled) return;

                    if (uploadedUrl) {
                        // Persist the Supabase URL — survives page reloads for all visitors
                        localStorage.setItem(localKey, uploadedUrl);
                        setProcessedUrl(uploadedUrl);
                    } else {
                        // Upload failed — use an object URL for this session only.
                        // Don't cache empty string so the next visit retries the upload.
                        setProcessedUrl(URL.createObjectURL(blob));
                    }
                    onComplete?.(true);
                } catch (err) {
                    if (!cancelled) {
                        const msg = err instanceof Error ? err.message : String(err);
                        console.warn('Background removal failed:', msg);
                        setError(msg);
                        onComplete?.(false);
                    }
                } finally {
                    (globalThis as any).Worker = OrigWorker;
                    if (!cancelled) setProcessing(false);
                }
            });
        }

        run();
        return () => { cancelled = true; };
    }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return { processedUrl, processing, error };
}
