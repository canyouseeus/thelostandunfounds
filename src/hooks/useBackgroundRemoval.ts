import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'bg_removed_v1_';

/**
 * Removes the background from an image URL using @imgly/background-removal.
 * Results are cached in localStorage so each image is only processed once.
 * Returns the original URL while processing, swaps to the transparent PNG when done.
 */
export function useBackgroundRemoval(imageUrl: string | null) {
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!imageUrl) return;

        const cacheKey = CACHE_PREFIX + btoa(imageUrl).slice(0, 100);

        // Return cached result immediately if available
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setProcessedUrl(cached);
            return;
        }

        let cancelled = false;

        async function process() {
            setProcessing(true);
            try {
                const { removeBackground } = await import('@imgly/background-removal');

                const blob = await removeBackground(imageUrl!, {
                    output: { format: 'image/png', quality: 0.9 },
                    // Use CDN-hosted model files — no local config needed
                });

                if (cancelled) return;

                // Convert blob to data URL for localStorage storage
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (cancelled) return;
                    const dataUrl = reader.result as string;
                    try {
                        localStorage.setItem(cacheKey, dataUrl);
                    } catch {
                        // localStorage full — skip caching, still display
                    }
                    setProcessedUrl(dataUrl);
                    setProcessing(false);
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                if (!cancelled) {
                    console.warn('Background removal failed, using original:', err);
                    setProcessing(false);
                }
            }
        }

        process();
        return () => { cancelled = true; };
    }, [imageUrl]);

    return { processedUrl, processing };
}
