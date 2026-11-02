/**
 * What an à la carte buyer pays (owner, 2026-11-02): $5 a photo, 4 for $10,
 * the whole album for $75 — the numbers live on the gallery
 * (buyer_price, buyer_bundles, buyer_album_price).
 *
 * One function for the gallery page's tray total and the server checkout
 * (lib/api-handlers/photos/_checkout-handler.ts imports this file), so the
 * price shown is the price charged.
 *
 *   - Bundles apply greedily, largest first; the rest are buyer_price each.
 *   - Buying every photo in the album costs buyer_album_price (if set).
 */
export interface BuyerBundle {
    photo_count: number;
    price: number;
}

export interface BuyerPricing {
    single: number;
    bundles: BuyerBundle[];
    albumPrice: number | null;
    /** How many photos the album holds — "every photo" for albumPrice. */
    albumCount: number;
}

export function cleanBundles(raw: unknown): BuyerBundle[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((b: any) => ({ photo_count: Math.floor(Number(b?.photo_count)), price: Number(b?.price) }))
        .filter(b => b.photo_count > 1 && b.price > 0);
}

export function buyerTotal(count: number, pricing: BuyerPricing): number {
    if (count <= 0) return 0;
    if (pricing.albumPrice && pricing.albumPrice > 0 && pricing.albumCount > 0 && count >= pricing.albumCount) {
        return round(pricing.albumPrice);
    }
    let amount = 0;
    let remaining = count;
    for (const b of [...pricing.bundles].sort((a, c) => c.photo_count - a.photo_count)) {
        const n = Math.floor(remaining / b.photo_count);
        if (n > 0) {
            amount += n * b.price;
            remaining -= n * b.photo_count;
        }
    }
    amount += remaining * pricing.single;
    return round(amount);
}

function round(n: number): number {
    return Math.round(n * 100) / 100;
}
