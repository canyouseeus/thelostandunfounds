/**
 * Stream one playlist track out of Drive.
 *
 * This route authenticates as the account that owns the Drive, so whatever
 * fileId it is handed, it can fetch. It used to pass that id straight through:
 * anyone who knew or guessed the id of any file in that Drive could pull it
 * down through a public URL, and nothing about the request had to look like
 * music. Confirmed by fetching a Photoshop document and a camera JPEG through
 * it — neither is a track, both came back 200.
 *
 * The fix is an allowlist rather than a credential check. The player sets
 * `audio.src` directly and an <audio> element cannot send an Authorization
 * header, so a bearer token would close the hole by breaking playback. Instead
 * the id has to already be in `admin_playlist`, which only the service role can
 * write — so the route reaches exactly the tracks that were deliberately added
 * and nothing else in the Drive. The mimeType check behind it means a row
 * naming a non-audio file still will not stream.
 */
import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

/** True only if this exact id is a track on the admin playlist. */
async function isPlaylistTrack(fileId: string): Promise<boolean> {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    // No credentials means the allowlist cannot be consulted. Refuse rather
    // than fall through to serving the file — a misconfigured environment must
    // not silently reopen the hole this closes.
    if (!url || !key) {
        console.error('[Music Stream] Supabase credentials missing; refusing to stream.');
        return false;
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
        .from('admin_playlist')
        .select('id')
        .eq('google_drive_file_id', fileId)
        .limit(1);

    if (error) {
        console.error('[Music Stream] Allowlist lookup failed:', error.message);
        return false;
    }
    return Array.isArray(data) && data.length > 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { fileId } = req.query;

    if (!fileId || typeof fileId !== 'string') {
        return res.status(400).json({ error: 'fileId is required' });
    }

    if (!(await isPlaylistTrack(fileId))) {
        // Deliberately the same message whatever the reason, so the response
        // cannot be used to probe which ids exist in the Drive.
        return res.status(403).json({ error: 'Not a playlist track' });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const metadata = await drive.files.get({
            fileId,
            fields: 'mimeType,size,name',
        });

        const mimeType = metadata.data.mimeType || 'audio/mpeg';
        const fileSize = parseInt(metadata.data.size || '0', 10);
        const fileName = metadata.data.name || 'audio';

        // Second gate, behind the allowlist: a playlist row that points at
        // something other than audio still does not stream.
        if (!mimeType.startsWith('audio/')) {
            console.warn('[Music Stream] Refusing non-audio track:', { fileId, mimeType });
            return res.status(403).json({ error: 'Not a playlist track' });
        }

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

        const rangeHeader = req.headers['range'];

        if (rangeHeader && fileSize) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                const chunkSize = end - start + 1;

                res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
                res.setHeader('Content-Length', chunkSize);
                res.status(206);

                const rangeResponse = await drive.files.get(
                    { fileId, alt: 'media' },
                    {
                        responseType: 'stream',
                        headers: { Range: `bytes=${start}-${end}` },
                    }
                );

                rangeResponse.data
                    .on('error', (err) => {
                        console.error('[Music Stream] Range error:', err);
                        if (!res.headersSent) res.status(500).end();
                    })
                    .pipe(res);
                return;
            }
        }

        if (fileSize) res.setHeader('Content-Length', fileSize);

        const fullResponse = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        fullResponse.data
            .on('error', (err) => {
                console.error('[Music Stream] Stream error:', err);
                if (!res.headersSent) res.status(500).end();
            })
            .pipe(res);

    } catch (error: any) {
        console.error('[Music Stream] Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream audio' });
        }
    }
}
