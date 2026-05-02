import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { Readable } from 'stream';

const ADMIN_EMAILS = new Set([
    'thelostandunfounds@gmail.com',
    'admin@thelostandunfounds.com',
]);

const SIGNING_SECRET =
    process.env.ADMIN_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    '';

const FILE_ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

function isAdmin(req: VercelRequest): boolean {
    const headerEmail = (req.headers['x-admin-email'] as string | undefined) || '';
    const queryEmail = typeof req.query.adminEmail === 'string' ? req.query.adminEmail : '';
    const email = (headerEmail || queryEmail).toLowerCase().trim();
    return ADMIN_EMAILS.has(email);
}

function sign(fileId: string, exp: number): string {
    return crypto
        .createHmac('sha256', SIGNING_SECRET)
        .update(`${fileId}:${exp}`)
        .digest('hex');
}

function verifySig(fileId: string, exp: number, sig: string): boolean {
    if (!SIGNING_SECRET) return false;
    if (Number.isNaN(exp) || Date.now() > exp) return false;
    const expected = sign(fileId, exp);
    try {
        const a = Buffer.from(expected, 'hex');
        const b = Buffer.from(sig, 'hex');
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

async function getDriveAccessToken(): Promise<string | null> {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const saKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!saEmail || !saKey) return null;
    const { google } = await import('googleapis');
    const auth = new google.auth.JWT({
        email: saEmail,
        key: saKey,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const { token } = await auth.getAccessToken();
    return token || null;
}

interface DriveMetadata {
    id: string;
    name: string;
    size?: string;
    mimeType: string;
    createdTime?: string;
    modifiedTime?: string;
    md5Checksum?: string;
}

async function getDriveMetadata(fileId: string, token: string): Promise<DriveMetadata> {
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
        )}?fields=id,name,size,mimeType,createdTime,modifiedTime,md5Checksum&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`Drive metadata fetch failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return (await res.json()) as DriveMetadata;
}

function sanitizeFilename(name: string): string {
    return name.replace(/[\r\n"\\]/g, '').slice(0, 200) || 'download.bin';
}

function isWorkspaceMime(mime: string): boolean {
    return mime.startsWith('application/vnd.google-apps.');
}

function workspaceExportInfo(mime: string): { exportMime: string; ext: string } | null {
    switch (mime) {
        case 'application/vnd.google-apps.document':
            return {
                exportMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ext: 'docx',
            };
        case 'application/vnd.google-apps.spreadsheet':
            return {
                exportMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ext: 'xlsx',
            };
        case 'application/vnd.google-apps.presentation':
            return {
                exportMime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                ext: 'pptx',
            };
        case 'application/vnd.google-apps.drawing':
            return { exportMime: 'image/png', ext: 'png' };
        default:
            return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, Range');
        return res.status(200).end();
    }

    const action = (req.query.action as string) || 'info';
    const fileId = (req.query.fileId as string) || '';

    if (!fileId || !FILE_ID_RE.test(fileId)) {
        return res.status(400).json({ error: 'Valid fileId is required.' });
    }

    if (action === 'info') {
        if (!isAdmin(req)) {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        if (!SIGNING_SECRET) {
            return res.status(500).json({ error: 'Server signing secret not configured.' });
        }
        try {
            const token = await getDriveAccessToken();
            if (!token) {
                return res.status(500).json({
                    error:
                        'Google service account is not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).',
                });
            }
            const meta = await getDriveMetadata(fileId, token);
            const exp = Date.now() + 60 * 60 * 1000; // 1 hour
            const sig = sign(fileId, exp);
            const downloadUrl = `/api/admin/drive-download?action=stream&fileId=${encodeURIComponent(
                fileId
            )}&exp=${exp}&sig=${sig}`;
            return res.status(200).json({
                ...meta,
                isWorkspaceFile: isWorkspaceMime(meta.mimeType),
                downloadUrl,
                expiresAt: new Date(exp).toISOString(),
            });
        } catch (err: any) {
            console.error('[drive-download] info error:', err);
            return res.status(500).json({ error: err?.message || 'Lookup failed.' });
        }
    }

    if (action !== 'stream') {
        return res.status(400).json({ error: 'Unknown action.' });
    }

    const exp = Number(req.query.exp);
    const sig = (req.query.sig as string) || '';
    if (!exp || !sig || !verifySig(fileId, exp, sig)) {
        return res.status(403).json({ error: 'Invalid or expired download link.' });
    }

    try {
        const token = await getDriveAccessToken();
        if (!token) {
            return res.status(500).json({ error: 'Service account not configured.' });
        }

        const meta = await getDriveMetadata(fileId, token);
        let filename = sanitizeFilename(meta.name || `drive-${fileId}`);
        let driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
        )}?alt=media&supportsAllDrives=true`;

        if (isWorkspaceMime(meta.mimeType)) {
            const exportInfo = workspaceExportInfo(meta.mimeType);
            if (!exportInfo) {
                return res.status(415).json({
                    error: `Unsupported Google Workspace file type: ${meta.mimeType}`,
                });
            }
            driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
                fileId
            )}/export?mimeType=${encodeURIComponent(exportInfo.exportMime)}`;
            if (!filename.toLowerCase().endsWith(`.${exportInfo.ext}`)) {
                filename = `${filename}.${exportInfo.ext}`;
            }
        }

        // Forward Range header so phone download managers can resume / chunk large files.
        const upstreamHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };
        const rangeHeader = req.headers.range;
        if (typeof rangeHeader === 'string' && rangeHeader.startsWith('bytes=')) {
            upstreamHeaders.Range = rangeHeader;
        }

        const driveRes = await fetch(driveUrl, { headers: upstreamHeaders });

        if (driveRes.status >= 400) {
            const body = await driveRes.text();
            console.error('[drive-download] upstream error:', driveRes.status, body.slice(0, 300));
            return res.status(driveRes.status).json({
                error: `Drive fetch failed (${driveRes.status})`,
                details: body.slice(0, 300),
            });
        }

        const passThroughHeaders = [
            'content-type',
            'content-length',
            'content-range',
            'last-modified',
            'etag',
        ];
        for (const h of passThroughHeaders) {
            const v = driveRes.headers.get(h);
            if (v) res.setHeader(h, v);
        }
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
        res.status(driveRes.status);

        if (!driveRes.body) {
            return res.end();
        }

        const nodeStream = Readable.fromWeb(driveRes.body as any);

        await new Promise<void>((resolve, reject) => {
            const cleanup = () => {
                nodeStream.removeAllListeners();
            };
            nodeStream.on('error', (err) => {
                cleanup();
                reject(err);
            });
            res.on('close', () => {
                cleanup();
                nodeStream.destroy();
                resolve();
            });
            nodeStream.on('end', () => {
                cleanup();
                resolve();
            });
            nodeStream.pipe(res);
        });
    } catch (err: any) {
        console.error('[drive-download] stream error:', err);
        if (!res.headersSent) {
            return res.status(500).json({ error: err?.message || 'Stream failed.' });
        }
        try {
            res.end();
        } catch {
            /* ignore */
        }
    }
}
