import { google, drive_v3 } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
    findVenueForFolder,
    haversineMeters,
    medianGps,
    VenueTag,
} from './_venue-match.js';
import { reverseGeocodeNeighborhood } from './_reverse-geocode.js';

const MAX_DEPTH = 3;
const SAMPLE_SIZE = 5;
const DRIVE_PAGE_SIZE = 1000;
const DEFAULT_TIME_BUDGET_SECONDS = 250;
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

type DriveFile = drive_v3.Schema$File;

interface SyncStats {
    synced: number;
    foldersVisited: number;
    tagsCreated: number;
}

interface SyncCtx {
    drive: drive_v3.Drive;
    supabase: SupabaseClient;
    library: { id: string };
    tagCache: Map<string, { id: string; type: string; metadata: any }>;
    venues: VenueTag[];
    stats: SyncStats;
    seenFileIds: Set<string>;
    limit: number;
    deadline: number;
    timedOut: boolean;
}

function generateSlug(name: string, type: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .trim();
    return `${type}-${base}`;
}

async function driveCallWithRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 6): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const status = err?.response?.status ?? err?.code;
            const reason = err?.errors?.[0]?.reason || err?.response?.data?.error?.errors?.[0]?.reason;
            const isRate = status === 429 ||
                (status === 403 && (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded'));
            const isTransient = status >= 500 && status < 600;
            if ((!isRate && !isTransient) || attempt === maxAttempts) throw err;

            const retryAfter = Number(err?.response?.headers?.['retry-after']);
            const wait = !isNaN(retryAfter) && retryAfter > 0
                ? retryAfter * 1000
                : Math.min(1000 * 2 ** (attempt - 1), 30000);
            console.log(`[Drive] ${label} throttled (status=${status}, reason=${reason}), retry in ${wait}ms [${attempt}/${maxAttempts}]`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
    throw new Error(`Drive retry exhausted: ${label}`);
}

async function listFolderEntries(
    drive: drive_v3.Drive,
    folderId: string,
): Promise<{ photos: DriveFile[]; subfolders: DriveFile[] }> {
    const photos: DriveFile[] = [];
    const subfolders: DriveFile[] = [];
    let pageToken: string | undefined = undefined;

    do {
        const res: { data: drive_v3.Schema$FileList } = await driveCallWithRetry(
            () => drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, createdTime, imageMediaMetadata)',
                pageSize: DRIVE_PAGE_SIZE,
                pageToken,
            }),
            `list ${folderId}`,
        );
        for (const f of (res.data.files || [])) {
            if (f.mimeType === 'application/vnd.google-apps.folder') {
                if (f.id) subfolders.push(f);
            } else if (f.mimeType?.startsWith('image/') || f.mimeType === 'video/quicktime') {
                if (f.id) photos.push(f);
            }
        }
        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return { photos, subfolders };
}

async function loadTagCache(supabase: SupabaseClient): Promise<Map<string, { id: string; type: string; metadata: any }>> {
    const cache = new Map<string, { id: string; type: string; metadata: any }>();
    let from = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await supabase
            .from('tags')
            .select('id, slug, type, metadata')
            .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const t of data) {
            if (t.slug) cache.set(t.slug, { id: t.id, type: t.type, metadata: t.metadata });
        }
        if (data.length < pageSize) break;
        from += pageSize;
    }
    return cache;
}

async function ensureTag(
    ctx: SyncCtx,
    name: string,
    type: string,
    metadata?: Record<string, unknown>,
): Promise<string | null> {
    if (!name || !name.trim()) return null;
    const slug = generateSlug(name, type);
    if (!slug.replace(`${type}-`, '')) return null;
    const cached = ctx.tagCache.get(slug);
    if (cached) return cached.id;

    const { data, error } = await ctx.supabase
        .from('tags')
        .insert({ name: name.trim(), type, slug, metadata: metadata ?? null })
        .select('id')
        .single();
    if (error) {
        // Race: another process may have inserted it
        const { data: existing } = await ctx.supabase
            .from('tags')
            .select('id, metadata')
            .eq('slug', slug)
            .maybeSingle();
        if (existing) {
            ctx.tagCache.set(slug, { id: existing.id, type, metadata: existing.metadata });
            return existing.id;
        }
        console.error(`[sync] ensureTag failed for "${name}" (${type}):`, error);
        return null;
    }
    ctx.stats.tagsCreated++;
    ctx.tagCache.set(slug, { id: data.id, type, metadata: metadata ?? null });
    return data.id;
}

function parsePhotoFields(file: DriveFile) {
    let metadata: any = { ...(file.imageMediaMetadata || {}) };
    let finalCreatedAt = file.createdTime || new Date().toISOString();

    if (metadata.cameraMake) metadata.camera_make = metadata.cameraMake;
    if (metadata.cameraModel) metadata.camera_model = metadata.cameraModel;
    if (metadata.focalLength) metadata.focal_length = metadata.focalLength;
    if (metadata.isoSpeed) metadata.iso = metadata.isoSpeed;
    if (metadata.exposureTime) metadata.shutter_speed = metadata.exposureTime;

    const gpsLocation = metadata.location;
    const latitude: number | null = gpsLocation?.latitude ?? null;
    const longitude: number | null = gpsLocation?.longitude ?? null;

    const captureTimeStr = metadata.time;
    if (captureTimeStr) {
        let captureDate: Date | null = null;
        const stdParse = new Date(captureTimeStr);
        if (!isNaN(stdParse.getTime())) {
            captureDate = stdParse;
        } else {
            const parts = captureTimeStr.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (parts) {
                captureDate = new Date(Date.UTC(
                    parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]),
                    parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]),
                ));
                if (isNaN(captureDate.getTime())) {
                    captureDate = new Date(
                        parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]),
                        parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]),
                    );
                }
            }
        }
        if (captureDate && !isNaN(captureDate.getTime())) {
            const uploadDate = new Date(finalCreatedAt);
            if (captureDate.getFullYear() === 2025 && uploadDate.getFullYear() === 2026) {
                captureDate.setFullYear(2026);
                metadata._corrected = true;
            }
            metadata.time = captureDate.toISOString();
            metadata.date_taken = captureDate.toISOString();
            finalCreatedAt = captureDate.toISOString();
        }
    }

    if (!metadata.date_taken) {
        metadata.date_taken = file.createdTime || new Date().toISOString();
    }

    return { metadata, finalCreatedAt, latitude, longitude };
}

async function upsertPhoto(
    ctx: SyncCtx,
    file: DriveFile,
    folderInfo?: { folderName?: string | null; venue?: VenueTag | null },
): Promise<string | null> {
    if (!file.id || !file.name) return null;
    const title = file.name.split('.').slice(0, -1).join('.');
    const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');
    const { metadata, finalCreatedAt, latitude, longitude } = parsePhotoFields(file);

    const venue = folderInfo?.venue ?? null;
    const folderName = folderInfo?.folderName ?? null;

    const payload: Record<string, unknown> = {
        library_id: ctx.library.id,
        google_drive_file_id: file.id,
        title,
        thumbnail_url: thumbnailUrl,
        status: 'active',
        mime_type: file.mimeType,
        created_at: finalCreatedAt,
        metadata,
    };
    // Venue folder is the primary source of truth: override EXIF GPS with the
    // venue's canonical coords and use the venue name as the location label.
    // Otherwise, fall back to EXIF GPS and the literal folder name.
    if (venue) {
        payload.latitude = venue.metadata.latitude;
        payload.longitude = venue.metadata.longitude;
        payload.location_name = venue.name;
    } else {
        if (latitude != null) payload.latitude = latitude;
        if (longitude != null) payload.longitude = longitude;
        if (folderName) payload.location_name = folderName;
    }

    const { data, error } = await ctx.supabase
        .from('photos')
        .upsert(payload, { onConflict: 'google_drive_file_id' })
        .select('id')
        .single();

    if (error) {
        console.error(`[sync] upsert photo ${file.id} failed:`, error.message);
        return null;
    }
    return data.id;
}

function parseLocationFromClaptropTitle(title: string | null | undefined): string | null {
    if (!title) return null;
    // @tlau_YYYY-MM-DD_{location}_{subject}_{###}
    const m = title.match(/^@tlau_\d{4}-\d{2}-\d{2}_([a-z0-9_]+?)_[a-z0-9_]+_\d{3}$/);
    if (!m) return null;
    const raw = m[1].replace(/_/g, ' ').trim();
    if (!raw) return null;
    // Title-case for display
    return raw.split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

async function applyPhotoLevelVenueTags(
    ctx: SyncCtx,
    photoId: string,
    latitude: number | null,
    longitude: number | null,
): Promise<string[]> {
    if (latitude == null || longitude == null) return [];
    const hits: string[] = [];
    for (const v of ctx.venues) {
        const dist = haversineMeters(latitude, longitude, v.metadata.latitude, v.metadata.longitude);
        const radius = v.metadata.radius_meters || 300;
        if (dist <= radius) hits.push(v.id);
    }
    return hits;
}

async function writePhotoTags(ctx: SyncCtx, photoId: string, tagIds: Set<string>): Promise<void> {
    if (tagIds.size === 0) return;
    const rows = [...tagIds].map(tagId => ({ photo_id: photoId, tag_id: tagId }));
    const { error } = await ctx.supabase
        .from('photo_tags')
        .upsert(rows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });
    if (error) console.error(`[sync] photo_tags upsert failed for photo ${photoId}:`, error.message);
}

async function determineFolderTag(
    ctx: SyncCtx,
    folderName: string,
    photos: DriveFile[],
): Promise<{ tagId: string | null; venue: VenueTag | null }> {
    const samples = photos
        .slice(0, SAMPLE_SIZE)
        .map(p => p.imageMediaMetadata?.location)
        .filter((l): l is { latitude: number; longitude: number } =>
            !!l && typeof l.latitude === 'number' && typeof l.longitude === 'number')
        .map(l => ({ latitude: l.latitude, longitude: l.longitude }));

    const mid = medianGps(samples);

    const venue = findVenueForFolder(folderName, mid, ctx.venues);
    if (venue) return { tagId: venue.id, venue };

    if (mid) {
        const neighborhood = await reverseGeocodeNeighborhood(mid.latitude, mid.longitude);
        if (neighborhood) {
            const tagId = await ensureTag(ctx, neighborhood, 'location', {
                latitude: mid.latitude,
                longitude: mid.longitude,
            });
            return { tagId, venue: null };
        }
    }
    return { tagId: null, venue: null };
}

async function processFolder(
    ctx: SyncCtx,
    folderId: string,
    folderName: string | null,
    depth: number,
): Promise<void> {
    if (ctx.stats.synced >= ctx.limit) return;
    if (Date.now() > ctx.deadline) {
        ctx.timedOut = true;
        return;
    }
    ctx.stats.foldersVisited++;

    const { photos, subfolders } = await listFolderEntries(ctx.drive, folderId);

    let collectionTagId: string | null = null;
    let folderVenueOrLocationTagId: string | null = null;
    let folderVenue: VenueTag | null = null;
    if (depth > 0 && folderName && photos.length > 0) {
        // Subfolder name itself is always tagged on the photos as a 'collection'.
        collectionTagId = await ensureTag(ctx, folderName, 'collection');
        // Best-effort: also try to derive a venue/neighborhood from the folder.
        try {
            const result = await determineFolderTag(ctx, folderName, photos);
            folderVenueOrLocationTagId = result.tagId;
            folderVenue = result.venue;
        } catch (err: any) {
            console.warn(`[sync] determineFolderTag failed for ${folderName}:`, err?.message);
            folderVenueOrLocationTagId = null;
            folderVenue = null;
        }
    }

    for (const file of photos) {
        if (ctx.stats.synced >= ctx.limit) return;
        if (Date.now() > ctx.deadline) { ctx.timedOut = true; return; }
        if (!file.id) continue;
        ctx.seenFileIds.add(file.id);

        const photoId = await upsertPhoto(ctx, file, {
            folderName: depth > 0 ? folderName : null,
            venue: folderVenue,
        });
        if (!photoId) continue;

        const tagIds = new Set<string>();
        if (collectionTagId) tagIds.add(collectionTagId);
        if (folderVenueOrLocationTagId) tagIds.add(folderVenueOrLocationTagId);

        const { metadata, latitude, longitude } = parsePhotoFields(file);
        const dateStr = metadata.date_taken || file.createdTime;
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const year = d.getUTCFullYear().toString();
                const month = MONTH_NAMES[d.getUTCMonth()];
                const yearMonth = `${month} ${year}`;
                const y = await ensureTag(ctx, year, 'collection');
                const m = await ensureTag(ctx, month, 'collection');
                const ym = await ensureTag(ctx, yearMonth, 'collection');
                if (y) tagIds.add(y);
                if (m) tagIds.add(m);
                if (ym) tagIds.add(ym);
            }
        }

        const perPhotoVenues = await applyPhotoLevelVenueTags(ctx, photoId, latitude, longitude);
        for (const id of perPhotoVenues) tagIds.add(id);

        // Fallback: if photo has no EXIF GPS and no folder-level venue/location tag,
        // parse an @tlau_ filename for its encoded city (e.g. "austin").
        if (!folderVenueOrLocationTagId && (latitude == null || longitude == null) && file.name) {
            const fileStem = file.name.split('.').slice(0, -1).join('.');
            const filenameLocation = parseLocationFromClaptropTitle(fileStem);
            if (filenameLocation) {
                const tagId = await ensureTag(ctx, filenameLocation, 'location');
                if (tagId) tagIds.add(tagId);
            }
        }

        await writePhotoTags(ctx, photoId, tagIds);
        ctx.stats.synced++;
    }

    if (depth < MAX_DEPTH) {
        for (const sub of subfolders) {
            if (ctx.stats.synced >= ctx.limit) break;
            if (Date.now() > ctx.deadline) { ctx.timedOut = true; break; }
            await processFolder(ctx, sub.id!, sub.name || null, depth + 1);
        }
    }
}

interface ResolvedCreds {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    GOOGLE_EMAIL: string;
    GOOGLE_KEY: string;
}

function resolveCreds(): ResolvedCreds {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    const GOOGLE_KEY = (rawKey || '')
        .replace(/\\n/g, '\n')
        .replace(/"/g, '')
        .trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
        throw new Error(`Missing credentials for sync. Email: ${!!GOOGLE_EMAIL}, Key: ${!!GOOGLE_KEY}`);
    }
    return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_EMAIL, GOOGLE_KEY };
}

async function buildCtx(
    librarySlug: string,
    limit: number,
    timeBudgetSeconds: number,
): Promise<{ ctx: SyncCtx; folderId: string }> {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_EMAIL, GOOGLE_KEY } = resolveCreds();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('*')
        .eq('slug', librarySlug)
        .single();
    if (libError || !library) throw new Error(`Library not found: ${librarySlug}`);

    const folderId = library.google_drive_folder_id || library.gdrive_folder_id;
    if (!folderId) throw new Error(`Library ${librarySlug} has no google_drive_folder_id`);

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: GOOGLE_EMAIL, private_key: GOOGLE_KEY },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const { data: venueTagsRaw } = await supabase
        .from('tags')
        .select('id, name, metadata')
        .eq('type', 'venue');
    const venues: VenueTag[] = (venueTagsRaw || [])
        .filter(t => t.metadata?.latitude != null && t.metadata?.longitude != null)
        .map(t => ({ id: t.id, name: t.name, metadata: t.metadata }));

    const tagCache = await loadTagCache(supabase);

    const ctx: SyncCtx = {
        drive,
        supabase,
        library,
        tagCache,
        venues,
        stats: { synced: 0, foldersVisited: 0, tagsCreated: 0 },
        seenFileIds: new Set<string>(),
        limit: limit > 0 ? limit : Number.MAX_SAFE_INTEGER,
        deadline: Date.now() + timeBudgetSeconds * 1000,
        timedOut: false,
    };
    return { ctx, folderId };
}

export interface SubfolderEntry {
    id: string;
    name: string;
}

/**
 * List the immediate subfolders of a library's root Drive folder, plus any
 * photos at the root. Used to plan a batched sync where each subfolder is
 * synced in its own request.
 */
export async function listLibrarySubfolders(librarySlug: string): Promise<{
    libraryId: string;
    libraryName: string;
    rootFolderId: string;
    subfolders: SubfolderEntry[];
    rootPhotoCount: number;
}> {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_EMAIL, GOOGLE_KEY } = resolveCreds();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('id, name, slug, google_drive_folder_id, gdrive_folder_id')
        .eq('slug', librarySlug)
        .single();
    if (libError || !library) throw new Error(`Library not found: ${librarySlug}`);

    const folderId = library.google_drive_folder_id || library.gdrive_folder_id;
    if (!folderId) throw new Error(`Library ${librarySlug} has no google_drive_folder_id`);

    const auth = new google.auth.GoogleAuth({
        credentials: { client_email: GOOGLE_EMAIL, private_key: GOOGLE_KEY },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const { photos, subfolders } = await listFolderEntries(drive, folderId);

    return {
        libraryId: library.id,
        libraryName: library.name,
        rootFolderId: folderId,
        subfolders: subfolders
            .filter(s => s.id && s.name)
            .map(s => ({ id: s.id!, name: s.name! })),
        rootPhotoCount: photos.length,
    };
}

/**
 * Sync a single subfolder of a library (or the library's root if no subfolderId
 * is provided). Each invocation is bounded by `timeBudgetSeconds`. Returns
 * `timedOut: true` if the budget ran out before the folder was fully processed
 * — caller can re-invoke to resume (the upserts are idempotent).
 *
 * No orphaned-photo cleanup happens here; call `cleanupOrphanedPhotos` after
 * all subfolders have synced.
 */
export async function syncSingleSubfolder(opts: {
    librarySlug: string;
    subfolderId?: string;
    subfolderName?: string;
    limit?: number;
    timeBudgetSeconds?: number;
}) {
    const limit = opts.limit && opts.limit > 0 ? opts.limit : Number.MAX_SAFE_INTEGER;
    const budget = opts.timeBudgetSeconds ?? DEFAULT_TIME_BUDGET_SECONDS;
    const { ctx, folderId: rootFolderId } = await buildCtx(opts.librarySlug, limit, budget);

    const targetId = opts.subfolderId || rootFolderId;
    const targetName = opts.subfolderName ?? null;
    // depth=1 when a subfolder was given (so its name is tagged); depth=0 for root.
    const depth = opts.subfolderId ? 1 : 0;

    await processFolder(ctx, targetId, targetName, depth);

    return {
        synced: ctx.stats.synced,
        foldersVisited: ctx.stats.foldersVisited,
        tagsCreated: ctx.stats.tagsCreated,
        seenFileIds: [...ctx.seenFileIds],
        timedOut: ctx.timedOut,
    };
}

/**
 * Remove photos from Supabase whose Drive file IDs are not in `seenFileIds`.
 * Pass the union of `seenFileIds` from every successful subfolder run.
 * If `seenFileIds` is empty, nothing is deleted (treated as inconclusive).
 */
export async function cleanupOrphanedPhotos(librarySlug: string, seenFileIds: string[]): Promise<number> {
    if (seenFileIds.length === 0) return 0;
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = resolveCreds();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: library } = await supabase
        .from('photo_libraries')
        .select('id')
        .eq('slug', librarySlug)
        .single();
    if (!library) return 0;

    const seen = new Set(seenFileIds);
    const { data: existingPhotos } = await supabase
        .from('photos')
        .select('google_drive_file_id')
        .eq('library_id', library.id);
    if (!existingPhotos) return 0;

    const toDelete = existingPhotos
        .filter(p => p.google_drive_file_id && !seen.has(p.google_drive_file_id))
        .map(p => p.google_drive_file_id!);
    if (toDelete.length === 0) return 0;

    const { error } = await supabase.from('photos').delete().in('google_drive_file_id', toDelete);
    if (error) {
        console.error(`[sync] cleanup failed for ${librarySlug}:`, error.message);
        return 0;
    }
    return toDelete.length;
}

/**
 * One-shot sync: walks the entire library tree in one invocation. Bounded by
 * `timeBudgetSeconds` so it doesn't trigger Vercel's 300s function ceiling.
 * For large libraries, prefer the batched flow (`listLibrarySubfolders` +
 * `syncSingleSubfolder` per folder + `cleanupOrphanedPhotos`).
 */
export async function syncGalleryPhotos(
    librarySlug: string,
    limit: number = Number.MAX_SAFE_INTEGER,
    timeBudgetSeconds: number = DEFAULT_TIME_BUDGET_SECONDS,
) {
    const { ctx, folderId } = await buildCtx(librarySlug, limit, timeBudgetSeconds);

    await processFolder(ctx, folderId, null, 0);

    // Cleanup: remove photos no longer present in Drive — only if we walked the
    // full tree without timing out (otherwise we'd delete photos in unscanned
    // subfolders).
    let deletedCount = 0;
    if (!ctx.timedOut && ctx.stats.synced < ctx.limit) {
        const { data: existingPhotos } = await ctx.supabase
            .from('photos')
            .select('google_drive_file_id')
            .eq('library_id', ctx.library.id);
        if (existingPhotos) {
            const toDelete = existingPhotos
                .filter(p => p.google_drive_file_id && !ctx.seenFileIds.has(p.google_drive_file_id))
                .map(p => p.google_drive_file_id!);
            if (toDelete.length > 0) {
                const { error } = await ctx.supabase.from('photos').delete().in('google_drive_file_id', toDelete);
                if (!error) deletedCount = toDelete.length;
            }
        }
    }

    return {
        synced: ctx.stats.synced,
        foldersVisited: ctx.stats.foldersVisited,
        tagsCreated: ctx.stats.tagsCreated,
        deleted: deletedCount,
        timedOut: ctx.timedOut,
    };
}
