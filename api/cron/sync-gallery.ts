import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
    listLibrarySubfolders,
    syncSingleSubfolder,
} from '../../lib/api-handlers/_photo-sync-utils.js';

const LIBRARY_SLUG = 'main';
const SUBFOLDER_TIME_BUDGET_SECONDS = 230;

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

        const { subfolders } = await listLibrarySubfolders(LIBRARY_SLUG);

        if (subfolders.length > 0) {
            const rows = subfolders.map(s => ({
                library_slug: LIBRARY_SLUG,
                subfolder_id: s.id,
                subfolder_name: s.name,
            }));
            const { error: upsertErr } = await supabase
                .from('sync_progress')
                .upsert(rows, {
                    onConflict: 'library_slug,subfolder_id',
                    ignoreDuplicates: true,
                });
            if (upsertErr) {
                console.error('[cron sync-gallery] upsert pending failed:', upsertErr.message);
            }
        }

        const { count: totalCount } = await supabase
            .from('sync_progress')
            .select('*', { count: 'exact', head: true })
            .eq('library_slug', LIBRARY_SLUG);

        const { data: nextRows, error: nextErr } = await supabase
            .from('sync_progress')
            .select('id, subfolder_id, subfolder_name, status')
            .eq('library_slug', LIBRARY_SLUG)
            .in('status', ['pending', 'error'])
            .order('subfolder_name', { ascending: true, nullsFirst: false })
            .limit(1);
        if (nextErr) throw nextErr;

        const next = nextRows?.[0];

        if (!next) {
            return res.status(200).json({
                status: 'complete',
                message: 'All subfolders synced',
                total_count: totalCount ?? 0,
                remaining_count: 0,
            });
        }

        const startedAt = new Date().toISOString();
        await supabase
            .from('sync_progress')
            .update({
                status: 'syncing',
                started_at: startedAt,
                error_message: null,
                updated_at: startedAt,
            })
            .eq('id', next.id);

        try {
            const result = await syncSingleSubfolder({
                librarySlug: LIBRARY_SLUG,
                subfolderId: next.subfolder_id,
                subfolderName: next.subfolder_name ?? undefined,
                timeBudgetSeconds: SUBFOLDER_TIME_BUDGET_SECONDS,
            });

            const completedAt = new Date().toISOString();
            const finalStatus = result.timedOut ? 'pending' : 'completed';
            await supabase
                .from('sync_progress')
                .update({
                    status: finalStatus,
                    photos_synced: result.synced,
                    completed_at: result.timedOut ? null : completedAt,
                    updated_at: completedAt,
                })
                .eq('id', next.id);

            const { count: remainingCount } = await supabase
                .from('sync_progress')
                .select('*', { count: 'exact', head: true })
                .eq('library_slug', LIBRARY_SLUG)
                .in('status', ['pending', 'error', 'syncing']);

            return res.status(200).json({
                status: finalStatus === 'completed' ? 'ok' : 'timed_out',
                subfolder_synced: {
                    id: next.subfolder_id,
                    name: next.subfolder_name,
                    photos_synced: result.synced,
                    folders_visited: result.foldersVisited,
                    tags_created: result.tagsCreated,
                    timed_out: result.timedOut,
                },
                remaining_count: remainingCount ?? 0,
                total_count: totalCount ?? 0,
            });
        } catch (syncErr: any) {
            const completedAt = new Date().toISOString();
            const message = syncErr?.message || String(syncErr);
            await supabase
                .from('sync_progress')
                .update({
                    status: 'error',
                    error_message: message.slice(0, 1000),
                    completed_at: completedAt,
                    updated_at: completedAt,
                })
                .eq('id', next.id);
            console.error(`[cron sync-gallery] subfolder ${next.subfolder_name} failed:`, syncErr);

            const { count: remainingCount } = await supabase
                .from('sync_progress')
                .select('*', { count: 'exact', head: true })
                .eq('library_slug', LIBRARY_SLUG)
                .in('status', ['pending', 'error', 'syncing']);

            return res.status(200).json({
                status: 'error',
                subfolder_synced: {
                    id: next.subfolder_id,
                    name: next.subfolder_name,
                    error: message,
                },
                remaining_count: remainingCount ?? 0,
                total_count: totalCount ?? 0,
            });
        }
    } catch (error: any) {
        console.error('[cron sync-gallery] fatal:', error);
        return res.status(500).json({
            error: 'Sync failed',
            details: error?.message || String(error),
        });
    }
}
