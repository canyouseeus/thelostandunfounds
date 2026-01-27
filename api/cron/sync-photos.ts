import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { syncGalleryPhotos } from '../lib/api-handlers/_photo-sync-utils'

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

        // 1. Fetch all libraries
        const { data: libraries, error: libError } = await supabase
            .from('photo_libraries')
            .select('slug, name')

        if (libError) throw libError

        let totalSynced = 0
        const results = []

        for (const library of libraries) {
            console.log(`Syncing library: ${library.name} (${library.slug})`)

            try {
                // Sync up to 1000 photos per library per run
                const result = await syncGalleryPhotos(library.slug, 1000)
                totalSynced += result.synced
                results.push({ library: library.name, ...result })
            } catch (err: any) {
                console.error(`Failed to sync library ${library.name}:`, err)
                results.push({ library: library.name, error: err.message })
            }
        }

        return res.status(200).json({
            success: true,
            message: `Sync cycle complete. Processed ${totalSynced} files.`,
            details: results
        })

    } catch (error: any) {
        console.error('Cron Sync error:', error)
        return res.status(500).json({ error: 'Sync failed', details: error.message })
    }
}
