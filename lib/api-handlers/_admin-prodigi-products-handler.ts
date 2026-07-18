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
 * CRUD for the Prodigi print catalog (prodigi_products). Admin only.
 * GET: list all rows (including drafts — admin sees everything).
 * POST: create a row.
 * PUT: update a row by ?id=.
 * DELETE: remove a row by ?id=.
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
            case 'GET':
                return handleGet(supabase, req, res)
            case 'POST':
                return handleCreate(supabase, req, res)
            case 'PUT':
                return handleUpdate(supabase, req, res)
            case 'DELETE':
                return handleDelete(supabase, req, res)
            default:
                return res.status(405).json({ error: 'Method not allowed' })
        }
    } catch (error: any) {
        console.error('❌ admin-prodigi-products error:', error)
        return res.status(500).json({ error: error.message })
    }
}

async function handleGet(supabase: any, req: VercelRequest, res: VercelResponse) {
    const { data, error } = await supabase
        .from('prodigi_products')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data: data || [] })
}

async function handleCreate(supabase: any, req: VercelRequest, res: VercelResponse) {
    const { sku, slug, title, description, category, imageUrl, mockupTemplateUrl, mockupBounds, baseCost, price, currency, attributes, shippingMethod, featured, status } = req.body || {}

    if (!sku || !slug || !title || price === undefined || price === null) {
        return res.status(400).json({ error: 'sku, slug, title, and price are required' })
    }
    if (Number(price) < 0 || (baseCost !== undefined && Number(baseCost) < 0)) {
        return res.status(400).json({ error: 'price and baseCost must be >= 0' })
    }

    const { data, error } = await supabase
        .from('prodigi_products')
        .insert({
            sku,
            slug,
            title,
            description: description || null,
            category: category || 'prints',
            image_url: imageUrl || null,
            mockup_template_url: mockupTemplateUrl || null,
            mockup_bounds: mockupBounds || null,
            base_cost: baseCost !== undefined ? parseFloat(baseCost) : 0,
            price: parseFloat(price),
            currency: currency || 'USD',
            attributes: attributes || {},
            shipping_method: shippingMethod || 'Standard',
            featured: !!featured,
            status: status || 'draft',
        })
        .select()
        .single()

    if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'A product with that SKU or slug already exists' })
        return res.status(500).json({ error: error.message })
    }
    return res.status(201).json({ data })
}

async function handleUpdate(supabase: any, req: VercelRequest, res: VercelResponse) {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })

    const { sku, slug, title, description, category, imageUrl, mockupTemplateUrl, mockupBounds, baseCost, price, currency, attributes, shippingMethod, featured, status, stripeProductId, stripePriceId } = req.body || {}

    const updates: Record<string, unknown> = {}
    if (sku !== undefined) updates.sku = sku
    if (slug !== undefined) updates.slug = slug
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category
    if (imageUrl !== undefined) updates.image_url = imageUrl
    if (mockupTemplateUrl !== undefined) updates.mockup_template_url = mockupTemplateUrl
    if (mockupBounds !== undefined) updates.mockup_bounds = mockupBounds
    if (baseCost !== undefined) updates.base_cost = parseFloat(baseCost)
    if (price !== undefined) updates.price = parseFloat(price)
    if (currency !== undefined) updates.currency = currency
    if (attributes !== undefined) updates.attributes = attributes
    if (shippingMethod !== undefined) updates.shipping_method = shippingMethod
    if (featured !== undefined) updates.featured = !!featured
    if (status !== undefined) updates.status = status
    if (stripeProductId !== undefined) updates.stripe_product_id = stripeProductId
    if (stripePriceId !== undefined) updates.stripe_price_id = stripePriceId

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' })

    const { data, error } = await (supabase as any)
        .from('prodigi_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Product not found' })
    return res.status(200).json({ data })
}

async function handleDelete(supabase: any, req: VercelRequest, res: VercelResponse) {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })
    const { error } = await supabase.from('prodigi_products').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
}
