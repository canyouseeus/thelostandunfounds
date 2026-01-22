import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncGalleryPhotos } from '../../lib/api-handlers/_photo-sync-utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Check method
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug } = req.body;

        if (!slug) {
            return res.status(400).json({ error: 'Library slug is required' });
        }

        console.log(`[Sync Library] Starting sync for slug: ${slug}`);

        // Call the sync utility
        // Using a reasonable limit (e.g. 100) for the immediate UI feedback loop
        // The background cron will pick up the rest later
        const result = await syncGalleryPhotos(slug, 100);

        return res.status(200).json({
            success: true,
            synced: result.synced,
            deleted: result.deleted,
            message: `Sync complete. Processed ${result.synced} items.`
        });

    } catch (err: any) {
        console.error('[Sync Library] Error:', err);
        return res.status(500).json({
            error: err.message || 'Failed to sync library',
            details: err.stack
        });
    }
}
