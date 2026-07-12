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
 * CRUD for print_catalog_options — the universal size/frame menu used by
 * the "Order Print" flow on every gallery photo (distinct from the curated
 * prodigi_products catalog managed by _admin-prodigi-products-handler.ts).
 * Admin only.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' })

    try {
        const supabase = getSupabase()
        switch (req.method) {
            case 'GET': {
                const { data, error } = await supabase.from('print_catalog_options').select('*').order('sort_order', { ascending: true })
                if (error) return res.status(500).json({ error: error.message })
                return res.status(200).json({ data: data || [] })
            }
            case 'PUT': {
                const { id } = req.query
                if (!id) return res.status(400).json({ error: 'id is required' })

                const { sizeLabel, widthIn, heightIn, framed, frameColor, matAvailable, skuLandscape, skuPortrait, baseCost, price, currency, shippingMethod, sortOrder, status } = req.body || {}

                const updates: Record<string, unknown> = {}
                if (sizeLabel !== undefined) updates.size_label = sizeLabel
                if (widthIn !== undefined) updates.width_in = parseFloat(widthIn)
                if (heightIn !== undefined) updates.height_in = parseFloat(heightIn)
                if (framed !== undefined) updates.framed = !!framed
                if (frameColor !== undefined) updates.frame_color = frameColor
                if (matAvailable !== undefined) updates.mat_available = !!matAvailable
                if (skuLandscape !== undefined) updates.sku_landscape = skuLandscape
                if (skuPortrait !== undefined) updates.sku_portrait = skuPortrait
                if (baseCost !== undefined) updates.base_cost = parseFloat(baseCost)
                if (price !== undefined) updates.price = parseFloat(price)
                if (currency !== undefined) updates.currency = currency
                if (shippingMethod !== undefined) updates.shipping_method = shippingMethod
                if (sortOrder !== undefined) updates.sort_order = parseInt(sortOrder, 10)
                if (status !== undefined) updates.status = status

                if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })

                const { data, error } = await (supabase as any)
                    .from('print_catalog_options')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()

                if (error) return res.status(500).json({ error: error.message })
                if (!data) return res.status(404).json({ error: 'Print option not found' })
                return res.status(200).json({ data })
            }
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error: any) {
        console.error('❌ admin-print-catalog error:', error)
        return res.status(500).json({ error: error.message })
    }
}
