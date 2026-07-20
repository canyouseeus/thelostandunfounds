import { useState, useEffect } from 'react';

/**
 * Resolves the background-removed (transparent) product image.
 *
 * The transparent PNGs are PRE-GENERATED at build/author time by
 * `scripts/generate-transparent-product-images.mjs` and committed to
 * `public/product-transparent/`. They are served as static Vercel assets — so
 * the shop's outlined images cost ZERO Supabase egress and require no in-browser
 * WASM background removal (the previous approach hammered Supabase storage and
 * blew the free-tier egress quota).
 *
 * The filename is the first 32 hex chars of sha256(imageUrl) — this MUST stay in
 * sync with `toFilename` in the generator script. Hashing the URL means a
 * changed Fourthwall image automatically points at a new (missing) file, and the
 * caller falls back to the original photo until the script is re-run.
 *
 * If the static PNG is missing, the consuming component's <img> onError handler
 * reverts to the original product photo without the outline styling.
 */

const TRANSPARENT_DIR = '/product-transparent';

/** MUST match toFilename() in scripts/generate-transparent-product-images.mjs */
async function toFilename(url: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
    const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hex.slice(0, 32) + '.png';
}

export function useBackgroundRemoval(
    imageUrl: string | null,
    onComplete?: (wasNew: boolean) => void,
) {
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!imageUrl) {
            setProcessedUrl(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const file = await toFilename(imageUrl);
                if (cancelled) return;
                setProcessedUrl(`${TRANSPARENT_DIR}/${file}`);
                onComplete?.(false);
            } catch {
                if (!cancelled) {
                    setProcessedUrl(null);
                    onComplete?.(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // `processing` / `error` kept for API compatibility with existing consumers;
    // there is no async processing anymore.
    return { processedUrl, processing: false, error: null as string | null };
}
