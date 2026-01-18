import { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { fileId } = req.query;

    if (!fileId || typeof fileId !== 'string') {
        return res.status(400).json({ error: 'fileId is required' });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Get file metadata to get mimeType and size
        const metadata = await drive.files.get({
            fileId,
            fields: 'mimeType, size, name',
        });

        const mimeType = metadata.data.mimeType;
        const size = metadata.data.size;

        // Set headers for streaming
        res.setHeader('Content-Type', mimeType || 'video/quicktime');
        if (size) res.setHeader('Content-Length', size);
        res.setHeader('Content-Disposition', `inline; filename="${metadata.data.name}"`);

        // Get the file content stream
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        response.data
            .on('error', (err) => {
                console.error('Error streaming file:', err);
                res.status(500).end();
            })
            .pipe(res);

    } catch (error: any) {
        console.error('[Stream API] Error:', error.message);
        res.status(500).json({ error: 'Failed to stream media' });
    }
}
