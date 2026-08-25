/**
 * Stream a remote file straight into Google Drive.
 *
 * Delivery from a photographer arrives as a WeTransfer link that expires in a
 * few days. Rescuing it means moving hundreds of megabytes into Drive, and the
 * Drive connector available to an agent session only accepts base64 in the
 * request — which caps it far below a single 150 MB clip. The credential to do
 * it properly (GOOGLE_REFRESH_TOKEN) already sits in Vercel, so the capability
 * was never missing; it was just on the wrong side of a transport limit.
 *
 * The upstream response body is piped straight into the Drive upload rather
 * than buffered, so memory stays flat regardless of file size and the function
 * is bounded by transfer time, not by the size of the file.
 *
 * Deliberately does NOT touch Supabase. Gallery sync is driven by rows in
 * photo_libraries pointing at specific folders; ingesting into a folder outside
 * those trees keeps the write off the database entirely — no rows, no egress.
 * Passing a parentId that IS a synced library folder will cause the next sync
 * to ingest the files, which is a decision for the caller, not this endpoint.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { Readable } from 'stream';

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];

function isAdmin(req: VercelRequest): boolean {
    const secret = req.headers['x-admin-secret'];
    if (secret && process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET) return true;
    const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase();
    if (ADMIN_EMAILS.includes(email)) return true;
    const host = req.headers.host || '';
    return host.includes('localhost') || host.includes('127.0.0.1');
}

/**
 * OAuth, not the service account. The service account owns its own Drive and
 * can only write where it has been explicitly shared; the refresh token acts as
 * the account that owns the destination folders. Matches drive-add.ts.
 */
function getDrive() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { url, fileName, parentId, mimeType } = (req.body || {}) as Record<string, string>;
    if (!url || !fileName || !parentId) {
        return res.status(400).json({ error: 'url, fileName and parentId are required' });
    }
    // Only pull over TLS — a plaintext source could be swapped in transit and we
    // would hand the result to a client as a delivered master.
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).json({ error: 'url is not a valid URL' });
    }
    if (parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'url must be https' });
    }

    try {
        const drive = getDrive();

        // Re-running a rescue must not double the folder. Drive happily keeps two
        // files with one name in a folder and nothing downstream would flag it.
        const escaped = fileName.replace(/'/g, "\\'");
        const { data: dupes } = await drive.files.list({
            q: `name = '${escaped}' and '${parentId}' in parents and trashed = false`,
            fields: 'files(id,name,size)',
        });
        if (dupes.files && dupes.files.length > 0) {
            const hit = dupes.files[0];
            return res.status(200).json({
                skipped: 'already present',
                fileId: hit.id,
                name: hit.name,
                size: Number(hit.size ?? 0),
            });
        }

        const upstream = await fetch(url);
        if (!upstream.ok || !upstream.body) {
            return res.status(502).json({
                error: `Upstream returned ${upstream.status}`,
                hint: 'A WeTransfer direct link expires a few hours after it is minted.',
            });
        }

        const created = await drive.files.create({
            requestBody: { name: fileName, parents: [parentId] },
            media: {
                mimeType: mimeType || upstream.headers.get('content-type') || 'application/octet-stream',
                // fetch() yields a DOM ReadableStream; Readable.fromWeb wants the
                // node:stream/web one. Structurally identical, nominally distinct.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body: Readable.fromWeb(upstream.body as any),
            },
            fields: 'id,name,size,mimeType,webViewLink',
        });

        // Report the state actually reached in Drive, not that the call returned.
        return res.status(200).json({
            fileId: created.data.id,
            name: created.data.name,
            size: Number(created.data.size ?? 0),
            mimeType: created.data.mimeType,
            webViewLink: created.data.webViewLink,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[drive-ingest] failed', message);
        return res.status(500).json({ error: message });
    }
}
