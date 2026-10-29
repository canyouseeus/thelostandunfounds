// Live event ingest — photos pushed from a camera during an event, reviewed by
// the owner, and published to the gallery while the event is still going.
//
// Shape of the thing:
//   1. An uploader (the FTP relay for the Canon, the laptop watcher for the
//      Fuji, or the admin from a browser) asks for an upload slot and sends the
//      bytes straight to Google Drive — into the gallery's private INBOX folder.
//   2. It tells us the file is there. We check it really is in that inbox and
//      record it as pending. Guests cannot see it.
//      Camera-roll uploads (LiveUploader) skip step 3: they are hand-picked,
//      so ingest-complete publishes them on the spot.
//   3. The owner reviews the inbox on the live dashboard. Publish moves the
//      file into the gallery's folder and writes the photo row through the same
//      code the sync uses. Discard deletes the Drive file permanently — not to
//      the trash — and drops the record, so a bad frame is kept nowhere.
//
// Why the inbox is its own folder outside the gallery's: the scheduled sync
// walks the gallery folder and its subfolders and publishes whatever it finds.
// A pending photo anywhere under it would go live on the next pass.
//
// Why the bytes go straight to Drive rather than through us: a Vercel function
// caps request bodies at ~4.5MB and a full-size JPEG from a 5D Mark IV is
// bigger than that. Why not the Supabase Storage hop client-uploads uses: every
// photo would then be downloaded back out of Storage to mirror it, and egress
// is the reason this project moved databases. Drive resumable sessions have no
// size cliff and cost nothing to serve from.
//
// Two ways to upload:
//   - an ingest key (`Authorization: Bearer tlu_live_…`), minted per gallery by
//     the admin. A key can drop photos into its own gallery's inbox and nothing
//     else — it cannot publish, discard or read anything back, and it is not an
//     admin credential (verifyAdmin never sees it).
//   - the owner's admin session, which can upload to any gallery by slug.
// Reviewing (list, preview, publish, discard) is admin only.
import type { VercelRequest } from '@vercel/node';
import { createHash, randomBytes } from 'crypto';
import type { drive_v3 } from 'googleapis';
import { createServiceSupabaseClient, type ServiceSupabaseClient } from './_supabase-admin-client.js';
import { verifyAdmin } from './_admin-auth.js';
import { createClient } from '@supabase/supabase-js';
import { ingestUploadedPhoto, INGEST_FILE_FIELDS } from './_photo-sync-utils.js';
import {
    hasAcceptedPhotographerTerms, recordPhotographerTerms, PHOTOGRAPHER_TERMS_VERSION,
    TERMS_REQUIRED_MESSAGE, TermsVersionError, type TermsParty,
} from './_terms.js';
import { normalizeHandle, normalizeText, reverseGeocode } from '../../scripts/claptrop-namer.js';

export { normalizeHandle };

export const INGEST_KEY_PREFIX = 'tlu_live_';
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const MAX_BATCH = 200;

export class HttpError extends Error {
    status: number;
    /** Machine-readable reason, for the client to act on (e.g. 'terms_required'). */
    code?: string;
    constructor(status: number, message: string, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

interface IngestLibrary {
    id: string;
    slug: string;
    name: string;
    folderId: string;
    live_mode: boolean;
    owner_id: string | null;
    /** The gallery's own credit — who its photos are named for when the uploader has none. */
    handle: string | null;
}

interface IngestCaller {
    library: IngestLibrary;
    /** Null when the caller is the admin session. */
    keyId: string | null;
    /**
     * Who the photos are credited to in their filenames — an Instagram handle
     * like '@four5_culture'. Null when nobody is known to have shot them; the
     * file then keeps its camera name rather than crediting the wrong person.
     */
    handle: string | null;
    /**
     * Who has to have agreed to the Photographer Terms before this caller can
     * upload. Null for the admin session — the owner is the business.
     */
    party: TermsParty | null;
}

/** The house's own handle — what the owner's uploads are credited to. */
export const HOUSE_HANDLE = '@tlau.media';


export function hashIngestKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

function bearer(req: VercelRequest): string {
    const header = (req.headers.authorization as string) || '';
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function loadLibrary(supabase: ServiceSupabaseClient, match: { id?: string; slug?: string }): Promise<IngestLibrary> {
    let query = supabase
        .from('photo_libraries')
        .select('id, slug, name, google_drive_folder_id, gdrive_folder_id, live_mode, owner_id, photographer_handle');
    query = match.id ? query.eq('id', match.id) : query.eq('slug', match.slug || '');
    const { data, error } = await query.maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'Gallery not found.');

    const folderId = data.google_drive_folder_id || data.gdrive_folder_id;
    if (!folderId) throw new HttpError(409, `Gallery ${data.slug} has no Google Drive folder to publish into.`);
    return {
        id: data.id, slug: data.slug, name: data.name, folderId,
        live_mode: Boolean(data.live_mode), owner_id: data.owner_id ?? null,
        handle: normalizeHandle(data.photographer_handle),
    };
}

/**
 * Who is uploading, and to which gallery.
 *
 * An ingest key decides the gallery itself — a slug in the body is ignored, so
 * a key for one event can never write into another. The admin session names
 * the gallery by slug.
 */
export async function resolveIngestCaller(
    req: VercelRequest,
    supabase: ServiceSupabaseClient,
    slug: unknown,
): Promise<IngestCaller> {
    const token = bearer(req);
    if (token.startsWith(INGEST_KEY_PREFIX)) {
        const { data: key, error } = await supabase
            .from('gallery_ingest_keys')
            .select('id, library_id, revoked_at, photographer_id, credit_handle')
            .eq('key_hash', hashIngestKey(token))
            .maybeSingle();
        if (error) throw new HttpError(500, error.message);
        if (!key || key.revoked_at) throw new HttpError(401, 'This upload key is not valid.');
        let handle: string | null = normalizeHandle(key.credit_handle);
        if (key.photographer_id) {
            const { data: shooter } = await supabase
                .from('photographers')
                .select('instagram')
                .eq('id', key.photographer_id)
                .maybeSingle();
            handle = normalizeHandle(shooter?.instagram);
        }
        return { library: await loadLibrary(supabase, { id: key.library_id }), keyId: key.id, handle, party: { ingestKeyId: key.id } };
    }

    if (typeof slug !== 'string' || !slug) {
        if (!(await verifyAdmin(req)) && !(await verifiedPhotographer(req, supabase))) throw new HttpError(401, 'Unauthorized');
        throw new HttpError(400, 'slug is required.');
    }
    if (await verifyAdmin(req)) return { library: await loadLibrary(supabase, { slug }), keyId: null, handle: HOUSE_HANDLE, party: null };

    // A photographer may upload to galleries they own, and no others.
    const photographer = await verifiedPhotographer(req, supabase);
    if (!photographer) throw new HttpError(401, 'Unauthorized');
    const library = await loadLibrary(supabase, { slug });
    if (library.owner_id !== photographer.userId) throw new HttpError(403, 'That gallery is not yours.');
    return { library, keyId: null, handle: normalizeHandle(photographer.instagram), party: { userId: photographer.userId } };
}

// --- The terms gate ---
//
// Nothing reaches a gallery from anyone but the owner until they have agreed
// to the Photographer Terms. Enforced here, on the server, for every upload
// call — see lib/api-handlers/_terms.ts.

/** Whether the caller may upload: true for the admin, else their agreement on record. */
export async function termsAccepted(supabase: ServiceSupabaseClient, party: TermsParty | null): Promise<boolean> {
    if (!party) return true;
    try {
        return await hasAcceptedPhotographerTerms(supabase, party);
    } catch (err: any) {
        throw new HttpError(500, err?.message || 'Could not check terms acceptance.');
    }
}

export async function requireTerms(supabase: ServiceSupabaseClient, party: TermsParty | null): Promise<void> {
    if (!(await termsAccepted(supabase, party))) throw new HttpError(403, TERMS_REQUIRED_MESSAGE, 'terms_required');
}

export async function acceptTerms(
    supabase: ServiceSupabaseClient,
    req: VercelRequest,
    party: TermsParty | null,
    body: { version?: unknown; name?: unknown; email?: unknown },
) {
    if (!party) return { termsAccepted: true, termsVersion: PHOTOGRAPHER_TERMS_VERSION };
    try {
        await recordPhotographerTerms(supabase, req, party, body);
    } catch (err: any) {
        if (err instanceof TermsVersionError) throw new HttpError(409, err.message, 'terms_outdated');
        throw new HttpError(500, err?.message || 'Could not record terms acceptance.');
    }
    return { termsAccepted: true, termsVersion: PHOTOGRAPHER_TERMS_VERSION };
}

export { PHOTOGRAPHER_TERMS_VERSION };

// --- Photographers: their own live galleries ---

export interface Photographer {
    id: string;
    userId: string;
    name: string;
    instagram: string | null;
}

/**
 * The active photographer behind a Supabase session, or null.
 *
 * photographers.user_id ties a crew member to their login. The table is
 * admin-only under RLS, so this check can only happen here, server-side.
 */
export async function verifiedPhotographer(
    req: VercelRequest,
    supabase: ServiceSupabaseClient,
): Promise<Photographer | null> {
    const token = bearer(req);
    if (!token || token.startsWith(INGEST_KEY_PREFIX)) return null;
    const userId = await ingestDeps.sessionUserId(token);
    if (!userId) return null;
    const { data: row } = await supabase
        .from('photographers')
        .select('id, name, instagram, active')
        .eq('user_id', userId)
        .maybeSingle();
    if (!row || !row.active) return null;
    return { id: row.id, userId, name: row.name, instagram: row.instagram ?? null };
}

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'live';
}

/** The photographer's own galleries, newest first. */
export async function listMyGalleries(supabase: ServiceSupabaseClient, photographer: Photographer) {
    const { data, error } = await supabase
        .from('photo_libraries')
        .select('id, slug, name, live_mode, is_private, created_at')
        .eq('owner_id', photographer.userId)
        .order('created_at', { ascending: false });
    if (error) throw new HttpError(500, error.message);
    return { photographer: { name: photographer.name }, galleries: data || [] };
}

/**
 * Create a live gallery owned by the photographer: its own Drive folder, a
 * public gallery page, live mode on. Same shape as the invite onboarding in
 * api/admin/onboard-gallery.ts (owner_id, $5 default price), minus the invite.
 */
export async function createMyLiveGallery(
    supabase: ServiceSupabaseClient,
    photographer: Photographer,
    rawName: unknown,
) {
    const name = typeof rawName === 'string' ? rawName.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Give the gallery a name (2–80 characters).');

    let folderId: string;
    try {
        folderId = await ingestDeps.createFolder(
            `${name} — ${photographer.name}`,
            process.env.PHOTOGRAPHER_LIVE_DRIVE_FOLDER_ID || process.env.LIVE_INBOX_DRIVE_FOLDER_ID || undefined,
        );
    } catch (err: any) {
        throw new HttpError(502, `Could not create the gallery's Google Drive folder: ${err?.message || driveStatus(err)}`);
    }

    // A short random suffix keeps two "Halloween" galleries from colliding.
    const slug = `${slugify(name)}-${randomBytes(3).toString('hex')}`;
    const { data, error } = await supabase
        .from('photo_libraries')
        .insert({
            name,
            slug,
            description: `Live from ${name}`,
            google_drive_folder_id: folderId,
            owner_id: photographer.userId,
            user_id: photographer.userId,
            // Normalized: the overnight rename matches files against this exact
            // handle, and 'itzography' would never match '@itzography_…'.
            photographer_handle: normalizeHandle(photographer.instagram),
            is_private: false,
            published: true,
            live_mode: true,
            status: 'active',
            price: 5.0,
        })
        .select('id, slug, name, live_mode, is_private, created_at')
        .single();
    if (error) throw new HttpError(500, error.message);
    return data;
}

/** Go live / end live on a gallery the photographer owns. */
export async function setMyLiveMode(
    supabase: ServiceSupabaseClient,
    photographer: Photographer,
    slug: unknown,
    live: boolean,
) {
    if (typeof slug !== 'string' || !slug) throw new HttpError(400, 'slug is required.');
    const library = await loadLibrary(supabase, { slug });
    if (library.owner_id !== photographer.userId) throw new HttpError(403, 'That gallery is not yours.');
    const { error } = await supabase.from('photo_libraries').update({ live_mode: live }).eq('id', library.id);
    if (error) throw new HttpError(500, error.message);
    return { slug: library.slug, live_mode: live };
}

// --- Google Drive (the owner's OAuth credentials, as client-uploads uses) ---
//
// Not the service account: its key is unusable in production (see
// getDriveAccessToken in api/gallery), and it is read-only by scope anyway.

async function getOAuthClient() {
    const { google } = await import('googleapis');
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new HttpError(500, 'Google Drive credentials are not configured.');
    }
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return { google, auth };
}

async function getDrive() {
    const { google, auth } = await getOAuthClient();
    return google.drive({ version: 'v3', auth });
}

/**
 * Every call that leaves the function — to Google, and to Supabase Auth to
 * resolve a session. Kept on one object so the harness in
 * scripts/verify-gallery-ingest.mts can swap them for stubs and exercise the
 * checks around them without live credentials.
 */
export const ingestDeps = {
    /** The user id behind a Supabase access token, or null. */
    async sessionUserId(token: string): Promise<string | null> {
        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return null;
        const { data, error } = await createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        }).auth.getUser(token);
        return error || !data.user ? null : data.user.id;
    },
    async getAccessToken(): Promise<string | null> {
        const { auth } = await getOAuthClient();
        const { token } = await auth.getAccessToken();
        return token || null;
    },
    async getFile(fileId: string): Promise<drive_v3.Schema$File> {
        const res = await (await getDrive()).files.get({ fileId, fields: INGEST_FILE_FIELDS });
        return res.data;
    },
    async createFolder(name: string, parentId?: string): Promise<string> {
        const res = await (await getDrive()).files.create({
            requestBody: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                ...(parentId ? { parents: [parentId] } : {}),
            },
            fields: 'id',
        });
        if (!res.data.id) throw new Error('Drive returned no folder id');
        return res.data.id;
    },
    /**
     * Move a file between folders — renaming it in the same call when a name
     * is given — and return it with the fields ingest reads.
     */
    async moveFile(fileId: string, toFolderId: string, fromFolderId: string, newName?: string): Promise<drive_v3.Schema$File> {
        const res = await (await getDrive()).files.update({
            fileId,
            addParents: toFolderId,
            removeParents: fromFolderId,
            ...(newName ? { requestBody: { name: newName } } : {}),
            fields: INGEST_FILE_FIELDS,
        });
        return res.data;
    },
    /** The next free ### for a claptrop prefix — atomic in the database. */
    async nextNameSeq(supabase: ServiceSupabaseClient, prefix: string): Promise<number> {
        const { data, error } = await supabase.rpc('next_photo_name_seq', { p_prefix: prefix });
        if (error || typeof data !== 'number') throw new Error(error?.message || 'No sequence number returned');
        return data;
    },
    /** City for a GPS point, via the claptrop namer (Nominatim, falls back to 'austin'). */
    locate: (lat: number, lon: number) => reverseGeocode(lat, lon),
    /** Permanent delete. Skips the trash on purpose — a discarded frame is gone. */
    async deleteFile(fileId: string): Promise<void> {
        await (await getDrive()).files.delete({ fileId });
    },
    async downloadFile(fileId: string): Promise<Buffer> {
        const res = await (await getDrive()).files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        return Buffer.from(res.data as ArrayBuffer);
    },
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

function driveStatus(err: any): number | undefined {
    return err?.response?.status ?? err?.code;
}

/**
 * The gallery's private inbox folder, created on first use.
 *
 * Lands in LIVE_INBOX_DRIVE_FOLDER_ID when that is set, otherwise the root of
 * the owner's Drive. Never inside the gallery's own folder — see the header.
 */
async function ensureInbox(supabase: ServiceSupabaseClient, library: IngestLibrary): Promise<string> {
    const { data: existing, error } = await supabase
        .from('gallery_live_inboxes')
        .select('drive_folder_id')
        .eq('library_id', library.id)
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (existing?.drive_folder_id) return existing.drive_folder_id;

    let folderId: string;
    try {
        folderId = await ingestDeps.createFolder(
            `LIVE INBOX — ${library.name}`,
            process.env.LIVE_INBOX_DRIVE_FOLDER_ID || undefined,
        );
    } catch (err: any) {
        throw new HttpError(502, `Could not create the live inbox in Google Drive: ${err?.message || driveStatus(err)}`);
    }

    const { error: insertError } = await supabase
        .from('gallery_live_inboxes')
        .insert({ library_id: library.id, drive_folder_id: folderId });
    if (insertError) {
        // Two first uploads raced and the other one won. Use its folder; the
        // empty one made here is harmless.
        const { data: winner } = await supabase
            .from('gallery_live_inboxes')
            .select('drive_folder_id')
            .eq('library_id', library.id)
            .maybeSingle();
        if (winner?.drive_folder_id) return winner.drive_folder_id;
        throw new HttpError(500, insertError.message);
    }
    return folderId;
}

function safeFileName(name: string): string {
    const cleaned = (name || 'photo.jpg')
        .replace(/[\\/]/g, '-')
        .replace(/[^\w.\- ]/g, '_')
        .trim();
    return cleaned.slice(-120) || 'photo.jpg';
}

/**
 * Open a Drive resumable upload session in the gallery's inbox.
 *
 * The returned URL is itself the credential for that one upload: the uploader
 * PUTs the bytes to it with no further auth, and Google answers with the new
 * file's id. It expires on its own after a week.
 *
 * `origin` is forwarded so a browser uploader gets CORS headers back from
 * Google on the PUT; machine uploaders leave it out.
 */
export async function startUpload(
    supabase: ServiceSupabaseClient,
    caller: IngestCaller,
    body: { fileName?: unknown; mimeType?: unknown; size?: unknown },
    origin?: string,
): Promise<{ uploadUrl: string; fileName: string }> {
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
    if (!mimeType.startsWith('image/')) throw new HttpError(400, 'Only photos can be uploaded to a live gallery.');
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0) throw new HttpError(400, 'size (bytes) is required.');
    if (size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'That file is larger than 200MB.');

    const fileName = safeFileName(typeof body.fileName === 'string' ? body.fileName : '');
    const inboxId = await ensureInbox(supabase, caller.library);
    const token = await ingestDeps.getAccessToken();
    if (!token) throw new HttpError(502, 'Could not get a Google Drive access token.');

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(size),
    };
    if (origin) headers.Origin = origin;

    const res = await ingestDeps.fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: fileName, parents: [inboxId] }),
            signal: AbortSignal.timeout(15000),
        },
    );
    const uploadUrl = res.headers.get('location');
    if (!res.ok || !uploadUrl) {
        // Surface Google's own reason. A 403 insufficientPermissions here means
        // the refresh token was granted read-only Drive scope — a config fix,
        // not a code bug, and it must not look like a generic failure.
        const detail = await res.text().catch(() => '');
        console.error('[ingest] Drive session failed:', res.status, detail.slice(0, 500));
        throw new HttpError(502, `Google Drive refused the upload (${res.status}): ${detail.slice(0, 300)}`);
    }
    return { uploadUrl, fileName };
}

/** What an upload link points at — enough for the upload page to say where photos are going. */
export function describeCaller(caller: IngestCaller) {
    return { gallery: caller.library.slug, name: caller.library.name, live: caller.library.live_mode };
}

// A Drive resumable chunk must be a multiple of 256 KiB; 16 of them stays under
// Vercel's ~4.5MB request body limit with room for headers.
export const RELAY_CHUNK_BYTES = 16 * 256 * 1024;

/**
 * Forward one chunk of an upload to its Drive session, for browsers that
 * cannot PUT to Google directly (the session URL is cross-origin, and whether
 * Google answers a phone browser's CORS preflight is not something we control).
 *
 * The target must be a Drive resumable session URL — anything else is refused,
 * so this can never be used to make the server fetch an arbitrary address.
 */
export async function relayChunk(
    sessionUrl: string,
    contentRange: string,
    body: Buffer,
): Promise<{ done: boolean; fileId?: string; nextOffset?: number }> {
    let url: URL;
    try {
        url = new URL(sessionUrl);
    } catch {
        throw new HttpError(400, 'Invalid upload session.');
    }
    if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com'
        || url.pathname !== '/upload/drive/v3/files' || !url.searchParams.get('upload_id')) {
        throw new HttpError(400, 'Invalid upload session.');
    }
    if (!/^bytes (\d+-\d+|\*)\/\d+$/.test(contentRange)) throw new HttpError(400, 'Invalid Content-Range.');
    if (body.length > RELAY_CHUNK_BYTES) throw new HttpError(413, 'Chunk too large.');

    const res = await ingestDeps.fetch(url.toString(), {
        method: 'PUT',
        headers: { 'Content-Range': contentRange, 'Content-Length': String(body.length) },
        // fetch's typings want a plain ArrayBuffer; a ≤4MB copy per chunk is nothing.
        body: body.buffer.slice(body.byteOffset, body.byteOffset + body.length) as ArrayBuffer,
        signal: AbortSignal.timeout(60000),
    });
    // 308 = "Resume Incomplete": Google has the bytes up to Range and wants more.
    if (res.status === 308) {
        const range = res.headers.get('range');
        const end = range ? Number(range.split('-')[1]) : -1;
        return { done: false, nextOffset: end + 1 };
    }
    if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        if (!json?.id) throw new HttpError(502, 'Google Drive finished the upload but returned no file id.');
        return { done: true, fileId: json.id };
    }
    const detail = await res.text().catch(() => '');
    throw new HttpError(502, `Google Drive refused the chunk (${res.status}): ${detail.slice(0, 200)}`);
}

/**
 * Record a finished upload: as pending review, or — with `publish: true`,
 * which the camera-roll uploader sends — straight into the gallery.
 *
 * The file id comes from the uploader, so it is not trusted: Drive is asked
 * for the file and it must sit in this gallery's inbox. Without that check a
 * key could claim any file the owner's Drive account can see. Recording the
 * same file twice is a no-op.
 */
export async function completeUpload(
    supabase: ServiceSupabaseClient,
    caller: IngestCaller,
    body: { fileId?: unknown; publish?: unknown; mature?: unknown },
): Promise<{ fileId: string; fileName: string; pending: boolean; photoId?: string }> {
    const fileId = typeof body.fileId === 'string' ? body.fileId.trim() : '';
    if (!/^[\w-]{10,}$/.test(fileId)) throw new HttpError(400, 'fileId is required.');

    const inboxId = await ensureInbox(supabase, caller.library);
    let file: drive_v3.Schema$File;
    try {
        file = await ingestDeps.getFile(fileId);
    } catch (err: any) {
        if (driveStatus(err) === 404) throw new HttpError(404, 'That file is not in Google Drive.');
        throw new HttpError(502, `Google Drive lookup failed: ${err?.message || driveStatus(err)}`);
    }

    if (file.trashed || !(file.parents || []).includes(inboxId)) {
        throw new HttpError(403, 'That file is not in this gallery\'s live inbox.');
    }
    if (!file.mimeType?.startsWith('image/')) {
        throw new HttpError(400, 'Only photos can be added to a live gallery.');
    }

    const { data: already } = await supabase
        .from('gallery_ingest_pending')
        .select('id')
        .eq('drive_file_id', fileId)
        .maybeSingle();
    if (!already) {
        const { error } = await supabase.from('gallery_ingest_pending').insert({
            library_id: caller.library.id,
            drive_file_id: fileId,
            file_name: file.name || null,
            mime_type: file.mimeType || null,
            key_id: caller.keyId,
            credit_handle: caller.handle ?? caller.library.handle,
        });
        // A unique violation is the same file arriving twice at once — fine.
        if (error && !/duplicate|unique/i.test(error.message)) throw new HttpError(500, error.message);
    }

    if (caller.keyId && !already) {
        // Best-effort bookkeeping; a miss here must not fail a received photo.
        const { data: key } = await supabase
            .from('gallery_ingest_keys')
            .select('upload_count')
            .eq('id', caller.keyId)
            .maybeSingle();
        await supabase
            .from('gallery_ingest_keys')
            .update({ last_used_at: new Date().toISOString(), upload_count: (key?.upload_count ?? 0) + 1 })
            .eq('id', caller.keyId);
    }

    // Camera-roll uploads are hand-picked, so they skip review and go live now.
    // Only automatic sends (a camera pushing every frame) wait in the inbox.
    if (body.publish === true) {
        const photoId = await publishFile(supabase, caller.library, inboxId, fileId, caller.handle ?? caller.library.handle);
        // The uploader said these contain nudity: blurred behind 18+ from the start.
        if (body.mature === true && photoId) {
            // updated_at too: open live galleries poll on it, and must pick up the blur.
            const { error } = await supabase.from('photos')
                .update({ is_mature: true, updated_at: new Date().toISOString() })
                .eq('id', photoId);
            if (error) throw new HttpError(500, `Photo published but could not be marked 18+: ${error.message}`);
        }
        return { fileId, fileName: file.name || '', pending: false, photoId };
    }
    return { fileId, fileName: file.name || '', pending: true };
}

// --- Review (admin only) ---

export async function listInbox(supabase: ServiceSupabaseClient, slug: string) {
    const library = await loadLibrary(supabase, { slug });
    const { data, error } = await supabase
        .from('gallery_ingest_pending')
        .select('drive_file_id, file_name, mime_type, received_at')
        .eq('library_id', library.id)
        .order('received_at', { ascending: false })
        .limit(500);
    if (error) throw new HttpError(500, error.message);
    return { slug: library.slug, pending: data || [] };
}

function batchIds(fileIds: unknown): string[] {
    if (!Array.isArray(fileIds) || fileIds.length === 0) throw new HttpError(400, 'fileIds is required.');
    if (fileIds.length > MAX_BATCH) throw new HttpError(400, `At most ${MAX_BATCH} photos at a time.`);
    return [...new Set(fileIds.filter((id): id is string => typeof id === 'string' && /^[\w-]{10,}$/.test(id)))];
}

/** Only ids pending in THIS gallery — anything else is reported, not touched. */
async function pendingIn(supabase: ServiceSupabaseClient, libraryId: string, ids: string[]): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('gallery_ingest_pending')
        .select('drive_file_id')
        .eq('library_id', libraryId)
        .in('drive_file_id', ids);
    if (error) throw new HttpError(500, error.message);
    return new Set((data || []).map((r: any) => r.drive_file_id));
}

type BatchResult = { fileId: string; ok: boolean; photoId?: string; error?: string };

/**
 * The claptrop name a published photo gets:
 *   @handle_thelostandunfounds_YYYY-MM-DD_location_subject_###.ext
 * Date is the capture date (else upload date), UTC like the rest of the
 * archive; location is the GPS city, else 'austin' as the namer does; subject
 * is the gallery's name. ### comes from the database so two phones publishing
 * at once can never draw the same number.
 */
export async function liveFileName(
    supabase: ServiceSupabaseClient,
    library: IngestLibrary,
    file: drive_v3.Schema$File,
    handle: string,
): Promise<{ filename: string; location: string }> {
    const meta: any = file.imageMediaMetadata || {};
    let date: Date | null = null;
    const exif = typeof meta.time === 'string'
        ? meta.time.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
        : null;
    if (exif) date = new Date(Date.UTC(+exif[1], +exif[2] - 1, +exif[3], +exif[4], +exif[5], +exif[6]));
    if (!date || isNaN(date.getTime())) date = new Date(file.createdTime || Date.now());
    const dateStr = date.toISOString().slice(0, 10);

    const lat = meta.location?.latitude;
    const lon = meta.location?.longitude;
    const location = typeof lat === 'number' && typeof lon === 'number'
        ? await ingestDeps.locate(lat, lon)
        : 'austin';
    const subject = normalizeText(library.name) || 'photo';

    const prefix = `${handle}_thelostandunfounds_${dateStr}_${location}_${subject}_`;
    const seq = await ingestDeps.nextNameSeq(supabase, prefix);
    const ext = ((file.name || '').match(/\.[a-z0-9]{2,5}$/i)?.[0] || '.jpg').toLowerCase();
    return { filename: `${prefix}${String(seq).padStart(3, '0')}${ext}`, location };
}

/**
 * Move one received file from the inbox into the gallery's folder — named to
 * the claptrop convention for whoever it is credited to — and write its photo
 * row, at which point it is live; then drop it from the inbox.
 *
 * The credit is the uploader's handle, else the gallery's own (every live
 * gallery has one — see setLiveMode). Only when neither exists does the file
 * keep its camera name. A naming failure (geocoder,
 * counter) publishes under the camera name rather than holding the photo back.
 */
async function publishFile(
    supabase: ServiceSupabaseClient,
    library: IngestLibrary,
    inboxId: string,
    fileId: string,
    handle: string | null,
): Promise<string> {
    let newName: string | undefined;
    let location: string | undefined;
    if (handle) {
        try {
            const named = await liveFileName(supabase, library, await ingestDeps.getFile(fileId), handle);
            newName = named.filename;
            location = named.location;
        } catch (err: any) {
            console.warn('[ingest] naming failed, publishing under the camera name:', fileId, err?.message);
        }
    }
    const file = await ingestDeps.moveFile(fileId, library.folderId, inboxId, newName);
    const photoId = await ingestUploadedPhoto(supabase, library.id, file);
    if (!photoId) throw new Error('The photo row could not be written.');
    if (location) await supabase.from('photos').update({ location_name: location }).eq('id', photoId);
    await supabase.from('gallery_ingest_pending').delete().eq('drive_file_id', fileId);
    return photoId;
}

/**
 * Publish: move each file from the inbox into the gallery's folder, then write
 * its photo row — at which point it is live. Per-photo results, so one Drive
 * hiccup does not sink the batch.
 */
export async function publishPending(supabase: ServiceSupabaseClient, slug: string, fileIds: unknown) {
    const library = await loadLibrary(supabase, { slug });
    const ids = batchIds(fileIds);
    const inboxId = await ensureInbox(supabase, library);
    const known = await pendingIn(supabase, library.id, ids);
    const { data: credits } = await supabase
        .from('gallery_ingest_pending')
        .select('drive_file_id, credit_handle')
        .in('drive_file_id', [...known]);
    const creditFor = new Map((credits || []).map((r: any) => [r.drive_file_id, r.credit_handle ?? null]));

    const results: BatchResult[] = [];
    for (const fileId of ids) {
        if (!known.has(fileId)) {
            results.push({ fileId, ok: false, error: 'Not pending in this gallery.' });
            continue;
        }
        try {
            const photoId = await publishFile(supabase, library, inboxId, fileId, creditFor.get(fileId) ?? library.handle);
            results.push({ fileId, ok: true, photoId });
        } catch (err: any) {
            console.error('[live-inbox] publish failed:', fileId, err?.message);
            results.push({ fileId, ok: false, error: err?.message || 'Publish failed.' });
        }
    }
    return { published: results.filter(r => r.ok).length, results };
}

/**
 * Discard: delete each file from Drive permanently, then forget it. A file
 * Drive no longer has (already deleted by hand) still counts as discarded.
 */
export async function discardPending(supabase: ServiceSupabaseClient, slug: string, fileIds: unknown) {
    const library = await loadLibrary(supabase, { slug });
    const ids = batchIds(fileIds);
    const known = await pendingIn(supabase, library.id, ids);

    const results: BatchResult[] = [];
    for (const fileId of ids) {
        if (!known.has(fileId)) {
            results.push({ fileId, ok: false, error: 'Not pending in this gallery.' });
            continue;
        }
        try {
            try {
                await ingestDeps.deleteFile(fileId);
            } catch (err: any) {
                if (driveStatus(err) !== 404) throw err;
            }
            await supabase.from('gallery_ingest_pending').delete().eq('drive_file_id', fileId);
            results.push({ fileId, ok: true });
        } catch (err: any) {
            console.error('[live-inbox] discard failed:', fileId, err?.message);
            results.push({ fileId, ok: false, error: err?.message || 'Discard failed.' });
        }
    }
    return { discarded: results.filter(r => r.ok).length, results };
}

/**
 * A resized JPEG of a pending photo for the review grid.
 *
 * Pending photos never go through /api/gallery/stream: that route is public,
 * and a pending photo must not be reachable by anyone but the owner. Only ids
 * actually in the inbox are served.
 */
export async function previewPending(supabase: ServiceSupabaseClient, fileId: string, size: number): Promise<Buffer> {
    if (!/^[\w-]{10,}$/.test(fileId)) throw new HttpError(400, 'fileId is required.');
    const { data } = await supabase
        .from('gallery_ingest_pending')
        .select('id')
        .eq('drive_file_id', fileId)
        .maybeSingle();
    if (!data) throw new HttpError(404, 'Not in the live inbox.');

    let original: Buffer;
    try {
        original = await ingestDeps.downloadFile(fileId);
    } catch (err: any) {
        throw new HttpError(driveStatus(err) === 404 ? 404 : 502, `Drive download failed: ${err?.message || driveStatus(err)}`);
    }
    const { default: sharp } = await import('sharp');
    const edge = Math.min(Math.max(Math.round(size) || 600, 100), 1600);
    return sharp(original)
        .rotate()
        .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
}

// --- Admin: live mode and keys ---

export async function getLiveEvent(supabase: ServiceSupabaseClient, slug: string) {
    const library = await loadLibrary(supabase, { slug });
    const { data: keys, error } = await supabase
        .from('gallery_ingest_keys')
        .select('id, key_prefix, label, created_at, revoked_at, last_used_at, upload_count, photographer_id, credit_handle')
        .eq('library_id', library.id)
        .order('created_at', { ascending: false });
    if (error) throw new HttpError(500, error.message);
    // The crew list feeds the "who's shooting" picker; handles come back
    // normalized so the page shows exactly what filenames will carry.
    const { data: crew } = await supabase
        .from('photographers')
        .select('id, name, instagram')
        .eq('active', true)
        .order('name');
    return {
        slug: library.slug, name: library.name, live_mode: library.live_mode, keys: keys || [],
        handle: library.handle,
        crew: (crew || []).map((c: any) => ({ id: c.id, name: c.name, handle: normalizeHandle(c.instagram) })),
    };
}

export async function setLiveMode(supabase: ServiceSupabaseClient, slug: string, live: boolean) {
    const library = await loadLibrary(supabase, { slug });
    // A live gallery is named for someone, whatever adds to it: uploads with no
    // credit of their own, and files dropped straight into its Drive folder
    // (named by the overnight rename, which skips galleries with no handle).
    // This route is the owner's, so a gallery with no handle is the house's.
    const update: Record<string, unknown> = { live_mode: live };
    if (live && !library.handle) update.photographer_handle = HOUSE_HANDLE;
    const { error } = await supabase
        .from('photo_libraries')
        .update(update)
        .eq('id', library.id);
    if (error) throw new HttpError(500, error.message);
    return getLiveEvent(supabase, slug);
}

/** The plaintext key is returned here once and never stored. */
export async function mintIngestKey(
    supabase: ServiceSupabaseClient,
    slug: string,
    label?: string,
    photographerId?: string | null,
    guestHandle?: string | null,
) {
    const guest = photographerId ? null : normalizeHandle(guestHandle);
    if (!photographerId && guestHandle && guestHandle.trim() && !guest) {
        throw new HttpError(400, 'That Instagram handle has characters a handle can\'t contain.');
    }
    const library = await loadLibrary(supabase, { slug });
    if (photographerId) {
        const { data: shooter } = await supabase.from('photographers').select('id').eq('id', photographerId).maybeSingle();
        if (!shooter) throw new HttpError(400, 'That photographer is not on the crew list.');
    }
    const key = INGEST_KEY_PREFIX + randomBytes(32).toString('base64url');
    const { data, error } = await supabase
        .from('gallery_ingest_keys')
        .insert({
            library_id: library.id,
            key_hash: hashIngestKey(key),
            key_prefix: key.slice(0, INGEST_KEY_PREFIX.length + 6),
            label: (label || '').trim().slice(0, 80) || null,
            photographer_id: photographerId || null,
            credit_handle: guest,
        })
        .select('id, key_prefix, label, created_at, photographer_id, credit_handle')
        .single();
    if (error) throw new HttpError(500, error.message);
    return { key, ...data };
}

export async function revokeIngestKey(supabase: ServiceSupabaseClient, slug: string, keyId: string) {
    const library = await loadLibrary(supabase, { slug });
    const { data, error } = await supabase
        .from('gallery_ingest_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('library_id', library.id)
        .is('revoked_at', null)
        .select('id, revoked_at')
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'No active key with that id on this gallery.');
    return data;
}

export function createServiceClient() {
    return createServiceSupabaseClient();
}
