/**
 * Free-photo allowance for à la carte buyers (owner, 2026-11-04).
 *
 * photo_libraries.buyer_free_photos is { "email": count }: that buyer's first
 * `count` photos from this gallery cost nothing. After that they pay the
 * gallery's à la carte prices like everyone else on the list. It is how you
 * give someone "10 free" without making them an album owner (owners get every
 * photo free, with no limit).
 *
 * Free photos are granted as a completed $0 photo_orders row whose
 * paypal_order_id starts with `allowance_`, plus one photo_entitlements row
 * per photo, the same shape every paid order ends in, so the gallery page,
 * the download portal and /api/gallery/stream treat them as bought. No Stripe,
 * no affiliate code, no commission: nothing was sold.
 *
 * Used = entitlements on this buyer's allowance_ orders for photos in this
 * gallery. A grant is re-counted after it is written and undone if two
 * requests raced past the allowance.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const ALLOWANCE_PREFIX = 'allowance_';

const norm = (e: string) => e.trim().toLowerCase();

/** The allowance the gallery sets for this buyer (0 if none). */
export function allowanceFor(library: { buyer_free_photos?: unknown }, email: string): number {
    const map = library.buyer_free_photos;
    if (!map || typeof map !== 'object' || Array.isArray(map)) return 0;
    const want = norm(email);
    for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
        if (norm(k) === want) {
            const n = Math.floor(Number(v));
            return Number.isFinite(n) && n > 0 ? n : 0;
        }
    }
    return 0;
}

/** Photo ids in this gallery this buyer already holds, on any completed order. */
export async function ownedPhotoIds(supabase: SupabaseClient, libraryId: string, email: string): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('photo_entitlements')
        .select('photo_id, photo_orders!inner(email, payment_status), photos!inner(library_id)')
        .eq('photo_orders.email', norm(email))
        .eq('photo_orders.payment_status', 'completed')
        .eq('photos.library_id', libraryId);
    if (error) throw new Error(`owned lookup failed: ${error.message}`);
    return new Set((data || []).map((r: any) => r.photo_id));
}

/** How many of this gallery's photos the buyer has taken on their allowance. */
export async function freeUsed(supabase: SupabaseClient, libraryId: string, email: string): Promise<number> {
    const { data, error } = await supabase
        .from('photo_entitlements')
        .select('photo_id, photo_orders!inner(email, paypal_order_id), photos!inner(library_id)')
        .eq('photo_orders.email', norm(email))
        .like('photo_orders.paypal_order_id', `${ALLOWANCE_PREFIX}%`)
        .eq('photos.library_id', libraryId);
    if (error) throw new Error(`allowance lookup failed: ${error.message}`);
    return new Set((data || []).map((r: any) => r.photo_id)).size;
}

/** Allowance left for this buyer in this gallery. */
export async function freeLeft(supabase: SupabaseClient, library: { id: string; buyer_free_photos?: unknown }, email: string): Promise<number> {
    const allowance = allowanceFor(library, email);
    if (allowance <= 0) return 0;
    return Math.max(0, allowance - await freeUsed(supabase, library.id, email));
}

/**
 * Grant `photoIds` free on the buyer's allowance. Returns the order id, or
 * null when the grant would go over the allowance (it is undone).
 */
export async function grantFree(
    supabase: SupabaseClient,
    args: { libraryId: string; email: string; photoIds: string[]; allowance: number },
): Promise<string | null> {
    const email = norm(args.email);
    if (args.photoIds.length === 0) return null;
    const { data: order, error: orderError } = await supabase
        .from('photo_orders')
        .insert({
            email,
            total_amount_cents: 0,
            payment_status: 'completed',
            paypal_order_id: `${ALLOWANCE_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        })
        .select('id')
        .single();
    if (orderError || !order) throw new Error(`allowance order failed: ${orderError?.message}`);

    const expires = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error: entError } = await supabase
        .from('photo_entitlements')
        .insert(args.photoIds.map(photo_id => ({ order_id: order.id, photo_id, expires_at: expires })));
    if (entError) {
        await supabase.from('photo_orders').update({ payment_status: 'failed' }).eq('id', order.id);
        throw new Error(`allowance entitlements failed: ${entError.message}`);
    }

    // Two taps at once could both pass the check above. Count again now that
    // this grant is written; if it went over, take it back.
    if (await freeUsed(supabase, args.libraryId, email) > args.allowance) {
        await supabase.from('photo_entitlements').delete().eq('order_id', order.id);
        await supabase.from('photo_orders').update({ payment_status: 'failed' }).eq('id', order.id);
        return null;
    }
    return order.id;
}
