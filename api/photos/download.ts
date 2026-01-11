import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

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
        const supabaseUrl = process.env.SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Verify token and get photo info
        const { data: entitlement, error: entitlementError } = await supabase
            .from('photo_entitlements')
            .select('*, photos!inner(google_drive_file_id, title)')
            .eq('token', token)
            .single()

        if (entitlementError || !entitlement) {
            return res.status(404).json({ error: 'Invalid or expired download token' })
        }

        // 2. Check expiration
        if (new Date(entitlement.expires_at) < new Date()) {
            return res.status(403).json({ error: 'Download link has expired' })
        }

        // 3. Optional: IP check or download count limit
        // if (entitlement.download_count >= 5) { ... }

        // 4. Update download count
        await supabase
            .from('photo_entitlements')
            .update({ download_count: entitlement.download_count + 1 })
            .eq('id', entitlement.id)

        // 5. Stream from Google Drive
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        })

        const drive = google.drive({ version: 'v3', auth })
        const fileId = entitlement.photos.google_drive_file_id

        const driveResponse = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        )

        // Set headers for download
        res.setHeader('Content-Type', driveResponse.headers['content-type'] || 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${entitlement.photos.title || 'photo'}.jpg"`);

        // Pipe the stream
        (driveResponse.data as any).pipe(res);

    } catch (error: any) {
        console.error('Download error:', error)
        return res.status(500).json({ error: 'Download failed' })
    }
}
