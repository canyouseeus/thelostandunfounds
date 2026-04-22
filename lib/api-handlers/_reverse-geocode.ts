// Nominatim (OpenStreetMap) reverse geocoder with 1 req/sec throttle + in-process cache.
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/

let lastCallMs = 0;
const cache = new Map<string, string | null>();

function cacheKey(lat: number, lng: number): string {
    // ~110m precision — good enough to dedupe neighborhood lookups
    return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = 1000 - (now - lastCallMs);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCallMs = Date.now();
}

export async function reverseGeocodeNeighborhood(lat: number, lng: number): Promise<string | null> {
    const key = cacheKey(lat, lng);
    if (cache.has(key)) return cache.get(key)!;

    await throttle();
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'thelostandunfounds.com photo-sync (sync@thelostandunfounds.com)',
                'Accept-Language': 'en',
            },
        });
        if (!res.ok) {
            cache.set(key, null);
            return null;
        }
        const data = await res.json() as { address?: Record<string, string> };
        const addr = data.address || {};
        // Prefer neighborhood, fall back up the hierarchy
        const name =
            addr.neighbourhood ||
            addr.quarter ||
            addr.suburb ||
            addr.city_district ||
            addr.district ||
            addr.town ||
            addr.village ||
            addr.city ||
            addr.county ||
            null;
        const titled = name ? toTitleCase(name) : null;
        cache.set(key, titled);
        return titled;
    } catch (err) {
        console.error('Nominatim reverse-geocode failed:', err);
        cache.set(key, null);
        return null;
    }
}

function toTitleCase(s: string): string {
    return s
        .toLowerCase()
        .split(/\s+/)
        .map(w => w ? w[0].toUpperCase() + w.slice(1) : w)
        .join(' ');
}
