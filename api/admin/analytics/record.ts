import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Analytics Record Endpoint
 * Records page views and user events for analytics tracking
 * 
 * POST /api/admin/analytics/record
 * Body: { event_type, resource_id?, metadata?, duration?, user_id? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        const { user_id, event_type, resource_id, metadata, duration } = req.body || {}

        if (!event_type) {
            return res.status(400).json({ error: 'event_type is required' })
        }

        const { data, error } = await supabase
            .from('user_analytics')
            .insert({
                user_id: user_id || null,
                event_type,
                resource_id: resource_id || null,
                metadata: metadata || {},
                duration: duration || null
            })
            .select()
            .single()

        if (error) {
            // If table doesn't exist, just log and return success (non-blocking analytics)
            if (error.code === '42P01') {
                console.warn('[Analytics] user_analytics table does not exist. Skipping.')
                return res.status(200).json({ success: true, skipped: true })
            }
            throw error
        }

        return res.status(200).json({ success: true, data })
    } catch (error: any) {
        console.error('[Analytics Record] Error:', error)
        // Analytics should not block user experience - return 200 even on error
        return res.status(200).json({ success: false, error: error.message })
    }
}
