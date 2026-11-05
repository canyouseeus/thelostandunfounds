// Client asset intake — "send me your photos" links.
//
// Shape of the thing: an admin mints a link for a client, the client opens
// /upload/<token> with no account and no login, drops files, and the files land
// in a Google Drive folder cut for that client. The admin gets an email the
// moment a batch finishes.
//
// Why the two-hop (browser -> Supabase Storage -> Drive) instead of posting
// straight at Drive: a Vercel serverless function caps request bodies at ~4.5MB,
// which a single phone photo can exceed. The browser therefore uploads to a
// private Supabase bucket via a signed URL (no size cliff, CORS handled), and
// the server mirrors each file into Drive afterwards. Storage doubles as the
// recovery copy if a Drive mirror fails.
//
// Each photographer runs their own: a request belongs to the photographer who
// minted it (`photographer_id`, null = the studio's own), its Drive folder sits
// inside that photographer's parent folder, and the "files arrived" email goes
// to them. They only ever see their own requests; the admin sees all of them.
//
// Logos also get a white-on-transparent copy, because the site background is
// black and colour logos don't go on it.
import type { VercelRequest } from '@vercel/node';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import sharp from 'sharp';
import { createServiceSupabaseClient, type ServiceSupabaseClient } from './_supabase-admin-client.js';
import { sendTransactionalEmail } from './_resend-email-handler.js';
import { resolveCrewMember } from './crew/_shared.js';

const BUCKET = 'client-uploads';
const SITE = 'https://www.thelostandunfounds.com';
const ADMIN_NOTIFY_EMAIL = 'thelostandunfounds@gmail.com';
const MEDIA_EMAIL = 'media@thelostandunfounds.com';

// Deliberately broad — clients send phone photos, screenshots, PDFs of old
// brand guides, and the occasional short video clip. Anything executable stays
// out.
const ALLOWED_MIME = /^(image\/|video\/|application\/pdf$|application\/zip$|application\/postscript$)/;
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|js|mjs|php|jar|msi|dll|scr|com|vbs|ps1|html?|svg)$/i;

export interface UploadLinkRow {
    id: string;
    token: string;
    client_name: string;
    client_email: string | null;
    project_name: string | null;
    intro: string | null;
    drive_folder_id: string | null;
    drive_folder_url: string | null;
    storage_prefix: string;
    expires_at: string | null;
    max_files: number;
    max_file_mb: number;
    is_active: boolean;
    upload_count: number;
    last_upload_at: string | null;
    invited_at: string | null;
    created_at: string;
    booking_id?: string | null;
    photographer_id: string | null;
}

interface PhotographerOwner {
    id: string;
    name: string;
    email: string | null;
    active: boolean;
    client_uploads_folder_id: string | null;
    client_uploads_folder_url: string | null;
}

const OWNER_FIELDS = 'id, name, email, active, client_uploads_folder_id, client_uploads_folder_url';

// Who is calling a management route. The admin sees everything; a photographer
// is scoped to the requests they own.
export interface Requester {
    isAdmin: boolean;
    photographer: PhotographerOwner | null;
}

export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

// Admin, or an active photographer on the roster. The photographer comes from
// the verified session, never from the request body, so nobody can act as
// somebody else.
export async function requireRequester(req: VercelRequest, supabase: ServiceSupabaseClient): Promise<Requester> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpError(401, 'Not authorized');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new HttpError(401, 'Not authorized');
    if (ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
        return { isAdmin: true, photographer: null };
    }

    const crew = await resolveCrewMember(supabase as any, req, OWNER_FIELDS);
    const photographer = crew?.photographer as PhotographerOwner | undefined;
    if (!photographer || !photographer.active) throw new HttpError(403, 'Content requests are for photographers on the roster.');
    return { isAdmin: false, photographer };
}

// Load a link the requester is allowed to manage. Someone else's link reads as
// not found rather than forbidden, so ids can't be probed.
async function loadOwnedLink(supabase: ServiceSupabaseClient, requester: Requester, id: string): Promise<UploadLinkRow> {
    const { data, error } = await supabase
        .from('client_upload_links')
        .select('*')
        .eq('id', id || '')
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    const link = data as UploadLinkRow | null;
    if (!link || (!requester.isAdmin && link.photographer_id !== requester.photographer?.id)) {
        throw new HttpError(404, 'Link not found');
    }
    return link;
}

async function loadOwner(supabase: ServiceSupabaseClient, photographerId: string | null): Promise<PhotographerOwner | null> {
    if (!photographerId) return null;
    const { data } = await supabase
        .from('photographers')
        .select(OWNER_FIELDS)
        .eq('id', photographerId)
        .maybeSingle();
    return (data as PhotographerOwner | null) || null;
}

export function uploadUrlFor(token: string): string {
    return `${SITE}/upload/${token}`;
}

function slugify(value: string): string {
    return (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'client';
}

// Keeps a client's original filename readable in Drive while making it safe as
// a storage key. Extension is preserved so Drive shows the right preview.
export function safeFileName(name: string): string {
    const cleaned = (name || 'file')
        .replace(/[\\/]/g, '-')
        .replace(/[^\w.\- ]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned.slice(-120) || 'file';
}

export function createServiceClient() {
    return createServiceSupabaseClient();
}

// --- Google Drive (OAuth user credentials, same pattern as api/admin/drive-add.ts) ---

async function getDrive() {
    const { google } = await import('googleapis');
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
        throw new Error('Google Drive credentials are not configured');
    }
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth });
}

// No fallback to DRIVE_FOLDER_ID on purpose — that one points at the music
// library, and dropping client folders in there would be worse than dropping
// them at the root of Drive.
function parentFolderId(): string | undefined {
    return process.env.CLIENT_UPLOADS_DRIVE_FOLDER_ID || undefined;
}

async function createDriveFolder(name: string, parentOverride?: string | null): Promise<{ id: string; url: string }> {
    const drive = await getDrive();
    const parent = parentOverride || parentFolderId();
    const folder = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parent ? { parents: [parent] } : {}),
        },
        fields: 'id',
    });
    const id = folder.data.id!;
    return { id, url: `https://drive.google.com/drive/folders/${id}` };
}

// A photographer's own parent folder, made on first use and shared with them
// as an editor so their clients' files show up in their own Drive. The studio's
// requests (no photographer) keep using the root parent.
async function ensureOwnerFolder(
    supabase: ServiceSupabaseClient,
    owner: PhotographerOwner | null
): Promise<string | null> {
    if (!owner) return null;
    if (owner.client_uploads_folder_id) return owner.client_uploads_folder_id;

    const folder = await createDriveFolder(`${owner.name} — Client Uploads`);
    if (owner.email) {
        try {
            const drive = await getDrive();
            await drive.permissions.create({
                fileId: folder.id,
                sendNotificationEmail: false,
                requestBody: { type: 'user', role: 'writer', emailAddress: owner.email },
            });
        } catch (err: any) {
            // The folder still works for the studio; sharing can be redone by hand.
            console.error('[client-uploads] Could not share folder with', owner.email, err?.message);
        }
    }
    await supabase
        .from('photographers')
        .update({ client_uploads_folder_id: folder.id, client_uploads_folder_url: folder.url })
        .eq('id', owner.id);
    owner.client_uploads_folder_id = folder.id;
    owner.client_uploads_folder_url = folder.url;
    return folder.id;
}

// --- Link management (admin or the owning photographer) ---

export async function listLinks(supabase: ServiceSupabaseClient, requester: Requester) {
    let query = supabase
        .from('client_upload_links')
        .select('*, photographers(name)')
        .order('created_at', { ascending: false });
    if (!requester.isAdmin) query = query.eq('photographer_id', requester.photographer!.id);
    const { data, error } = await query;
    if (error) throw new HttpError(500, error.message);

    return (data || []).map((row: any) => {
        const { photographers, ...link } = row;
        return {
            ...(link as UploadLinkRow),
            owner_name: photographers?.name || null,
            upload_url: uploadUrlFor(link.token),
        };
    });
}

export async function createLink(
    supabase: ServiceSupabaseClient,
    body: {
        client_name?: string;
        client_email?: string;
        project_name?: string;
        intro?: string;
        expires_in_days?: number;
        max_files?: number;
        max_file_mb?: number;
        /** A booking's brand-asset link (see api/booking). */
        booking_id?: string;
        /**
         * Make the Drive folder on the first upload instead of now. Booking
         * links use this: most bookings never send a file, and a Drive call
         * plus an empty folder per booking would be waste.
         */
        defer_drive?: boolean;
    },
    // Booking links (api/booking) are the studio's own, so no requester means studio.
    requester: Requester = { isAdmin: true, photographer: null }
) {
    const owner = requester.photographer;
    const clientName = (body.client_name || '').trim();
    if (!clientName) throw new HttpError(400, 'client_name is required');

    // 32 random bytes, base64url — the link IS the credential, so it has to be
    // wide enough that guessing is hopeless.
    const token = randomBytes(32).toString('base64url');
    const slug = slugify(clientName);
    const folderName = body.project_name
        ? `${clientName} — ${body.project_name}`
        : `${clientName} — Uploads`;

    let drive: { id: string; url: string } | null = null;
    let driveError: string | null = null;
    if (!body.defer_drive) try {
        drive = await createDriveFolder(folderName, await ensureOwnerFolder(supabase, owner));
    } catch (err: any) {
        // A missing Drive folder must not block the link. Files still land in
        // Storage, and the mirror can be retried once Drive is reachable.
        driveError = err?.message || 'Drive folder could not be created';
        console.error('[client-uploads] Drive folder creation failed:', driveError);
    }

    const expiresAt = body.expires_in_days && body.expires_in_days > 0
        ? new Date(Date.now() + body.expires_in_days * 86400_000).toISOString()
        : null;

    const { data, error } = await supabase
        .from('client_upload_links')
        .insert({
            token,
            client_name: clientName,
            client_email: (body.client_email || '').trim() || null,
            project_name: (body.project_name || '').trim() || null,
            intro: (body.intro || '').trim() || null,
            drive_folder_id: drive?.id || null,
            drive_folder_url: drive?.url || null,
            storage_prefix: `${slug}/${token.slice(0, 12)}`,
            expires_at: expiresAt,
            max_files: body.max_files ?? 100,
            max_file_mb: body.max_file_mb ?? 100,
            booking_id: body.booking_id || null,
            photographer_id: owner?.id || null,
        })
        .select()
        .single();
    if (error) throw new HttpError(500, error.message);

    return { link: { ...(data as UploadLinkRow), upload_url: uploadUrlFor(token) }, drive_error: driveError };
}

export async function setLinkActive(supabase: ServiceSupabaseClient, requester: Requester, id: string, isActive: boolean) {
    await loadOwnedLink(supabase, requester, id);
    const { data, error } = await supabase
        .from('client_upload_links')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new HttpError(500, error.message);
    return { ...(data as UploadLinkRow), upload_url: uploadUrlFor((data as UploadLinkRow).token) };
}

// --- Public: resolve a token ---

async function loadLinkByToken(supabase: ServiceSupabaseClient, token: string): Promise<UploadLinkRow> {
    if (!token || token.length < 20) throw new HttpError(404, 'This upload link is not valid.');
    const { data, error } = await supabase
        .from('client_upload_links')
        .select('*')
        .eq('token', token)
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'This upload link is not valid.');

    const link = data as UploadLinkRow;
    if (!link.is_active) throw new HttpError(410, 'This upload link has been turned off.');
    if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        throw new HttpError(410, 'This upload link has expired.');
    }
    return link;
}

// Only the fields the upload page needs. The Drive folder id, the storage
// prefix and the client's email never cross to the browser.
export async function getPublicLink(supabase: ServiceSupabaseClient, token: string) {
    const link = await loadLinkByToken(supabase, token);
    return {
        client_name: link.client_name,
        project_name: link.project_name,
        intro: link.intro,
        max_files: link.max_files,
        max_file_mb: link.max_file_mb,
        remaining: Math.max(0, link.max_files - link.upload_count),
    };
}

// --- Public: signed upload URLs ---

export async function signUploads(
    supabase: ServiceSupabaseClient,
    body: { token?: string; files?: Array<{ name?: string; size?: number; type?: string }> }
) {
    const link = await loadLinkByToken(supabase, body.token || '');
    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) throw new HttpError(400, 'No files provided.');

    const remaining = link.max_files - link.upload_count;
    if (files.length > remaining) {
        throw new HttpError(400, `This link accepts ${remaining} more file(s).`);
    }

    const batchId = randomBytes(16).toString('hex');
    const maxBytes = link.max_file_mb * 1024 * 1024;

    const signed = [];
    for (const [index, file] of files.entries()) {
        const name = safeFileName(file.name || '');
        if (BLOCKED_EXT.test(name)) throw new HttpError(400, `${name}: that file type isn't accepted.`);
        if (file.type && !ALLOWED_MIME.test(file.type)) {
            throw new HttpError(400, `${name}: only images, video, PDFs and zips are accepted.`);
        }
        if ((file.size || 0) > maxBytes) {
            throw new HttpError(400, `${name} is larger than ${link.max_file_mb}MB.`);
        }

        const path = `${link.storage_prefix}/${batchId}/${String(index).padStart(3, '0')}-${name}`;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error) throw new HttpError(500, error.message);
        signed.push({ name, path, token: data.token });
    }

    return { batch_id: batchId, bucket: BUCKET, files: signed };
}

// --- Public: record a finished batch, mirror to Drive, notify the admin ---

async function mirrorToDrive(
    supabase: ServiceSupabaseClient,
    link: UploadLinkRow,
    file: { path: string; name: string; type?: string }
): Promise<{ id: string; url: string }> {
    const buffer = await downloadFromStorage(supabase, file.path);
    return uploadToDrive(link, file.name, file.type || 'application/octet-stream', buffer);
}

async function downloadFromStorage(supabase: ServiceSupabaseClient, path: string): Promise<Buffer> {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) throw new Error(error?.message || 'File missing from storage');
    return Buffer.from(await data.arrayBuffer());
}

async function uploadToDrive(
    link: UploadLinkRow,
    name: string,
    mimeType: string,
    buffer: Buffer
): Promise<{ id: string; url: string }> {
    if (!link.drive_folder_id) throw new Error('No Drive folder is attached to this link');
    const drive = await getDrive();
    const created = await drive.files.create({
        requestBody: { name, parents: [link.drive_folder_id] },
        media: { mimeType, body: Readable.from(buffer) },
        fields: 'id,webViewLink',
    });
    return {
        id: created.data.id!,
        url: created.data.webViewLink || `https://drive.google.com/file/d/${created.data.id}/view`,
    };
}

// --- White logos ---
//
// Every logo on the site sits on black, so colour logos are converted to a
// solid white mark on a transparent background. Two inputs show up:
//   - a PNG/WebP that already has transparency: keep the shape, paint it white;
//   - a flat JPG/PNG with a background: the background colour (read off the
//     border) goes transparent and everything that differs from it goes white,
//     so dark-on-light and light-on-dark both come out right.

const CONVERTIBLE = /^image\/(png|jpe?g|webp)$/i;
const LOGO_NAME = /logo|brand|mark|icon|wordmark|monogram/i;

function whiteNameFor(name: string): string {
    return `${name.replace(/\.[^.]+$/, '')}-white.png`;
}

async function hasTransparency(buffer: Buffer): Promise<boolean> {
    const { data, info } = await sharp(buffer, { failOn: 'none' })
        .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let clear = 0;
    for (let i = 3; i < data.length; i += info.channels) if (data[i] < 250) clear++;
    return clear / (info.width * info.height) > 0.01;
}

export async function makeWhiteLogo(buffer: Buffer): Promise<Buffer> {
    const { data, info } = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    let transparent = 0;
    for (let i = 3; i < data.length; i += channels) if (data[i] < 250) transparent++;
    const keepAlpha = transparent / (width * height) > 0.01;

    // Background luminance from the opaque border pixels.
    let bgSum = 0;
    let bgCount = 0;
    if (!keepAlpha) {
        for (let x = 0; x < width; x++) {
            for (const y of [0, height - 1]) { bgSum += lum((y * width + x) * channels); bgCount++; }
        }
        for (let y = 0; y < height; y++) {
            for (const x of [0, width - 1]) { bgSum += lum((y * width + x) * channels); bgCount++; }
        }
    }
    const bg = bgCount ? bgSum / bgCount : 255;
    // Distance at which a pixel counts as fully "ink". Halfway to the far end of
    // the range, so a mid-tone colour (red, blue) comes out solid white and only
    // anti-aliased edges stay soft.
    const solidAt = Math.max(24, Math.max(bg, 255 - bg) * 0.5);

    const out = Buffer.alloc(width * height * 4);
    for (let p = 0; p < width * height; p++) {
        const i = p * channels;
        const alpha = keepAlpha
            ? data[i + 3]
            : Math.min(255, Math.round((Math.abs(lum(i) - bg) / solidAt) * 255));
        out[p * 4] = 255;
        out[p * 4 + 1] = 255;
        out[p * 4 + 2] = 255;
        out[p * 4 + 3] = alpha;
    }

    const png = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
    try {
        return await sharp(png).trim().png().toBuffer();
    } catch {
        // trim() refuses an image that is entirely background; keep it untrimmed.
        return png;
    }
}

// Should this upload get a white copy without being asked? Images that already
// have transparency (almost always a logo) or are named like one. Anything else
// can be converted from the dashboard.
async function looksLikeLogo(name: string, mime: string | undefined, buffer: Buffer): Promise<boolean> {
    if (!mime || !CONVERTIBLE.test(mime)) return false;
    if (LOGO_NAME.test(name)) return true;
    try {
        return await hasTransparency(buffer);
    } catch {
        return false;
    }
}

// Write the white copy next to the original in Storage and in the Drive folder.
async function storeWhiteVersion(
    supabase: ServiceSupabaseClient,
    link: UploadLinkRow,
    original: { path: string; name: string },
    buffer: Buffer
) {
    const white = await makeWhiteLogo(buffer);
    const slash = original.path.lastIndexOf('/');
    const path = `${original.path.slice(0, slash)}/white/${whiteNameFor(original.path.slice(slash + 1))}`;
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, white, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(error.message);

    let drive: { id: string; url: string } | null = null;
    try {
        drive = await uploadToDrive(link, whiteNameFor(original.name), 'image/png', white);
    } catch (err: any) {
        console.error('[client-uploads] White logo Drive copy failed:', original.name, err?.message);
    }
    return {
        white_storage_path: path,
        white_drive_file_id: drive?.id || null,
        white_drive_view_url: drive?.url || null,
        white_error: drive ? null : 'White version is in storage but did not reach Drive',
    };
}

// Dashboard button: make (or remake) the white copy for one upload.
export async function makeWhite(supabase: ServiceSupabaseClient, requester: Requester, uploadId: string) {
    const { data: row, error } = await supabase
        .from('client_uploads')
        .select('*')
        .eq('id', uploadId || '')
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!row) throw new HttpError(404, 'Upload not found');
    const link = await loadOwnedLink(supabase, requester, row.link_id);
    if (!row.mime_type || !CONVERTIBLE.test(row.mime_type)) {
        throw new HttpError(400, 'Only PNG, JPG and WebP images can be converted.');
    }

    const buffer = await downloadFromStorage(supabase, row.storage_path);
    const fields = await storeWhiteVersion(supabase, link, { path: row.storage_path, name: row.file_name }, buffer);
    await supabase.from('client_uploads').update(fields).eq('id', row.id);
    return { ok: true, ...fields };
}

export async function recordBatch(
    supabase: ServiceSupabaseClient,
    body: {
        token?: string;
        batch_id?: string;
        note?: string;
        files?: Array<{ path?: string; name?: string; size?: number; type?: string }>;
    }
) {
    const link = await loadLinkByToken(supabase, body.token || '');
    const files = (body.files || []).filter(f => f.path && f.name);
    if (!files.length) throw new HttpError(400, 'No files to record.');

    // Only paths inside this link's own prefix — a token can't be used to claim
    // another client's objects.
    for (const file of files) {
        if (!file.path!.startsWith(`${link.storage_prefix}/`)) {
            throw new HttpError(400, 'Invalid file path.');
        }
    }

    const note = (body.note || '').trim().slice(0, 2000) || null;
    const rows = [];

    // Links made with defer_drive get their folder on the first upload. If
    // Drive is down, the files still land in Storage and the mirror can be
    // retried from the dashboard, same as a link whose folder failed.
    if (!link.drive_folder_id) {
        try {
            const folderName = link.project_name ? `${link.client_name} — ${link.project_name}` : `${link.client_name} — Uploads`;
            const folder = await createDriveFolder(folderName, await ensureOwnerFolder(supabase, await loadOwner(supabase, link.photographer_id)));
            const { data: claimed, error: saveErr } = await supabase
                .from('client_upload_links')
                .update({ drive_folder_id: folder.id, drive_folder_url: folder.url })
                .eq('id', link.id)
                .is('drive_folder_id', null)
                .select('drive_folder_id, drive_folder_url');
            if (saveErr) throw new Error(saveErr.message);
            if (claimed && claimed.length) {
                link.drive_folder_id = folder.id;
                link.drive_folder_url = folder.url;
            } else {
                // Another batch made the folder first: use theirs. Ours stays
                // empty in Drive, which is harmless.
                const { data: current } = await supabase
                    .from('client_upload_links')
                    .select('drive_folder_id, drive_folder_url')
                    .eq('id', link.id)
                    .single();
                link.drive_folder_id = current?.drive_folder_id || null;
                link.drive_folder_url = current?.drive_folder_url || null;
            }
        } catch (err: any) {
            console.error('[client-uploads] Deferred Drive folder failed:', err?.message);
        }
    }

    for (const file of files) {
        let driveId: string | null = null;
        let driveUrl: string | null = null;
        let status = 'pending';
        let driveError: string | null = null;
        let buffer: Buffer | null = null;
        try {
            buffer = await downloadFromStorage(supabase, file.path!);
            const mirrored = await uploadToDrive(link, file.name!, file.type || 'application/octet-stream', buffer);
            driveId = mirrored.id;
            driveUrl = mirrored.url;
            status = 'mirrored';
        } catch (err: any) {
            status = 'failed';
            driveError = err?.message || 'Drive mirror failed';
            console.error('[client-uploads] Drive mirror failed:', file.name, driveError);
        }

        // A failed conversion never fails the upload — the original is safe and
        // the white copy can be made again from the dashboard.
        let white: Record<string, string | null> = {};
        if (buffer && await looksLikeLogo(file.name!, file.type, buffer)) {
            try {
                white = await storeWhiteVersion(supabase, link, { path: file.path!, name: file.name! }, buffer);
            } catch (err: any) {
                white = { white_error: err?.message || 'White version failed' };
                console.error('[client-uploads] White logo failed:', file.name, white.white_error);
            }
        }

        rows.push({
            ...white,
            link_id: link.id,
            batch_id: body.batch_id || null,
            file_name: file.name!,
            mime_type: file.type || null,
            size_bytes: file.size || null,
            storage_path: file.path!,
            drive_file_id: driveId,
            drive_view_url: driveUrl,
            drive_status: status,
            drive_error: driveError,
            uploader_note: note,
        });
    }

    const { data: inserted, error } = await supabase.from('client_uploads').insert(rows).select();
    if (error) throw new HttpError(500, error.message);

    await supabase
        .from('client_upload_links')
        .update({
            upload_count: link.upload_count + rows.length,
            last_upload_at: new Date().toISOString(),
        })
        .eq('id', link.id);

    // The notification is the point of the feature — but a mail outage must not
    // make a successful upload look failed to the client.
    let emailed = false;
    try {
        emailed = await notifyOwnerOfUploads(link, await loadOwner(supabase, link.photographer_id), inserted as any[], note);
    } catch (err: any) {
        console.error('[client-uploads] Admin notification failed:', err?.message);
    }

    const failed = rows.filter(r => r.drive_status === 'failed').length;
    return { received: rows.length, drive_failed: failed, notified: emailed };
}

// --- Admin notification ---

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// The studio's own requests notify the admin inbox. A photographer's requests
// notify that photographer, with media@ on CC as the business record.
async function notifyOwnerOfUploads(
    link: UploadLinkRow,
    owner: PhotographerOwner | null,
    uploads: Array<{ file_name: string; drive_view_url: string | null; drive_status: string }>,
    note: string | null
): Promise<boolean> {
    const label = link.project_name ? `${link.client_name} — ${link.project_name}` : link.client_name;
    const dashboardUrl = owner
        ? `${SITE}/dashboard?section=contentrequests&link=${link.id}`
        : `${SITE}/admin?panel=clientuploads&link=${link.id}`;
    const folderUrl = link.drive_folder_url || dashboardUrl;
    const failed = uploads.filter(u => u.drive_status === 'failed');

    const fileList = uploads
        .map(u => {
            const name = escapeHtml(u.file_name);
            return u.drive_view_url
                ? `<li style="margin-bottom:6px;"><a href="${u.drive_view_url}" style="color:rgba(255,255,255,0.9);">${name}</a></li>`
                : `<li style="margin-bottom:6px;">${name} <span style="color:rgba(255,255,255,0.5);">(in storage, Drive mirror pending)</span></li>`;
        })
        .join('');

    const content = `
        <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0 0 20px 0;letter-spacing:0.1em;">NEW UPLOADS RECEIVED</h1>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">
          <strong>${escapeHtml(label)}</strong> sent ${uploads.length} file${uploads.length === 1 ? '' : 's'}.
        </p>
        ${note ? `<p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">“${escapeHtml(note)}”</p>` : ''}
        <p style="margin:0 0 24px 0;">
          <a href="${folderUrl}" style="display:inline-block;padding:14px 28px;background-color:#ffffff;color:#000000;text-decoration:none;font-weight:bold;font-size:16px;">OPEN THE DRIVE FOLDER</a>
        </p>
        <p style="margin:0 0 24px 0;">
          <a href="${dashboardUrl}" style="color:rgba(255,255,255,0.9);text-decoration:underline;">Review them in the dashboard →</a>
        </p>
        <ul style="color:#ffffff;font-size:15px;line-height:1.6;padding-left:20px;margin:0 0 24px 0;">${fileList}</ul>
        ${failed.length ? `<p style="color:#ffffff;font-size:15px;line-height:1.6;">${failed.length} file(s) did not reach Drive. They are safe in storage — retry the mirror from the dashboard.</p>` : ''}
    `;

    const result = await sendTransactionalEmail({
        to: owner?.email ? [owner.email, MEDIA_EMAIL] : ADMIN_NOTIFY_EMAIL,
        subject: `New uploads received — ${label} (${uploads.length} file${uploads.length === 1 ? '' : 's'})`,
        content,
    });
    if (!result.success) console.error('[client-uploads] Admin email failed:', result.error);
    return result.success;
}

// --- Admin: the invite email to the client ---

export async function sendInvite(
    supabase: ServiceSupabaseClient,
    requester: Requester,
    body: { id?: string; email?: string; message?: string }
) {
    const link = await loadOwnedLink(supabase, requester, body.id || '');
    const to = (body.email || link.client_email || '').trim();
    if (!to) throw new HttpError(400, 'No client email on file — add one first.');

    const url = uploadUrlFor(link.token);
    const custom = (body.message || '').trim();
    const expiryLine = link.expires_at
        ? `<p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;">This link works until ${new Date(link.expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</p>`
        : '';

    const content = `
        <h1 style="color:#ffffff;font-size:28px;font-weight:bold;margin:0 0 20px 0;letter-spacing:0.1em;">SEND US YOUR CONTENT</h1>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">Hi ${escapeHtml(link.client_name)},</p>
        <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;text-align:left;">
          ${custom ? escapeHtml(custom).replace(/\n/g, '<br>') : `Click the link below to send your content over — no account, no sign-in, just drop the files in. Photos, logos, a mood board, brand colors, anything you already have.<br><br>And if there's content sitting on your phone or a hard drive that has never made it onto a website, send that too. We can work it into the build.`}
        </p>
        <p style="margin:0 0 24px 0;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;background-color:#ffffff;color:#000000;text-decoration:none;font-weight:bold;font-size:16px;">SEND YOUR CONTENT</a>
        </p>
        <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.5;">Or paste this into your browser: ${url}</p>
        ${expiryLine}
    `;

    // media@ is the business address of record — it stays on the thread as a
    // visible recipient so client correspondence is on file.
    const result = await sendTransactionalEmail({
        to: [to, MEDIA_EMAIL],
        subject: `Send your content — ${link.project_name || 'THE LOST+UNFOUNDS'}`,
        content,
    });
    if (!result.success) throw new HttpError(502, result.error || 'Email failed to send');

    await supabase
        .from('client_upload_links')
        .update({ invited_at: new Date().toISOString(), client_email: to })
        .eq('id', link.id);

    return { sent: true, to, cc: MEDIA_EMAIL, provider: result.provider };
}

// --- Admin: browse what came in ---

export async function listUploads(supabase: ServiceSupabaseClient, requester: Requester, linkId: string) {
    await loadOwnedLink(supabase, requester, linkId);
    const { data, error } = await supabase
        .from('client_uploads')
        .select('*')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false });
    if (error) throw new HttpError(500, error.message);

    const uploads = data || [];
    // Signed previews so the admin can look at a private-bucket file without
    // making the bucket public.
    const withPreviews = await Promise.all(
        uploads.map(async (u: any) => {
            const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(u.storage_path, 3600);
            const { data: whiteSigned } = u.white_storage_path
                ? await supabase.storage.from(BUCKET).createSignedUrl(u.white_storage_path, 3600)
                : { data: null };
            return {
                ...u,
                preview_url: signed?.signedUrl || null,
                white_preview_url: whiteSigned?.signedUrl || null,
            };
        })
    );
    return withPreviews;
}

// Retry the Drive mirror for everything that failed on a link.
export async function retryMirror(supabase: ServiceSupabaseClient, requester: Requester, linkId: string) {
    const link = await loadOwnedLink(supabase, requester, linkId);

    if (!link.drive_folder_id) {
        const folderName = link.project_name
            ? `${link.client_name} — ${link.project_name}`
            : `${link.client_name} — Uploads`;
        const owner = await loadOwner(supabase, link.photographer_id);
        const folder = await createDriveFolder(folderName, await ensureOwnerFolder(supabase, owner));
        link.drive_folder_id = folder.id;
        await supabase
            .from('client_upload_links')
            .update({ drive_folder_id: folder.id, drive_folder_url: folder.url })
            .eq('id', link.id);
    }

    const { data: pending, error } = await supabase
        .from('client_uploads')
        .select('*')
        .eq('link_id', linkId)
        .neq('drive_status', 'mirrored');
    if (error) throw new HttpError(500, error.message);

    let fixed = 0;
    for (const row of pending || []) {
        try {
            const mirrored = await mirrorToDrive(supabase, link, {
                path: row.storage_path,
                name: row.file_name,
                type: row.mime_type || undefined,
            });
            await supabase
                .from('client_uploads')
                .update({
                    drive_file_id: mirrored.id,
                    drive_view_url: mirrored.url,
                    drive_status: 'mirrored',
                    drive_error: null,
                })
                .eq('id', row.id);
            fixed++;
        } catch (err: any) {
            await supabase
                .from('client_uploads')
                .update({ drive_status: 'failed', drive_error: err?.message || 'Drive mirror failed' })
                .eq('id', row.id);
        }
    }

    return { retried: (pending || []).length, mirrored: fixed };
}
