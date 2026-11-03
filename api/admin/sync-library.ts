import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { syncGalleryPhotos } from '../../lib/api-handlers/_photo-sync-utils.js';
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js';

/**
 * Who may sync a gallery from its Drive folder: the admin, or the signed-in
 * user who owns that gallery (photo_libraries.owner_id). The onboarding
 * wizard (/setup) syncs a gallery its signed-in photographer just created,
 * so ownership covers it.
 *
 * This route had no check at all: anyone could start a five-minute Drive
 * walk for any slug, or probe which slugs exist. Both routes reach this
 * handler (this file, and the sync-library case in api/admin/[...path].ts,
 * which lists it as checking its own auth), so the check lives here.
 */
export const syncAuthDeps = {
    verifyAdmin: (req: VercelRequest) => verifyAdmin(req),
    async sessionUserId(token: string): Promise<string | null> {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return null;
        const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
        return error || !data?.user ? null : data.user.id;
    },
    async galleryOwner(slug: string): Promise<{ found: boolean; ownerId: string | null }> {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) throw new Error('Missing Supabase credentials');
        const { data, error } = await createClient(url, key)
            .from('photo_libraries')
            .select('owner_id')
            .eq('slug', slug)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return { found: Boolean(data), ownerId: data?.owner_id ?? null };
    },
    syncGalleryPhotos: (slug: string) => syncGalleryPhotos(slug),
};

/** 'ok' when the caller may sync this gallery, else the HTTP status to answer with. */
export async function authorizeSync(req: VercelRequest, slug: string): Promise<'ok' | 401 | 403> {
    if (await syncAuthDeps.verifyAdmin(req)) return 'ok';
    const header = (req.headers.authorization as string) || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return 401;
    const userId = await syncAuthDeps.sessionUserId(token);
    if (!userId) return 401;
    const { found, ownerId } = await syncAuthDeps.galleryOwner(slug);
    // Same answer for "not yours" and "no such gallery", so this can't be
    // used to find out which slugs exist.
    return found && ownerId === userId ? 'ok' : 403;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const slug = req.body && typeof req.body.slug === 'string' ? req.body.slug.trim() : '';
        if (!slug) {
            return res.status(400).json({ error: 'Library slug is required' });
        }

        const auth = await authorizeSync(req, slug);
        if (auth === 401) return res.status(401).json({ error: 'Unauthorized' });
        if (auth === 403) return res.status(403).json({ error: 'You can only sync your own galleries.' });

        console.log(`[Sync Library] Starting sync for slug: ${slug}`);
        const result = await syncAuthDeps.syncGalleryPhotos(slug);

        return res.status(200).json({
            success: true,
            synced: result.synced,
            deleted: result.deleted,
            message: `Sync complete. Processed ${result.synced} items.`
        });
    } catch (err: any) {
        console.error('[Sync Library] Error:', err);
        // No stack trace in the response: it leaked server paths to any caller.
        return res.status(500).json({ error: err.message || 'Failed to sync library' });
    }
}
