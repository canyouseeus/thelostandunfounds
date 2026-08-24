import { google, drive_v3 } from 'googleapis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createPrivateKey } from 'crypto';
import {
    DEFAULT_VENUE_RADIUS_M,
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
    /**
     * Photos Drive has not touched since the last sync, so nothing was written
     * for them. Counted separately from `synced`: folding them together hides
     * the difference between "did the work" and "correctly did nothing", which
     * is the exact distinction that went unnoticed while this job rewrote every
     * row every five minutes.
     */
    skipped: number;
    foldersVisited: number;
    tagsCreated: number;
}

interface NeighborhoodTag {
    id: string;
    name: string;
    metadata: { latitude: number; longitude: number };
}

interface SyncCtx {
    drive: drive_v3.Drive;
    supabase: SupabaseClient;
    library: { id: string };
    tagCache: Map<string, { id: string; type: string; metadata: any }>;
    venues: VenueTag[];
    neighborhoods: NeighborhoodTag[];
    stats: SyncStats;
    seenFileIds: Set<string>;
    limit: number;
    deadline: number;
    timedOut: boolean;
}

// Photos whose GPS doesn't fall in any venue radius get tagged with the
// closest 'location' tag within this distance. 5km comfortably covers
// downtown Austin without crossing into a different neighborhood.
const NEIGHBORHOOD_FALLBACK_MAX_M = 5000;

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
                fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, webContentLink, createdTime, modifiedTime, imageMediaMetadata)',
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

/**
 * Identity of a Drive file as far as this sync is concerned.
 *
 * Deliberately excludes `thumbnailLink`: Google rotates the token inside that
 * URL, so folding it in would make every photo look changed on every pass and
 * defeat the whole check. It also excludes anything we derive rather than read
 * — the fingerprint answers "did Drive change?", not "is our row perfect?".
 */
function computeFingerprint(file: DriveFile): string {
    return [
        file.modifiedTime ?? '',
        file.name ?? '',
        file.mimeType ?? '',
        file.createdTime ?? '',
    ].join('\u0000');
}

const FINGERPRINT_KEY = 'sync_fingerprint';

interface ExistingPhoto {
    id: string;
    libraryId: string | null;
    fingerprint: string | null;
}

/**
 * PostgREST sends filters in the query string, so `.in()` on thousands of IDs
 * builds a URL no gateway will accept. Chunked well under that ceiling.
 */
const EXISTING_LOOKUP_CHUNK = 200;

/**
 * Load every already-synced photo for this batch of Drive files in a handful of
 * queries.
 *
 * This replaces a per-photo existence check. That check was one of the three
 * HTTP calls each photo cost, and with the folder re-walked every five minutes
 * it added up to ~1M requests a day on its own.
 */
async function loadExistingPhotos(ctx: SyncCtx, fileIds: string[]): Promise<Map<string, ExistingPhoto>> {
    const found = new Map<string, ExistingPhoto>();
    for (let i = 0; i < fileIds.length; i += EXISTING_LOOKUP_CHUNK) {
        const chunk = fileIds.slice(i, i + EXISTING_LOOKUP_CHUNK);
        // Deliberately NOT scoped to this library. photos.google_drive_file_id
        // carries a global unique index, so a file that has moved between
        // libraries still occupies a row here. Scoping the lookup would hide
        // that row, send the file down the insert path, and hit the unique
        // violation on every pass forever.
        const { data, error } = await ctx.supabase
            .from('photos')
            .select('id, google_drive_file_id, library_id, metadata')
            .in('google_drive_file_id', chunk);
        if (error) {
            // Treat as "nothing known". The sync then behaves exactly as it did
            // before this optimisation existed — correct, just not cheap.
            console.error(`[sync] existing-photo lookup failed:`, error.message);
            continue;
        }
        for (const row of data ?? []) {
            if (!row.google_drive_file_id) continue;
            found.set(row.google_drive_file_id, {
                id: row.id,
                libraryId: row.library_id ?? null,
                fingerprint: row.metadata?.[FINGERPRINT_KEY] ?? null,
            });
        }
    }
    return found;
}

async function upsertPhoto(
    ctx: SyncCtx,
    file: DriveFile,
    existing: ExistingPhoto | undefined,
): Promise<string | null> {
    if (!file.id || !file.name) return null;
    const title = file.name.split('.').slice(0, -1).join('.');
    const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');
    const { metadata, finalCreatedAt, latitude, longitude } = parsePhotoFields(file);

    // Stamped on the row so the next pass can tell at a glance that Drive has
    // not touched this file, and skip it without writing anything.
    metadata[FINGERPRINT_KEY] = computeFingerprint(file);

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
    // Don't overwrite existing GPS/location with null — the migration backfill
    // and retrograde rename may have set these from a more accurate source.
    if (latitude != null) payload.latitude = latitude;
    if (longitude != null) payload.longitude = longitude;

    // Whether the row exists is already known from the folder-wide prefetch in
    // processFolder. The DB unique constraint may not be in place, so we still
    // branch on it explicitly rather than relying on onConflict.
    if (existing) {
        const { data, error } = await ctx.supabase
            .from('photos')
            .update(payload)
            .eq('google_drive_file_id', file.id)
            .select('id')
            .single();
        if (error) {
            console.error(`[sync] update photo ${file.id} failed:`, error.message);
            return null;
        }
        return data.id;
    }

    const { data, error } = await ctx.supabase
        .from('photos')
        .insert(payload)
        .select('id')
        .single();

    if (error) {
        console.error(`[sync] insert photo ${file.id} failed:`, error.message);
        return null;
    }
    return data.id;
}

function parseLocationFromClaptropTitle(title: string | null | undefined): string | null {
    if (!title) return null;
    // Accept every prefix generation and the legacy short form. Dropping an old
    // one silently loses the parsed location for every file still carrying it.
    //   @tlau.media_thelostandunfounds_YYYY-MM-DD_{location}_{subject}_{###}   (v3)
    //   @tlau.photos_thelostandunfounds_YYYY-MM-DD_{location}_{subject}_{###}  (v2)
    //   @tlau_YYYY-MM-DD_{location}_{subject}_{###}                            (v1)
    const m = title.match(
        /^@[a-z0-9._-]+?(?:_thelostandunfounds)?_\d{4}-\d{2}-\d{2}_([a-z0-9_]+?)_[a-z0-9_]+_\d{3}$/
    );
    if (!m) return null;
    const raw = m[1].replace(/_/g, ' ').trim();
    if (!raw) return null;
    // Title-case for display
    return raw.split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Find every venue whose canonical coords are within radius of the photo's GPS.
 * Used as a fallback ONLY when the parent folder didn't already resolve to a
 * specific venue — folder is the authoritative signal.
 */
async function applyPhotoLevelVenueTags(
    ctx: SyncCtx,
    _photoId: string,
    latitude: number | null,
    longitude: number | null,
): Promise<string[]> {
    if (latitude == null || longitude == null) return [];
    const hits: string[] = [];
    for (const v of ctx.venues) {
        const dist = haversineMeters(latitude, longitude, v.metadata.latitude, v.metadata.longitude);
        const radius = v.metadata.radius_meters || DEFAULT_VENUE_RADIUS_M;
        if (dist <= radius) hits.push(v.id);
    }
    return hits;
}

/**
 * When the folder venue is set, attach the venue tag only if the photo's own
 * GPS supports it (or it has no GPS, in which case we trust the folder). A
 * photo with GPS more than 2x the venue's radius away is almost certainly
 * misfiled into this folder, so we drop the tag for that one photo.
 */
function photoSupportsFolderVenue(
    venue: VenueTag,
    latitude: number | null,
    longitude: number | null,
): boolean {
    if (latitude == null || longitude == null) return true; // no GPS — trust folder
    const dist = haversineMeters(latitude, longitude, venue.metadata.latitude, venue.metadata.longitude);
    const radius = venue.metadata.radius_meters || DEFAULT_VENUE_RADIUS_M;
    return dist <= radius * 2;
}

/**
 * Find the nearest neighborhood ('location' tag) to a photo's GPS, used as a
 * fallback when no venue radius contains the photo. Returns null if every
 * neighborhood is farther than NEIGHBORHOOD_FALLBACK_MAX_M.
 */
function findNearestNeighborhood(
    latitude: number,
    longitude: number,
    neighborhoods: NeighborhoodTag[],
): NeighborhoodTag | null {
    let best: NeighborhoodTag | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const n of neighborhoods) {
        const dist = haversineMeters(latitude, longitude, n.metadata.latitude, n.metadata.longitude);
        if (dist < bestDist) {
            bestDist = dist;
            best = n;
        }
    }
    return bestDist <= NEIGHBORHOOD_FALLBACK_MAX_M ? best : null;
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

// Exported for the sync-skip harness in scripts/verify-sync-skip.mts, which
// drives this function against stub clients to assert a second pass over an
// unchanged folder performs zero writes.
export async function processFolder(
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

    // One lookup for the whole folder, then decide per photo whether there is
    // anything to do. Everything below this line depends on it.
    const existingPhotos = await loadExistingPhotos(
        ctx,
        photos.map(f => f.id).filter((id): id is string => !!id),
    );

    // A folder in which Drive changed nothing needs no folder-level tag work
    // either. determineFolderTag costs a reverse-geocode round trip, so paying
    // it to re-derive a tag we will not attach to anything is pure waste.
    const unchanged = (file: DriveFile): boolean => {
        if (!file.id) return false;
        const known = existingPhotos.get(file.id);
        if (!known?.fingerprint) return false;
        // A file whose row is filed under a different library has moved and must
        // be re-homed, however untouched Drive left its contents.
        if (known.libraryId !== ctx.library.id) return false;
        return known.fingerprint === computeFingerprint(file);
    };
    const changedPhotos = photos.filter(f => !unchanged(f));

    for (const file of photos) {
        // Every file present in Drive counts as seen, changed or not — this set
        // drives orphan deletion, and omitting the skipped ones would delete the
        // entire archive on the first clean pass.
        if (file.id && unchanged(file)) {
            ctx.seenFileIds.add(file.id);
            ctx.stats.skipped++;
        }
    }

    if (changedPhotos.length === 0) {
        // Nothing to do here. Recurse into subfolders and return without a
        // single write.
        if (depth < MAX_DEPTH) {
            for (const sub of subfolders) {
                if (ctx.stats.synced >= ctx.limit) break;
                if (Date.now() > ctx.deadline) { ctx.timedOut = true; break; }
                await processFolder(ctx, sub.id!, sub.name || null, depth + 1);
            }
        }
        return;
    }

    let collectionTagId: string | null = null;
    let folderVenueOrLocationTagId: string | null = null;
    let folderVenue: VenueTag | null = null;
    if (depth > 0 && folderName && changedPhotos.length > 0) {
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

    for (const file of changedPhotos) {
        if (ctx.stats.synced >= ctx.limit) return;
        if (Date.now() > ctx.deadline) { ctx.timedOut = true; return; }
        if (!file.id) continue;
        ctx.seenFileIds.add(file.id);

        const photoId = await upsertPhoto(ctx, file, existingPhotos.get(file.id));
        if (!photoId) continue;

        const tagIds = new Set<string>();
        if (collectionTagId) tagIds.add(collectionTagId);

        const { metadata, latitude, longitude } = parsePhotoFields(file);

        // Folder venue / neighborhood tag attaches per-photo only when the
        // photo's GPS supports it (or has no GPS). A photo whose GPS sits far
        // from the folder venue is almost certainly misfiled into the folder,
        // so we drop the venue tag for that one photo to avoid wrong-place
        // tags on the gallery and map.
        if (folderVenueOrLocationTagId) {
            if (!folderVenue || photoSupportsFolderVenue(folderVenue, latitude, longitude)) {
                tagIds.add(folderVenueOrLocationTagId);
            }
        }
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

        // GPS-only venue tagging is a fallback for photos whose folder didn't
        // resolve to a venue (e.g. a generic "uploads" or year-named folder).
        // Folder is the authoritative signal — when it identified a venue, we
        // don't second-guess it with overlapping nearby venue radii.
        if (!folderVenue) {
            const perPhotoVenues = await applyPhotoLevelVenueTags(ctx, photoId, latitude, longitude);
            for (const id of perPhotoVenues) tagIds.add(id);

            // Neighborhood fallback: if the photo has GPS but didn't land in
            // any venue radius, attach the nearest 'location' (neighborhood)
            // tag so the photo is still placed somewhere on the map filter
            // chips instead of orphaned.
            if (perPhotoVenues.length === 0 && latitude != null && longitude != null) {
                const nearest = findNearestNeighborhood(latitude, longitude, ctx.neighborhoods);
                if (nearest) tagIds.add(nearest.id);
            }
        }

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

function normalizePrivateKey(raw: string): string {
    // Strip surrounding quotes (single or double) that may leak from JSON/env
    let key = raw.trim().replace(/^["']|["']$/g, '');

    // Convert literal \n sequences to real newlines
    key = key.replace(/\\n/g, '\n');

    // Detect key type from existing markers, defaulting to PKCS8
    const headerMatch = key.match(/-----BEGIN ([A-Z ]+)-----/);
    const keyType = headerMatch ? headerMatch[1] : 'PRIVATE KEY';

    if (key.includes('-----BEGIN')) {
        // Extract the base64 body, strip all whitespace, then re-wrap at 64 chars.
        // OpenSSL 3.x (Node 18+) requires strict 64-char line wrapping in PEM bodies.
        const body = key
            .replace(/-----BEGIN [A-Z ]+-----/g, '')
            .replace(/-----END [A-Z ]+-----/g, '')
            .replace(/\s+/g, '');
        const wrapped = (body.match(/.{1,64}/g) ?? []).join('\n');
        key = `-----BEGIN ${keyType}-----\n${wrapped}\n-----END ${keyType}-----`;
    } else {
        // No markers at all — wrap the raw content as PKCS8
        const body = key.replace(/\s+/g, '');
        const wrapped = (body.match(/.{1,64}/g) ?? []).join('\n');
        key = `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
    }

    // Validate the key can be parsed; log diagnostics on failure (don't throw)
    try {
        createPrivateKey(key);
        console.log('[resolveCreds] Private key validated OK, total length:', key.length);
    } catch (e: any) {
        console.error('[resolveCreds] Private key validation warning:', e?.message);
        console.error('[resolveCreds] Key length:', key.length);
        console.error('[resolveCreds] Has newlines:', key.includes('\n'));
        console.error('[resolveCreds] First 5 lines:', key.split('\n').slice(0, 5).join(' | '));
        const bodyChars = key.split('\n').filter(l => !l.startsWith('-----')).join('').length;
        console.error('[resolveCreds] Base64 body chars:', bodyChars);
    }

    return key;
}

function resolveCreds(): ResolvedCreds {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');
    const GOOGLE_KEY = normalizePrivateKey(rawKey || '');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase credentials for sync');
    }
    // Google credentials are checked in buildDrive(), which can fall back to
    // OAuth — demanding a service account here would rule that out.
    return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_EMAIL, GOOGLE_KEY };
}

/**
 * A Drive client for reading a gallery's folder.
 *
 * The service account is preferred: it is what photographers share their
 * folders with, and it holds no rights over anything else.
 *
 * It is not always usable, though. Its private key is passed through an env
 * var, and a mangled one fails deep inside the JWT signer as
 * `DECODER routines::unsupported` — which reads like a corrupt file rather
 * than a config problem. And a folder created by the owner's own account is
 * not shared with the service account at all, so even a valid key lists it
 * as empty and the sync reports zero photos rather than an error.
 *
 * Both cases fall back to the owner's OAuth credentials, which own those
 * folders outright. The key is validated up front so a bad one degrades
 * instead of throwing from the signer.
 */
function buildDrive(GOOGLE_EMAIL: string, GOOGLE_KEY: string) {
    let serviceAccountUsable = Boolean(GOOGLE_EMAIL && GOOGLE_KEY);
    if (serviceAccountUsable) {
        try {
            createPrivateKey(GOOGLE_KEY);
        } catch (err: any) {
            console.warn('[sync] service account key is unusable, falling back to OAuth:', err?.message);
            serviceAccountUsable = false;
        }
    }

    if (serviceAccountUsable) {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: GOOGLE_EMAIL, private_key: GOOGLE_KEY },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        return google.drive({ version: 'v3', auth });
    }

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new Error(
            'No usable Google credentials for sync — the service account key is missing or malformed and no OAuth refresh token is configured',
        );
    }
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth });
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

    const drive = buildDrive(GOOGLE_EMAIL, GOOGLE_KEY);

    const { data: locationTagsRaw } = await supabase
        .from('tags')
        .select('id, name, type, metadata')
        .in('type', ['venue', 'location']);
    const venues: VenueTag[] = (locationTagsRaw || [])
        .filter(t => t.type === 'venue'
            && t.metadata?.latitude != null
            && t.metadata?.longitude != null)
        .map(t => ({ id: t.id, name: t.name, metadata: t.metadata }));
    const neighborhoods: NeighborhoodTag[] = (locationTagsRaw || [])
        .filter(t => t.type === 'location'
            && t.metadata?.latitude != null
            && t.metadata?.longitude != null)
        .map(t => ({ id: t.id, name: t.name, metadata: t.metadata }));

    const tagCache = await loadTagCache(supabase);

    const ctx: SyncCtx = {
        drive,
        supabase,
        library,
        tagCache,
        venues,
        neighborhoods,
        stats: { synced: 0, skipped: 0, foldersVisited: 0, tagsCreated: 0 },
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

    const drive = buildDrive(GOOGLE_EMAIL, GOOGLE_KEY);

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
        skipped: ctx.stats.skipped,
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
        skipped: ctx.stats.skipped,
        foldersVisited: ctx.stats.foldersVisited,
        tagsCreated: ctx.stats.tagsCreated,
        deleted: deletedCount,
        timedOut: ctx.timedOut,
    };
}
