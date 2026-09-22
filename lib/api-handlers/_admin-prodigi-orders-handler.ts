import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { getAdminUser } from './_admin-auth.js'


async function isAdmin(req: VercelRequest): Promise<boolean> {
    // Verifies a real Supabase session; never trusts a header as identity.
    return (await getAdminUser(req)) !== null
}

/**
 * GET /api/admin/prodigi-orders — list recent Prodigi fulfillment orders for
 * the admin dashboard (status, tracking, recipient). Admin only, read-only.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (!(await isAdmin(req))) return res.status(403).json({ error: 'Admin access required' })
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Database not configured' })

    try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data, error } = await supabase
            .from('prodigi_orders')
            .select('*, prodigi_products(title, sku)')
            .order('created_at', { ascending: false })
            .limit(200)

        if (error) return res.status(500).json({ error: error.message })
        return res.status(200).json({ data: data || [] })
    } catch (error: any) {
        console.error('❌ admin-prodigi-orders error:', error)
        return res.status(500).json({ error: error.message })
    }
}
