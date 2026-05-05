export interface VenueTag {
    id: string;
    name: string;
    metadata: {
        latitude: number;
        longitude: number;
        radius_meters?: number;
    };
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function tokenOverlapScore(a: string, b: string): number {
    const normA = normalizeName(a);
    const normB = normalizeName(b);
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;

    const tokensA = new Set(normA.split(' ').filter(t => t.length > 1));
    const tokensB = new Set(normB.split(' ').filter(t => t.length > 1));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let overlap = 0;
    for (const t of tokensA) if (tokensB.has(t)) overlap++;
    return overlap / Math.min(tokensA.size, tokensB.size);
}

export function medianGps(points: Array<{ latitude: number; longitude: number }>):
    { latitude: number; longitude: number } | null {
    if (points.length === 0) return null;
    const lats = points.map(p => p.latitude).sort((a, b) => a - b);
    const lngs = points.map(p => p.longitude).sort((a, b) => a - b);
    return {
        latitude: lats[Math.floor(lats.length / 2)],
        longitude: lngs[Math.floor(lngs.length / 2)],
    };
}

export const DEFAULT_VENUE_RADIUS_M = 75;

export function findVenueForFolder(
    folderName: string,
    gps: { latitude: number; longitude: number } | null,
    venues: VenueTag[],
): VenueTag | null {
    // Strongest: folder name token-overlaps a venue AND (no GPS, or GPS within radius).
    // GPS is the verifier — folder name alone isn't enough when we have GPS to check
    // against, because two unrelated folders can share a token with a venue name.
    for (const v of venues) {
        const score = tokenOverlapScore(folderName, v.name);
        if (score < 0.5) continue;
        if (!gps) return v;
        const dist = haversineMeters(gps.latitude, gps.longitude, v.metadata.latitude, v.metadata.longitude);
        const radius = v.metadata.radius_meters || DEFAULT_VENUE_RADIUS_M;
        if (dist <= radius) return v;
    }
    // Weaker: GPS-only match within radius (used when the folder name doesn't
    // hint at a venue — e.g. a generic "uploads" folder).
    if (gps) {
        for (const v of venues) {
            const dist = haversineMeters(gps.latitude, gps.longitude, v.metadata.latitude, v.metadata.longitude);
            const radius = v.metadata.radius_meters || DEFAULT_VENUE_RADIUS_M;
            if (dist <= radius) return v;
        }
    }
    return null;
}
