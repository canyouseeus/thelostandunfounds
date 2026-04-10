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
 *   1. Supabase storage (shared across ALL visitors — processed once, instant forever)
 *   2. localStorage (instant repeat visits before Supabase check resolves)
 *   3. Process in browser via @imgly/background-removal, then upload to Supabase
 */
export function useBackgroundRemoval(imageUrl: string | null) {
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!imageUrl) return;

        const filename = toFilename(imageUrl);
        const localKey = 'bgr_v2_' + filename;
        let cancelled = false;

        async function run() {
            // 1. Check localStorage for instant result
            const cached = localStorage.getItem(localKey);
            if (cached) {
                setProcessedUrl(cached);
                return;
            }

            // 2. Check Supabase — already processed by a previous visitor
            const exists = await existsInSupabase(filename);
            if (cancelled) return;
            if (exists) {
                const url = supabasePublicUrl(filename);
                localStorage.setItem(localKey, url);
                setProcessedUrl(url);
                return;
            }

            // 3. Process in browser and upload so every future visitor gets it instantly
            setProcessing(true);
            try {
                const { removeBackground } = await import('@imgly/background-removal');
                const blob = await removeBackground(imageUrl, {
                    output: { format: 'image/png', quality: 0.9 },
                });
                if (cancelled) return;

                // Try to upload to Supabase (shared cache)
                const uploadedUrl = await uploadToSupabase(filename, blob);
                if (cancelled) return;

                const finalUrl = uploadedUrl || URL.createObjectURL(blob);
                localStorage.setItem(localKey, uploadedUrl || '');
                setProcessedUrl(finalUrl);
            } catch (err) {
                if (!cancelled) console.warn('Background removal failed, using original:', err);
            } finally {
                if (!cancelled) setProcessing(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [imageUrl]);

    return { processedUrl, processing };
}
