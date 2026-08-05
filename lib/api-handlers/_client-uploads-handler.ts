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
import type { VercelRequest } from '@vercel/node';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { createServiceSupabaseClient, type ServiceSupabaseClient } from './_supabase-admin-client.js';
import { sendTransactionalEmail } from './_resend-email-handler.js';

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
}

export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

export async function requireAdmin(req: VercelRequest, supabase: ServiceSupabaseClient) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new HttpError(401, 'Not authorized');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
        throw new HttpError(401, 'Not authorized');
    }
    return user;
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

function parentFolderId(): string | undefined {
    return process.env.CLIENT_UPLOADS_DRIVE_FOLDER_ID || process.env.DRIVE_FOLDER_ID || undefined;
}

async function createDriveFolder(name: string): Promise<{ id: string; url: string }> {
    const drive = await getDrive();
    const parent = parentFolderId();
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

// --- Link management (admin) ---

export async function listLinks(supabase: ServiceSupabaseClient) {
    const { data, error } = await supabase
        .from('client_upload_links')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw new HttpError(500, error.message);

    const links = (data || []) as UploadLinkRow[];
    return links.map(link => ({ ...link, upload_url: uploadUrlFor(link.token) }));
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
    }
) {
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
    try {
        drive = await createDriveFolder(folderName);
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
        })
        .select()
        .single();
    if (error) throw new HttpError(500, error.message);

    return { link: { ...(data as UploadLinkRow), upload_url: uploadUrlFor(token) }, drive_error: driveError };
}

export async function setLinkActive(supabase: ServiceSupabaseClient, id: string, isActive: boolean) {
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
    if (!link.drive_folder_id) throw new Error('No Drive folder is attached to this link');

    const { data, error } = await supabase.storage.from(BUCKET).download(file.path);
    if (error || !data) throw new Error(error?.message || 'File missing from storage');

    const buffer = Buffer.from(await data.arrayBuffer());
    const drive = await getDrive();
    const created = await drive.files.create({
        requestBody: { name: file.name, parents: [link.drive_folder_id] },
        media: { mimeType: file.type || 'application/octet-stream', body: Readable.from(buffer) },
        fields: 'id,webViewLink',
    });
    return {
        id: created.data.id!,
        url: created.data.webViewLink || `https://drive.google.com/file/d/${created.data.id}/view`,
    };
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

    for (const file of files) {
        let driveId: string | null = null;
        let driveUrl: string | null = null;
        let status = 'pending';
        let driveError: string | null = null;
        try {
            const mirrored = await mirrorToDrive(supabase, link, {
                path: file.path!,
                name: file.name!,
                type: file.type,
            });
            driveId = mirrored.id;
            driveUrl = mirrored.url;
            status = 'mirrored';
        } catch (err: any) {
            status = 'failed';
            driveError = err?.message || 'Drive mirror failed';
            console.error('[client-uploads] Drive mirror failed:', file.name, driveError);
        }

        rows.push({
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
        emailed = await notifyAdminOfUploads(link, inserted as any[], note);
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

async function notifyAdminOfUploads(
    link: UploadLinkRow,
    uploads: Array<{ file_name: string; drive_view_url: string | null; drive_status: string }>,
    note: string | null
): Promise<boolean> {
    const label = link.project_name ? `${link.client_name} — ${link.project_name}` : link.client_name;
    const folderUrl = link.drive_folder_url || `${SITE}/admin`;
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
          <a href="${SITE}/admin?panel=clientuploads&link=${link.id}" style="color:rgba(255,255,255,0.9);text-decoration:underline;">Review them in the dashboard →</a>
        </p>
        <ul style="color:#ffffff;font-size:15px;line-height:1.6;padding-left:20px;margin:0 0 24px 0;">${fileList}</ul>
        ${failed.length ? `<p style="color:#ffffff;font-size:15px;line-height:1.6;">${failed.length} file(s) did not reach Drive. They are safe in storage — retry the mirror from the dashboard.</p>` : ''}
    `;

    const result = await sendTransactionalEmail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `New uploads received — ${label} (${uploads.length} file${uploads.length === 1 ? '' : 's'})`,
        content,
    });
    if (!result.success) console.error('[client-uploads] Admin email failed:', result.error);
    return result.success;
}

// --- Admin: the invite email to the client ---

export async function sendInvite(
    supabase: ServiceSupabaseClient,
    body: { id?: string; email?: string; message?: string }
) {
    const { data, error } = await supabase
        .from('client_upload_links')
        .select('*')
        .eq('id', body.id || '')
        .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!data) throw new HttpError(404, 'Link not found');

    const link = data as UploadLinkRow;
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

export async function listUploads(supabase: ServiceSupabaseClient, linkId: string) {
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
            return { ...u, preview_url: signed?.signedUrl || null };
        })
    );
    return withPreviews;
}

// Retry the Drive mirror for everything that failed on a link.
export async function retryMirror(supabase: ServiceSupabaseClient, linkId: string) {
    const { data: linkData, error: linkErr } = await supabase
        .from('client_upload_links')
        .select('*')
        .eq('id', linkId)
        .maybeSingle();
    if (linkErr) throw new HttpError(500, linkErr.message);
    if (!linkData) throw new HttpError(404, 'Link not found');
    const link = linkData as UploadLinkRow;

    if (!link.drive_folder_id) {
        const folderName = link.project_name
            ? `${link.client_name} — ${link.project_name}`
            : `${link.client_name} — Uploads`;
        const folder = await createDriveFolder(folderName);
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
