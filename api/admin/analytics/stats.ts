import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Analytics Stats Endpoint
 * Retrieves analytics data for admin dashboard
 * 
 * GET /api/admin/analytics/stats
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        const { data: analytics, error } = await supabase
            .from('user_analytics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            // If table doesn't exist, return empty array
            if (error.code === '42P01') {
                return res.status(200).json({ success: true, analytics: [] })
            }
            throw error
        }

        return res.status(200).json({ success: true, analytics })
    } catch (error: any) {
        console.error('[Analytics Stats] Error:', error)
        return res.status(500).json({ error: error.message })
    }
}
