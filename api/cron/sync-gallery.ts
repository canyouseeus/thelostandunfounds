import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
    listLibrarySubfolders,
    syncSingleSubfolder,
} from '../../lib/api-handlers/_photo-sync-utils.js';

const SUBFOLDER_TIME_BUDGET_SECONDS = 230;

// How long a library goes between Google Drive folder listings. Discovery is the
// expensive half of this job (one Drive round-trip per library), and it only finds
// something when a folder was added, so it does not belong on the drain cadence.
const DISCOVERY_INTERVAL_MINUTES = 30;

// A row left in 'syncing' past this is assumed to be from an invocation that died
// mid-flight — Vercel killed it, the process crashed, or a deploy cut it off. Without
// this, such a row is invisible to the claim query and never syncs again.
const STALE_SYNCING_MINUTES = 30;

const ACTIONABLE_STATUSES = ['pending', 'error', 'syncing'];

/**
 * Terminal, deliberately absent from ACTIONABLE_STATUSES and from the claim
 * query: a halted row is one the cron has proven it cannot finish, so it must
 * not be picked up again until a human has looked at it. Parking it as 'error'
 * would not do — errors are retried, which is what made the runaway loop
 * self-sustaining.
 */
const HALTED_STATUS = 'halted';

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

function minutesAgo(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
}

type LibraryRow = {
    slug: string;
    google_drive_folder_id: string | null;
    gdrive_folder_id: string | null;
    last_discovery_at: string | null;
};

/**
 * The next subfolder worth working on: anything pending or errored, plus anything
 * stuck in 'syncing' long enough that its invocation is certainly gone.
 *
 * Ordered least-recently-attempted first. Alphabetical order starves the queue:
 * one row that fails every time keeps sorting to the front and is re-claimed on
 * every run, so nothing behind it is ever reached. Ordering by updated_at means a
 * failed row goes to the back — it still retries, but only after everything else
 * has had a turn.
 */
async function claimNextSubfolder(supabase: SupabaseClient, librarySlugs: string[]) {
    const staleCutoff = minutesAgo(STALE_SYNCING_MINUTES);
    const { data, error } = await supabase
        .from('sync_progress')
        .select('id, library_slug, subfolder_id, subfolder_name, status, photos_synced')
        .in('library_slug', librarySlugs)
        .or(`status.in.(pending,error),and(status.eq.syncing,updated_at.lt.${staleCutoff})`)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
}

async function countRemaining(supabase: SupabaseClient, librarySlugs: string[]) {
    const { count } = await supabase
        .from('sync_progress')
        .select('*', { count: 'exact', head: true })
        .in('library_slug', librarySlugs)
        .in('status', ACTIONABLE_STATUSES);
    return count ?? 0;
}

/**
 * List Drive subfolders for the given libraries and enqueue any that are new.
 * Only called for libraries whose discovery window has elapsed.
 */
async function runDiscovery(supabase: SupabaseClient, libraries: LibraryRow[]) {
    const report: Array<{ slug: string; error?: string; count: number }> = [];

    for (const library of libraries) {
        const slug = library.slug;
        try {
            const { subfolders, rootPhotoCount } = await listLibrarySubfolders(slug);
            report.push({ slug, count: subfolders.length });

            // Declared rather than inferred: the '__root__' sentinel pushed
            // below carries a null subfolder_name, which an inference from the
            // mapped rows alone types as string.
            type SyncProgressRow = {
                library_slug: string
                subfolder_id: string
                subfolder_name: string | null
            }
            const rows: SyncProgressRow[] = subfolders.map(s => ({
                library_slug: slug,
                subfolder_id: s.id,
                subfolder_name: s.name,
            }));

            // When photos live at the root with no subfolders, enqueue a sentinel
            // '__root__' row so they get picked up by the next sync tick.
            if (rootPhotoCount > 0) {
                rows.push({ library_slug: slug, subfolder_id: '__root__', subfolder_name: null });
            }

            if (rows.length > 0) {
                const { error: upsertErr } = await supabase
                    .from('sync_progress')
                    .upsert(rows, {
                        onConflict: 'library_slug,subfolder_id',
                        ignoreDuplicates: true,
                    });
                if (upsertErr) {
                    console.error(
                        `[cron sync-gallery] upsert pending failed for ${slug}:`,
                        upsertErr.message,
                    );
                }
            }

            // Stamp only on success, so a failed listing is retried next tick
            // instead of being suppressed for the whole discovery window.
            await supabase
                .from('photo_libraries')
                .update({ last_discovery_at: new Date().toISOString() })
                .eq('slug', slug);
        } catch (listErr: any) {
            const message = listErr?.message || String(listErr);
            console.error(`[cron sync-gallery] listing subfolders for ${slug} failed:`, message);
            report.push({ slug, error: message, count: 0 });
        }
    }

    return report;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const supabase = getSupabase();

        const { data: libraries, error: libErr } = await supabase
            .from('photo_libraries')
            .select('slug, google_drive_folder_id, gdrive_folder_id, last_discovery_at')
            .order('slug', { ascending: true });
        if (libErr) throw libErr;

        const syncable = ((libraries ?? []) as LibraryRow[]).filter(
            l => l.google_drive_folder_id || l.gdrive_folder_id,
        );
        const librarySlugs = syncable.map(l => l.slug);

        if (librarySlugs.length === 0) {
            return res.status(200).json({
                status: 'complete',
                message: 'No libraries with Drive folder IDs',
                total_count: 0,
                remaining_count: 0,
            });
        }

        // Drain before discovering. While there is a backlog, discovery cannot tell us
        // anything we are not already going to act on, so skip the Drive calls entirely.
        let next = await claimNextSubfolder(supabase, librarySlugs);
        let discovery: Array<{ slug: string; error?: string; count: number }> = [];

        if (!next) {
            const discoveryCutoff = minutesAgo(DISCOVERY_INTERVAL_MINUTES);
            const due = syncable.filter(
                l => !l.last_discovery_at || l.last_discovery_at < discoveryCutoff,
            );

            if (due.length === 0) {
                // Steady state: two reads, no Drive traffic, no writes.
                return res.status(200).json({
                    status: 'idle',
                    message: 'All subfolders synced; no library due for discovery',
                    libraries_due: 0,
                    remaining_count: 0,
                });
            }

            discovery = await runDiscovery(supabase, due);
            next = await claimNextSubfolder(supabase, librarySlugs);
        }

        if (!next) {
            return res.status(200).json({
                status: 'complete',
                message: 'All subfolders synced',
                remaining_count: 0,
                libraries: discovery,
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
            const isRootSync = next.subfolder_id === '__root__';
            const result = await syncSingleSubfolder({
                librarySlug: next.library_slug,
                subfolderId: isRootSync ? undefined : next.subfolder_id,
                subfolderName: isRootSync ? undefined : (next.subfolder_name ?? undefined),
                timeBudgetSeconds: SUBFOLDER_TIME_BUDGET_SECONDS,
            });

            const completedAt = new Date().toISOString();

            // Coverage, not writes. A pass that skipped every photo because
            // Drive changed nothing still walked the whole folder, and calling
            // that "0 synced" would read as a regression and, worse, look
            // identical to a pass that got nowhere.
            const processed = result.synced + (result.skipped ?? 0);
            const previous = next.photos_synced ?? 0;

            // A timed-out pass that reached no further than the last one is not
            // making progress, and running it again will not change that. This
            // is the condition that went unnoticed for eleven days while the job
            // restarted from the first photo every five minutes: it always timed
            // out, always at the same place, and 'pending' put it straight back
            // in the queue. Park it as 'error' so it stops and stays visible
            // instead of billing for a loop that can never finish.
            const stalled = result.timedOut && previous > 0 && processed <= previous;
            const finalStatus = !result.timedOut ? 'completed' : (stalled ? HALTED_STATUS : 'pending');

            if (stalled) {
                console.error(
                    `[cron sync-gallery] ${next.library_slug}/${next.subfolder_name ?? next.subfolder_id} ` +
                    `made no progress (${processed} <= ${previous}) and timed out again — parking as error`,
                );
            }

            await supabase
                .from('sync_progress')
                .update({
                    status: finalStatus,
                    photos_synced: processed,
                    error_message: stalled
                        ? `Halted: timed out after ${processed} photos without advancing past the previous pass (${previous}). `
                          + `Re-running as-is would loop. Investigate before setting this row back to pending.`
                        : null,
                    completed_at: result.timedOut ? null : completedAt,
                    updated_at: completedAt,
                })
                .eq('id', next.id);

            return res.status(200).json({
                status: finalStatus === 'completed' ? 'ok' : (stalled ? 'stalled' : 'timed_out'),
                subfolder_synced: {
                    library_slug: next.library_slug,
                    id: next.subfolder_id,
                    name: next.subfolder_name,
                    photos_synced: processed,
                    photos_written: result.synced,
                    photos_skipped: result.skipped ?? 0,
                    folders_visited: result.foldersVisited,
                    tags_created: result.tagsCreated,
                    timed_out: result.timedOut,
                    stalled,
                },
                remaining_count: await countRemaining(supabase, librarySlugs),
                libraries: discovery,
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
            console.error(
                `[cron sync-gallery] subfolder ${next.subfolder_name} (${next.library_slug}) failed:`,
                syncErr,
            );

            return res.status(200).json({
                status: 'error',
                subfolder_synced: {
                    library_slug: next.library_slug,
                    id: next.subfolder_id,
                    name: next.subfolder_name,
                    error: message,
                },
                remaining_count: await countRemaining(supabase, librarySlugs),
                libraries: discovery,
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
