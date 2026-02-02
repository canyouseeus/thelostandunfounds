
import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { GoogleAuth } from 'google-auth-library'
import { Readable } from 'stream'

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const { token } = req.query

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Download token is required' })
        }

        // Initialize Supabase
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Verify token and get photo info
        const { data: entitlement, error: entitlementError } = await supabase
            .from('photo_entitlements')
            .select('*, photos!inner(google_drive_file_id, title)')
            .eq('token', token)
            .single()

        if (entitlementError || !entitlement) {
            console.error('Entitlement lookup failed:', entitlementError || 'No entitlement found');
            return res.status(404).json({ error: 'Invalid or expired download token' })
        }

        // 2. Check expiration
        if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
            return res.status(403).json({ error: 'Download link has expired' })
        }

        // 4. Update download count (fire and forget to speed up)
        supabase
            .from('photo_entitlements')
            .update({ download_count: (entitlement.download_count || 0) + 1 })
            .eq('id', entitlement.id)
            .then(({ error }) => {
                if (error) console.error('Failed to update download count:', error);
            });

        // 5. Stream from Google Drive using GoogleAuth + Fetch (Lightweight)
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

        if (!clientEmail || !privateKey) {
            console.error('Missing Google credentials');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const auth = new GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        })

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const fileId = entitlement.photos.google_drive_file_id

        // Fetch file stream from Drive API
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken.token}`
            }
        });

        if (!driveRes.ok) {
            console.error('Google Drive API Error:', driveRes.status, await driveRes.text());
            return res.status(502).json({ error: 'Failed to retrieve file from storage' });
        }

        // Set headers for download
        const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
        // Sanitize filename
        const safeTitle = (entitlement.photos.title || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.jpg"`);

        // Pipe the stream
        if (!driveRes.body) {
            throw new Error('Failed to get stream body');
        }

        // Stream via generator or pipe
        // Node 18+ Web Streams to Node Response
        // @ts-ignore
        const nodeStream = Readable.fromWeb(driveRes.body);
        nodeStream.pipe(res);

    } catch (error: any) {
        console.error('Download error:', error)
        return res.status(500).json({ error: 'Download failed', details: error.message })
    }
}
