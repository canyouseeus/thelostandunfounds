/**
 * Serverless retrograde rename — renames existing Drive files to the @tlau
 * naming convention, updates Supabase photos (title + latitude/longitude +
 * location_name). Safe to invoke repeatedly; resumable because each call
 * filters out photos whose title is already in claptrop format.
 *
 * Requires OAuth2 Drive credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
 * GOOGLE_REFRESH_TOKEN) — the service account used for read-only sync does
 * not have write access to rename files.
 */
import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import { buildName, isCurrentName, normalizeText, resetSeqs } from '../../scripts/claptrop-namer.js';

export interface RetrogradeOptions {
    librarySlug?: string;
    dryRun?: boolean;
    /** Max wall-clock seconds for this invocation (soft budget). Defaults to 270s. */
    timeBudgetSeconds?: number;
    /** Max photos to process this invocation. Defaults to unbounded (time budget stops it). */
    maxPhotos?: number;
}

export interface RetrogradeResult {
    renamed: number;
    skipped: number;
    /** Files Drive permanently refuses to let us rename. Excluded from future runs. */
    blocked: number;
    failed: number;
    remaining: number;
    dryRun: boolean;
    librariesProcessed: string[];
    /**
     * Sample of the renames a dry run would perform. The dry run used to
     * compute each new name and discard it, so it could report "418 files
     * would change" without showing a single one — which is not a preview
     * anyone can approve. Capped so a large library can't return megabytes.
     */
    preview: Array<{ from: string; to: string }>;
    /** Libraries refused because photographer_handle is NULL. */
    skippedUnattributed: string[];
    /**
     * Set when the run stopped because Drive rejected the credentials. The
     * counts alone cannot express this — "everything failed" and "the run was
     * never authorised" look identical from the outside.
     */
    authError?: string;
}

export const PREVIEW_LIMIT = 25;

/**
 * Thrown when Drive rejects the credentials themselves. Not a per-file
 * condition: retrying the next file cannot help, and doing so turns one bad
 * secret into hundreds of identical failures with no stated cause. A run that
 * hit this reported "FAILED 418" and nothing else — the reason was only
 * visible in the platform logs.
 */
export class DriveAuthError extends Error {
    constructor(public readonly reason: string) {
        super(`Google rejected the credentials (${reason}). Check GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN — invalid_client means the three do not form a valid set, usually a rotated secret or a refresh token issued by a different OAuth client.`);
        this.name = 'DriveAuthError';
    }
}

const AUTH_FAILURES = ['invalid_client', 'invalid_grant', 'unauthorized_client', 'invalid_token'];

/**
 * `blocked` means Drive will never accept this write — the file is gone or the
 * account has read-only access to it. Retrying it is not "retry-safe", it is an
 * infinite loop: the file stays outside the current naming scheme, so it comes
 * back in the next run's work set forever. `transient` is the genuinely
 * retryable case.
 */
type RenameOutcome = 'ok' | 'blocked' | 'transient';

async function renameInDrive(drive: ReturnType<typeof google.drive>, fileId: string, newName: string): Promise<RenameOutcome> {
    try {
        await drive.files.update({ fileId, requestBody: { name: newName } });
        return 'ok';
    } catch (err: any) {
        const msg = String(err?.message || '');
        const authReason = AUTH_FAILURES.find(a => msg.includes(a));
        if (authReason || err?.code === 401) {
            // Log before throwing. Converting these to an exception removed the
            // per-file console.error that used to make the failure visible, so
            // a run could come back 0/418/0 with nothing in the platform logs
            // and nothing on screen for anyone on a cached bundle.
            console.error(`[retrograde] auth failure (${authReason || err?.code}) renaming ${fileId} — aborting run`);
            throw new DriveAuthError(authReason || 'unauthorized');
        }
        const code = err?.code || err?.response?.status;
        const reason = err?.errors?.[0]?.reason;
        if (code === 403 || code === 404) {
            console.warn(`[retrograde] no write access ${fileId}: ${reason || code}`);
            return 'blocked';
        }
        // Transient — let caller count as failed, retry-safe on next run
        console.error(`[retrograde] rename ${fileId} failed:`, err?.message);
        return 'transient';
    }
}

async function processLibrary(
    supabase: SupabaseClient,
    drive: ReturnType<typeof google.drive>,
    library: { id: string; slug: string; photographer_handle: string | null },
    stats: { renamed: number; skipped: number; blocked: number; failed: number; remaining: number },
    deadline: number,
    dryRun: boolean,
    hardPhotoCap: number | null,
    preview: Array<{ from: string; to: string }>,
): Promise<void> {
    resetSeqs();

    // Paged deliberately. An unbounded .select() is capped at 1000 rows by
    // PostgREST, and that cap is silent: the run saw only the first 1000 photos
    // in a library, renamed them, then reported "remaining=0 — nothing left to
    // do" while ~10,000 files sat untouched. last-night-noir stopping at exactly
    // 1000 renamed is what gave it away.
    const PAGE = 1000;
    const photos: any[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase
            .from('photos')
            .select('id, google_drive_file_id, title, metadata, created_at, latitude, longitude, location_name')
            .eq('library_id', library.id)
            .order('created_at', { ascending: true })
            .range(from, from + PAGE - 1);
        if (error) {
            console.error(`[retrograde] photo fetch failed for ${library.slug} at offset ${from}:`, error.message);
            return;
        }
        if (!page || page.length === 0) break;
        photos.push(...page);
        if (page.length < PAGE) break;
    }
    if (photos.length === 0) return;

    // Anything not already in the current SEO prefix gets renamed — that
    // includes both raw camera filenames and legacy `@tlau_` files that
    // pre-dated the brand+IG prefix.
    // A file Drive has already refused to let us write is not pending work. It
    // can never satisfy isCurrentName(), so without this it would be re-attempted
    // on every single run for the life of the cron.
    const toRename = (photos as any[]).filter(p =>
        !isCurrentName(p.title, library.photographer_handle ?? undefined)
        && !p.metadata?.rename_blocked
    );
    stats.blocked += (photos as any[]).filter(p => p.metadata?.rename_blocked).length;
    stats.remaining += toRename.length;
    if (toRename.length === 0) return;

    const existingNames = new Set(
        (photos as any[])
            .filter(p => isCurrentName(p.title, library.photographer_handle ?? undefined))
            .map(p => `${p.title}.jpg`.toLowerCase())
    );
    const librarySubject = normalizeText(library.slug.replace(/-/g, '_'));

    for (const photo of toRename) {
        if (Date.now() > deadline) return;
        if (hardPhotoCap !== null && stats.renamed >= hardPhotoCap) return;

        const meta = photo.metadata || {};
        const title = photo.title || photo.google_drive_file_id;
        const ext = title.includes('.') ? path.extname(title).toLowerCase() : '.jpg';

        let date: Date | undefined;
        const rawDate = meta.date_taken || meta.time || photo.created_at;
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) date = d;
        }

        const lat = meta.location?.latitude ?? photo.latitude ?? null;
        const lon = meta.location?.longitude ?? photo.longitude ?? null;

        let nameMeta, log;
        try {
            const built = await buildName({
                originalName: `${title}${title.includes('.') ? '' : ext}`,
                date,
                lat,
                lon,
                subject: librarySubject,
                existingNames,
                handle: library.photographer_handle ?? undefined,
            });
            nameMeta = built.meta;
            log = built.log;
        } catch (err: any) {
            console.error(`[retrograde] buildName failed for ${photo.id}:`, err?.message);
            stats.failed++;
            continue;
        }

        const newTitle = nameMeta.stem;
        const newFilename = nameMeta.filename;

        if (dryRun) {
            if (preview.length < PREVIEW_LIMIT) {
                preview.push({ from: photo.title, to: newTitle });
            }
            stats.skipped++;
            stats.remaining--;
            continue;
        }

        const outcome = await renameInDrive(drive, photo.google_drive_file_id, newFilename);
        if (outcome === 'blocked') {
            // Persist the refusal so this file leaves the work set permanently.
            // Stored on metadata rather than a new column so this needs no
            // migration, and stays visible to anyone inspecting the row.
            const { error: markErr } = await supabase
                .from('photos')
                .update({ metadata: { ...meta, rename_blocked: 'drive_no_write_access' } })
                .eq('id', photo.id);
            if (markErr) {
                console.error(`[retrograde] could not mark ${photo.id} blocked:`, markErr.message);
            }
            stats.blocked++;
            stats.remaining--;
            continue;
        }
        if (outcome === 'transient') {
            stats.failed++;
            continue;
        }

        const update: Record<string, any> = {
            title: newTitle,
            location_name: nameMeta.location,
        };
        if (lat !== null && photo.latitude == null) update.latitude = lat;
        if (lon !== null && photo.longitude == null) update.longitude = lon;

        const { error: updateErr } = await supabase
            .from('photos')
            .update(update)
            .eq('id', photo.id);
        if (updateErr) {
            console.error(`[retrograde] supabase update failed for ${photo.id}:`, updateErr.message);
            stats.failed++;
            continue;
        }

        stats.renamed++;
        stats.remaining--;
        // brief pause to stay well under Drive rate limits
        await new Promise(r => setTimeout(r, 150));
    }
}

export async function retrogradeRename(opts: RetrogradeOptions = {}): Promise<RetrogradeResult> {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase credentials');
    }
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        throw new Error('Missing Google OAuth2 credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN). Retrograde rename needs write access and cannot use the service account.');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let q = supabase.from('photo_libraries').select('id, slug, photographer_handle').order('name');
    if (opts.librarySlug) q = q.eq('slug', opts.librarySlug) as typeof q;
    const { data: libraries, error } = await q;
    if (error || !libraries) throw new Error(`Failed to load libraries: ${error?.message}`);

    const deadline = Date.now() + ((opts.timeBudgetSeconds ?? 270) * 1000);
    const stats = { renamed: 0, skipped: 0, blocked: 0, failed: 0, remaining: 0 };
    const librariesProcessed: string[] = [];
    const preview: Array<{ from: string; to: string }> = [];
    const skippedUnattributed: string[] = [];

    for (const lib of libraries as Array<{ id: string; slug: string; photographer_handle: string | null }>) {
        if (Date.now() > deadline) break;
        if (opts.maxPhotos && stats.renamed >= opts.maxPhotos) break;

        // The handle in a filename is a photographer credit, and the filename
        // becomes the alt text search engines read. A library whose
        // photographer is unknown must not be renamed: defaulting to the
        // owner's handle would credit them for someone else's work. Set
        // photo_libraries.photographer_handle first.
        if (!lib.photographer_handle) {
            skippedUnattributed.push(lib.slug);
            continue;
        }
        librariesProcessed.push(lib.slug);
        try {
            await processLibrary(
            supabase,
            drive,
            lib,
            stats,
            deadline,
            opts.dryRun ?? false,
                opts.maxPhotos ?? null,
                preview,
            );
        } catch (err) {
            // One bad credential set is the whole run's problem, not this
            // library's. Stop and report it rather than failing every
            // remaining file the same way.
            if (err instanceof DriveAuthError) {
                console.error(`[retrograde] run aborted: ${err.message}`);
                return {
                    renamed: stats.renamed, skipped: stats.skipped, blocked: stats.blocked, failed: stats.failed,
                    remaining: stats.remaining, dryRun: opts.dryRun ?? false,
                    librariesProcessed, preview, skippedUnattributed,
                    authError: err.message,
                };
            }
            throw err;
        }
    }

    return {
        renamed: stats.renamed,
        skipped: stats.skipped,
        blocked: stats.blocked,
        failed: stats.failed,
        remaining: stats.remaining,
        dryRun: opts.dryRun ?? false,
        librariesProcessed,
        preview,
        skippedUnattributed,
    };
}
