/**
 * What /api/gallery/stream may hand out for one photo, to whoever is asking.
 *
 *   download  — the full-resolution file
 *   personal  — the response depends on the asker: never put it in the shared
 *               CDN cache (Cache-Control: private)
 *
 * Previews are not altered here: the gallery page already covers every photo
 * a viewer hasn't unlocked with the brand watermark overlay (PhotoGallery /
 * PhotoLightbox, "Brand overlay (preview protection)").
 *
 * Proof the asker can bring (an <img>/download link carries no session):
 *   gp — a gallery pass (_gallery-pass.ts): album owner, or à la carte buyer
 *   et — a photo_entitlements.token from a paid order (the download portal)
 *
 * Rules (owner, 2026-11-02):
 *   - Private gallery: full files only for album owners, a buyer who bought
 *     that photo, or a valid order token. Everyone else gets 403.
 *   - Public galleries: unchanged here (their gating is a separate change).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyPass } from './_gallery-pass.js';

export interface StreamAccess {
    download: boolean;
    personal: boolean;
}

export async function streamAccess(
    supabase: SupabaseClient,
    input: { photoId: string | null; libraryId: string | null; gp?: unknown; et?: unknown },
    now = Date.now(),
): Promise<StreamAccess> {
    // A file with no photo row (Drive-only listing) has nothing to check against.
    if (!input.photoId || !input.libraryId) return { download: true, personal: false };

    const { data: library } = await supabase
        .from('photo_libraries')
        .select('id, is_private')
        .eq('id', input.libraryId)
        .maybeSingle();
    if (!library) return { download: false, personal: true };

    const pass = verifyPass(input.gp, library.id, now);

    let tokenValid = false;
    if (typeof input.et === 'string' && input.et.length >= 8 && input.et.length <= 200) {
        const { data: ent } = await supabase
            .from('photo_entitlements')
            .select('id, expires_at')
            .eq('token', input.et)
            .eq('photo_id', input.photoId)
            .maybeSingle();
        tokenValid = !!ent && (!ent.expires_at || new Date(ent.expires_at).getTime() > now);
    }

    let bought = false;
    if (pass?.role === 'buyer') {
        const { data: ents } = await supabase
            .from('photo_entitlements')
            .select('id, photo_orders!inner(email)')
            .eq('photo_id', input.photoId)
            .limit(50);
        bought = (ents || []).some((e: any) => {
            const order = Array.isArray(e.photo_orders) ? e.photo_orders[0] : e.photo_orders;
            return String(order?.email || '').trim().toLowerCase() === pass.email;
        });
    }

    const owner = pass?.role === 'owner';
    const clean = owner || bought || tokenValid;
    return {
        download: !library.is_private || clean,
        personal: !!library.is_private || !!pass || tokenValid,
    };
}
