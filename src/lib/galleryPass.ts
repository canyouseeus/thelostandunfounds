/**
 * The viewer's pass for the gallery on screen (GET /api/gallery/pass): album
 * owner or à la carte buyer. Downloads carry it as &gp= because a download
 * link can't carry the session; the server checks it before handing over a
 * full-resolution file (lib/api-handlers/_stream-access.ts).
 */
let current: { slug: string; pass: string } | null = null;

export function setGalleryPass(slug: string, pass: string | null) {
    current = pass ? { slug, pass } : null;
}

/** Append the current pass to a stream URL (no-op when there isn't one). */
export function withGalleryPass(url: string): string {
    return current ? `${url}&gp=${encodeURIComponent(current.pass)}` : url;
}
