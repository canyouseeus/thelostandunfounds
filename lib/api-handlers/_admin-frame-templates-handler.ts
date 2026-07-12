import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
    const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
    if (ADMIN_EMAILS.includes(email)) return true
    const host = req.headers.host || ''
    return host.includes('localhost') || host.includes('127.0.0.1')
}

function getSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) throw new Error('Database not configured')
    return createClient(supabaseUrl, supabaseKey)
}

/**
 * CRUD for print_frame_templates — the 4 admin-uploaded mockup photos
 * (black frame x landscape/portrait x mat/no-mat) used to composite a
 * customer's actual photo into a realistic preview. Admin only.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })

    try {
        const supabase = getSupabase()
        switch (req.method) {
            case 'GET': {
                const { data, error } = await supabase
                    .from('print_frame_templates')
                    .select('*')
                    .order('orientation', { ascending: true })
                    .order('has_mat', { ascending: true })
                if (error) return res.status(500).json({ error: error.message })
                return res.status(200).json({ data: data || [] })
            }
            case 'PUT': {
                const { id } = req.query
                if (!id) return res.status(400).json({ error: 'id is required' })

                const { templateUrl, bounds } = req.body || {}
                const updates: Record<string, unknown> = {}
                if (templateUrl !== undefined) updates.template_url = templateUrl
                if (bounds !== undefined) updates.bounds = bounds

                if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })

                const { data, error } = await (supabase as any)
                    .from('print_frame_templates')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()

                if (error) return res.status(500).json({ error: error.message })
                if (!data) return res.status(404).json({ error: 'Frame template not found' })
                return res.status(200).json({ data })
            }
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error: any) {
        console.error('❌ admin-frame-templates error:', error)
        return res.status(500).json({ error: error.message })
    }
}
