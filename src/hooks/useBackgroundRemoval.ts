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

/** Uploads a blob to Supabase storage using the anon key */
async function uploadToSupabase(filename: string, blob: Blob): Promise<string | null> {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    try {
        const res = await fetch(
            `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'image/png',
                    'x-upsert': 'false',
                },
                body: blob,
            }
        );
        if (res.ok) return supabasePublicUrl(filename);
        return null;
    } catch {
        return null;
    }
}

/**
 * Removes the background from a product image.
 *
 * Cache hierarchy:
 *   1. localStorage (instant — same browser)
 *   2. Supabase storage (shared across ALL visitors — processed once, instant forever)
 *   3. Process in browser via @imgly/background-removal, then upload to Supabase
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

            // 3. Process fresh in browser, upload so every future visitor gets it instantly
            setProcessing(true);
            try {
                const { removeBackground } = await import('@imgly/background-removal');

                // Proxy through our server so WASM isn't blocked by Fourthwall CORS
                const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
                const blob = await removeBackground(proxiedUrl, {
                    output: { format: 'image/png', quality: 0.9 },
                });
                if (cancelled) return;

                const uploadedUrl = await uploadToSupabase(filename, blob);
                if (cancelled) return;

                const finalUrl = uploadedUrl || URL.createObjectURL(blob);
                localStorage.setItem(localKey, uploadedUrl || '');
                setProcessedUrl(finalUrl);
                onComplete?.(true);
            } catch (err) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.warn('Background removal failed:', msg);
                    setError(msg);
                    onComplete?.(false);
                }
            } finally {
                if (!cancelled) setProcessing(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    return { processedUrl, processing, error };
}
