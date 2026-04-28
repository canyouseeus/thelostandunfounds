import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

function getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
}

function extractDriveFolderId(url: string): string | null {
    const m = url.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : null;
}

function extractDriveFileId(url: string): string | null {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
        /[?&]id=([a-zA-Z0-9_-]{20,})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function extractTitleArtist(rawName: string): { title: string; artist: string } {
    const nameNoExt = rawName.replace(/\.[^.]+$/, '');
    const sep = nameNoExt.indexOf(' - ');
    if (sep !== -1) {
        return {
            artist: nameNoExt.substring(0, sep).trim(),
            title: nameNoExt.substring(sep + 3).trim(),
        };
    }
    return { title: nameNoExt.trim(), artist: '' };
}

interface DriveCandidate {
    id: string;
    name: string;
    mimeType: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'url is required' });
    }

    const folderId = extractDriveFolderId(url);
    const fileId = !folderId ? extractDriveFileId(url) : null;

    if (!folderId && !fileId) {
        return res.status(400).json({
            error: 'Could not extract a Drive file or folder ID from the URL.',
        });
    }

    const drive = google.drive({ version: 'v3', auth: getOAuth2Client() });
    const supabase = createClient(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        let candidates: DriveCandidate[] = [];

        if (folderId) {
            const list = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false and mimeType contains 'audio/'`,
                fields: 'files(id,name,mimeType)',
                pageSize: 1000,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            candidates = (list.data.files || [])
                .filter((f) => f.id && f.name && f.mimeType)
                .map((f) => ({ id: f.id!, name: f.name!, mimeType: f.mimeType! }));
        } else if (fileId) {
            const meta = await drive.files.get({
                fileId,
                fields: 'id,name,mimeType',
                supportsAllDrives: true,
            });
            const f = meta.data;
            if (!f.mimeType || !f.mimeType.startsWith('audio/')) {
                return res.status(400).json({
                    error: `File is not audio (mimeType: ${f.mimeType || 'unknown'}).`,
                });
            }
            candidates = [{ id: f.id!, name: f.name || 'Unknown', mimeType: f.mimeType }];
        }

        if (candidates.length === 0) {
            return res.status(404).json({
                error: folderId
                    ? 'No audio files found in this Drive folder.'
                    : 'No audio file found.',
            });
        }

        const { data: existing } = await supabase
            .from('admin_playlist')
            .select('file_id')
            .in(
                'file_id',
                candidates.map((c) => c.id)
            );
        const existingIds = new Set<string>(
            (existing || []).map((r: any) => r.file_id as string)
        );

        const toInsert = candidates
            .filter((c) => !existingIds.has(c.id))
            .map((c) => {
                const { title, artist } = extractTitleArtist(c.name);
                return {
                    title,
                    artist,
                    file_id: c.id,
                    duration: null,
                    source_url: `https://drive.google.com/file/d/${c.id}/view`,
                };
            });

        let inserted: any[] = [];
        if (toInsert.length > 0) {
            const { data, error } = await supabase
                .from('admin_playlist')
                .insert(toInsert)
                .select();
            if (error) throw new Error(`DB insert failed: ${error.message}`);
            inserted = data || [];
        }

        return res.status(200).json({
            added: inserted.length,
            skipped: candidates.length - toInsert.length,
            tracks: inserted,
        });
    } catch (error: any) {
        console.error('[Drive Add] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to add Drive content' });
    }
}
