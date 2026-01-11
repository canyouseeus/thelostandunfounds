import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Check for specialized cron header from Vercel if in production
    const authHeader = req.headers['authorization']
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch all libraries that have a sync config (initially we'll hardcode or look for a specific folder metadata)
        // For now, let's sync Kattitude specifically or fetch all libraries
        const { data: libraries, error: libError } = await supabase
            .from('photo_libraries')
            .select('*')

        if (libError) throw libError

        // Google Auth
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        })
        const drive = google.drive({ version: 'v3', auth })

        let totalSynced = 0

        for (const library of libraries) {
            const folderId = library.gdrive_folder_id

            if (!folderId) {
                console.log(`Skipping library ${library.name}: No folder ID configured.`)
                continue
            }

            if (!folderId) continue

            console.log(`Syncing library: ${library.name} (${folderId})`)

            const response = await drive.files.list({
                q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
                fields: 'files(id, name, thumbnailLink)',
                pageSize: 1000,
            })

            const files = response.data.files || []

            for (const file of files) {
                if (!file.id || !file.name) continue

                const title = file.name.split('.').slice(0, -1).join('.')
                const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200')

                const { error: upsertError } = await supabase
                    .from('photos')
                    .upsert({
                        library_id: library.id,
                        google_drive_file_id: file.id,
                        title: title,
                        thumbnail_url: thumbnailUrl,
                        status: 'active',
                        price_cents: 500
                    }, {
                        onConflict: 'google_drive_file_id'
                    })

                if (!upsertError) totalSynced++
            }
        }

        return res.status(200).json({
            success: true,
            message: `Sync complete. Processed ${totalSynced} files across libraries.`,
        })

    } catch (error: any) {
        console.error('Cron Sync error:', error)
        return res.status(500).json({ error: 'Sync failed', details: error.message })
    }
}
