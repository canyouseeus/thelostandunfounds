import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/prodigi/print-catalog
 *
 * Public, unauthenticated: the fixed size/frame menu + mockup templates
 * used to drive the "Order Print" flow on any gallery photo. Anon key is
 * sufficient — both tables have public-select RLS policies scoped to
 * published rows only (status='active' / template_url IS NOT NULL).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Database not configured' })

    try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const [{ data: options, error: optionsError }, { data: templates, error: templatesError }] = await Promise.all([
            supabase.from('print_catalog_options').select('*').eq('status', 'active').order('sort_order', { ascending: true }),
            supabase.from('print_frame_templates').select('*').not('template_url', 'is', null),
        ])

        if (optionsError) return res.status(500).json({ error: optionsError.message })
        if (templatesError) return res.status(500).json({ error: templatesError.message })

        return res.status(200).json({ options: options || [], frameTemplates: templates || [] })
    } catch (error: any) {
        console.error('❌ print-catalog handler failed:', error)
        return res.status(500).json({ error: error.message })
    }
}
