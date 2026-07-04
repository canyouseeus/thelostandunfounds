import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const STATUSES = ['active', 'draft']

/**
 * Product Cost Management API
 *
 * CRUD operations for product costs, extended to cover the full product
 * editor (name, description, price, category, image, status) so a single
 * row per product_id/source doubles as the persisted product-detail override.
 * Admin only
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // TODO: Add admin authentication check
  // const user = await getAuthenticatedUser(req)
  // if (!user || !user.isAdmin) {
  //   return res.status(403).json({ error: 'Forbidden' })
  // }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (req.method) {
      case 'GET':
        return handleGet(supabase as any, req, res)
      case 'POST':
        return handleCreate(supabase as any, req, res)
      case 'PUT':
        return handleUpdate(supabase as any, req, res)
      case 'DELETE':
        return handleDelete(supabase as any, req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in product-costs API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET - List all product costs or get specific one
 */
async function handleGet(
  supabase: ReturnType<typeof createClient>,
  req: VercelRequest,
  res: VercelResponse
) {
  const { productId, variantId, source } = req.query

  let query = supabase.from('product_costs').select('*')

  if (productId) {
    query = query.eq('product_id', productId as string)
  }
  if (variantId) {
    query = query.eq('variant_id', variantId as string)
  }
  if (source) {
    query = query.eq('source', source as string)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ data: data || [] })
}

/**
 * POST - Create new product cost / product detail override
 */
async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  req: VercelRequest,
  res: VercelResponse
) {
  const { productId, variantId, source, cost, name, description, price, category, imageUrl, status } = req.body

  if (!productId || !source || cost === undefined) {
    return res.status(400).json({ error: 'productId, source, and cost are required' })
  }

  if (cost < 0) {
    return res.status(400).json({ error: 'cost must be >= 0' })
  }

  if (price !== undefined && price !== null && price < 0) {
    return res.status(400).json({ error: 'price must be >= 0' })
  }

  if (status !== undefined && status !== null && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` })
  }

  const row: Record<string, unknown> = {
    product_id: productId,
    variant_id: variantId || null,
    source,
    cost: parseFloat(cost),
  }
  if (name !== undefined) row.name = name
  if (description !== undefined) row.description = description
  if (price !== undefined && price !== null) row.price = parseFloat(price)
  if (category !== undefined) row.category = category
  if (imageUrl !== undefined) row.image_url = imageUrl
  if (status !== undefined && status !== null) row.status = status

  const { data, error } = await supabase
    .from('product_costs')
    .insert(row as any)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Product cost already exists' })
    }
    return res.status(500).json({ error: error.message })
  }

  return res.status(201).json({ data: data as any })
}

/**
 * PUT - Update existing product cost / product detail override
 */
async function handleUpdate(
  supabase: ReturnType<typeof createClient>,
  req: VercelRequest,
  res: VercelResponse
) {
  const { id } = req.query
  const { cost, name, description, price, category, imageUrl, status } = req.body

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  if (cost !== undefined && cost < 0) {
    return res.status(400).json({ error: 'cost must be >= 0' })
  }

  if (price !== undefined && price !== null && price < 0) {
    return res.status(400).json({ error: 'price must be >= 0' })
  }

  if (status !== undefined && status !== null && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` })
  }

  const updates: Record<string, unknown> = {}
  if (cost !== undefined) updates.cost = parseFloat(cost)
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (price !== undefined) updates.price = price === null ? null : parseFloat(price)
  if (category !== undefined) updates.category = category
  if (imageUrl !== undefined) updates.image_url = imageUrl
  if (status !== undefined) updates.status = status

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  const { data, error } = await (supabase as any)
    .from('product_costs')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'Product cost not found' })
  }

  return res.status(200).json({ data: data as any })
}

/**
 * DELETE - Delete product cost
 */
async function handleDelete(
  supabase: ReturnType<typeof createClient>,
  req: VercelRequest,
  res: VercelResponse
) {
  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'id is required' })
  }

  const { error } = await supabase
    .from('product_costs')
    .delete()
    .eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}

