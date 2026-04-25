/**
 * Serverless retrograde rename — renames existing Drive files to the @tlau
 * naming convention, updates Supabase photos (title + latitude/longitude +
 * location_name). Safe to invoke repeatedly; resumable because each call
 * filters out photos whose title already starts with `@tlau_`.
 *
 * Requires OAuth2 Drive credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
 * GOOGLE_REFRESH_TOKEN) — the service account used for read-only sync does
 * not have write access to rename files.
 */
import { google } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import { buildName, normalizeText, resetSeqs } from '../../scripts/claptrop-namer';

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
    failed: number;
    remaining: number;
    dryRun: boolean;
    librariesProcessed: string[];
}

async function renameInDrive(drive: ReturnType<typeof google.drive>, fileId: string, newName: string): Promise<boolean> {
    try {
        await drive.files.update({ fileId, requestBody: { name: newName } });
        return true;
    } catch (err: any) {
        const code = err?.code || err?.response?.status;
        const reason = err?.errors?.[0]?.reason;
        if (code === 403 || code === 404) {
            console.warn(`[retrograde] no write access ${fileId}: ${reason || code}`);
            return false;
        }
        // Transient — let caller count as failed, retry-safe on next run
        console.error(`[retrograde] rename ${fileId} failed:`, err?.message);
        return false;
    }
}

async function processLibrary(
    supabase: SupabaseClient,
    drive: ReturnType<typeof google.drive>,
    library: { id: string; slug: string },
    stats: { renamed: number; skipped: number; failed: number; remaining: number },
    deadline: number,
    dryRun: boolean,
    hardPhotoCap: number | null,
): Promise<void> {
    resetSeqs();

    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, google_drive_file_id, title, metadata, created_at, latitude, longitude, location_name')
        .eq('library_id', library.id)
        .order('created_at', { ascending: true });
    if (error || !photos) return;

    const toRename = (photos as any[]).filter(p => !p.title?.startsWith('@tlau_'));
    stats.remaining += toRename.length;
    if (toRename.length === 0) return;

    const existingNames = new Set(
        (photos as any[])
            .filter(p => p.title?.startsWith('@tlau_'))
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
            stats.skipped++;
            stats.remaining--;
            continue;
        }

        const driveOk = await renameInDrive(drive, photo.google_drive_file_id, newFilename);
        if (!driveOk) {
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

    let q = supabase.from('photo_libraries').select('id, slug').order('name');
    if (opts.librarySlug) q = q.eq('slug', opts.librarySlug) as typeof q;
    const { data: libraries, error } = await q;
    if (error || !libraries) throw new Error(`Failed to load libraries: ${error?.message}`);

    const deadline = Date.now() + ((opts.timeBudgetSeconds ?? 270) * 1000);
    const stats = { renamed: 0, skipped: 0, failed: 0, remaining: 0 };
    const librariesProcessed: string[] = [];

    for (const lib of libraries as Array<{ id: string; slug: string }>) {
        if (Date.now() > deadline) break;
        if (opts.maxPhotos && stats.renamed >= opts.maxPhotos) break;
        librariesProcessed.push(lib.slug);
        await processLibrary(
            supabase,
            drive,
            lib,
            stats,
            deadline,
            opts.dryRun ?? false,
            opts.maxPhotos ?? null,
        );
    }

    return {
        renamed: stats.renamed,
        skipped: stats.skipped,
        failed: stats.failed,
        remaining: stats.remaining,
        dryRun: opts.dryRun ?? false,
        librariesProcessed,
    };
}
