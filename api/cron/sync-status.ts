import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const LIBRARY_SLUG = 'main';

function isAuthorized(req: VercelRequest): boolean {
    if (process.env.NODE_ENV !== 'production') return true;
    const authHeader = req.headers['authorization'];
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

function getSupabase() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase credentials');
    return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const supabase = getSupabase();

        const { data: rows, error } = await supabase
            .from('sync_progress')
            .select('subfolder_id, subfolder_name, status, photos_synced, error_message, started_at, completed_at, updated_at')
            .eq('library_slug', LIBRARY_SLUG);
        if (error) throw error;

        const all = rows || [];
        const total = all.length;
        let completed = 0;
        let pending = 0;
        let syncing = 0;
        let errors = 0;
        let totalPhotos = 0;
        const erroredSubfolders: Array<{
            subfolder_id: string;
            subfolder_name: string | null;
            error_message: string | null;
            updated_at: string | null;
        }> = [];

        for (const row of all) {
            totalPhotos += row.photos_synced || 0;
            switch (row.status) {
                case 'completed':
                    completed++;
                    break;
                case 'pending':
                    pending++;
                    break;
                case 'syncing':
                    syncing++;
                    break;
                case 'error':
                    errors++;
                    erroredSubfolders.push({
                        subfolder_id: row.subfolder_id,
                        subfolder_name: row.subfolder_name,
                        error_message: row.error_message,
                        updated_at: row.updated_at,
                    });
                    break;
            }
        }

        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

        return res.status(200).json({
            library_slug: LIBRARY_SLUG,
            total,
            completed,
            pending,
            syncing,
            errors,
            total_photos_synced: totalPhotos,
            percentage,
            errored_subfolders: erroredSubfolders,
        });
    } catch (error: any) {
        console.error('[cron sync-status] fatal:', error);
        return res.status(500).json({
            error: 'Status fetch failed',
            details: error?.message || String(error),
        });
    }
}
