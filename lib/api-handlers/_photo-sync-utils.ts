import { google, drive_v3 } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
    findVenueForFolder,
    haversineMeters,
    medianGps,
    VenueTag,
} from './_venue-match';
import { reverseGeocodeNeighborhood } from './_reverse-geocode';

const MAX_DEPTH = 3;
const SAMPLE_SIZE = 5;
const DRIVE_PAGE_SIZE = 1000;
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

async function upsertPhoto(ctx: SyncCtx, file: DriveFile): Promise<string | null> {
    if (!file.id || !file.name) return null;
    const title = file.name.split('.').slice(0, -1).join('.');
    const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');
    const { metadata, finalCreatedAt, latitude, longitude } = parsePhotoFields(file);

    const { data, error } = await ctx.supabase
        .from('photos')
        .upsert({
            library_id: ctx.library.id,
            google_drive_file_id: file.id,
            title,
            thumbnail_url: thumbnailUrl,
            status: 'active',
            mime_type: file.mimeType,
            created_at: finalCreatedAt,
            metadata,
            latitude,
            longitude,
        }, { onConflict: 'google_drive_file_id' })
        .select('id')
        .single();

    if (error) {
        console.error(`[sync] upsert photo ${file.id} failed:`, error.message);
        return null;
    }
    return data.id;
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
): Promise<string | null> {
    const samples = photos
        .slice(0, SAMPLE_SIZE)
        .map(p => p.imageMediaMetadata?.location)
        .filter((l): l is { latitude: number; longitude: number } =>
            !!l && typeof l.latitude === 'number' && typeof l.longitude === 'number')
        .map(l => ({ latitude: l.latitude, longitude: l.longitude }));

    const mid = medianGps(samples);

    const venue = findVenueForFolder(folderName, mid, ctx.venues);
    if (venue) return venue.id;

    if (mid) {
        const neighborhood = await reverseGeocodeNeighborhood(mid.latitude, mid.longitude);
        if (neighborhood) {
            return await ensureTag(ctx, neighborhood, 'location', {
                latitude: mid.latitude,
                longitude: mid.longitude,
            });
        }
    }
    return null;
}

async function processFolder(
    ctx: SyncCtx,
    folderId: string,
    folderName: string | null,
    depth: number,
): Promise<void> {
    if (ctx.stats.synced >= ctx.limit) return;
    ctx.stats.foldersVisited++;

    const { photos, subfolders } = await listFolderEntries(ctx.drive, folderId);

    let collectionTagId: string | null = null;
    let folderVenueOrLocationTagId: string | null = null;
    if (depth > 0 && folderName && photos.length > 0) {
        collectionTagId = await ensureTag(ctx, folderName, 'collection');
        folderVenueOrLocationTagId = await determineFolderTag(ctx, folderName, photos);
    }

    for (const file of photos) {
        if (ctx.stats.synced >= ctx.limit) return;
        if (!file.id) continue;
        ctx.seenFileIds.add(file.id);

        const photoId = await upsertPhoto(ctx, file);
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

        await writePhotoTags(ctx, photoId, tagIds);
        ctx.stats.synced++;
    }

    if (depth < MAX_DEPTH) {
        for (const sub of subfolders) {
            if (ctx.stats.synced >= ctx.limit) break;
            await processFolder(ctx, sub.id!, sub.name || null, depth + 1);
        }
    }
}

export async function syncGalleryPhotos(librarySlug: string, limit: number = 10000) {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('*')
        .eq('slug', librarySlug)
        .single();
    if (libError || !library) throw new Error(`Library not found: ${librarySlug}`);

    const folderId = library.google_drive_folder_id || library.gdrive_folder_id;

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
    };

    await processFolder(ctx, folderId, null, 0);

    // Cleanup: remove photos no longer present in Drive
    let deletedCount = 0;
    if (ctx.stats.synced < ctx.limit) {
        const { data: existingPhotos } = await supabase
            .from('photos')
            .select('google_drive_file_id')
            .eq('library_id', library.id);
        if (existingPhotos) {
            const toDelete = existingPhotos
                .filter(p => p.google_drive_file_id && !ctx.seenFileIds.has(p.google_drive_file_id))
                .map(p => p.google_drive_file_id!);
            if (toDelete.length > 0) {
                const { error } = await supabase.from('photos').delete().in('google_drive_file_id', toDelete);
                if (!error) deletedCount = toDelete.length;
            }
        }
    }

    return {
        synced: ctx.stats.synced,
        foldersVisited: ctx.stats.foldersVisited,
        tagsCreated: ctx.stats.tagsCreated,
        deleted: deletedCount,
    };
}
