import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { fileId } = req.query;

    if (!fileId || typeof fileId !== 'string') {
        return res.status(400).json({ error: 'fileId is required' });
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
