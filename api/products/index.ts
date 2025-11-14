import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (req.method === 'GET') {
      // Get all available products (public)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return res.status(200).json({ products: data || [] })
    }

    if (req.method === 'POST') {
      // Create new product (requires auth)
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid authentication' })
      }

      const {
        title,
        description,
        price,
        compare_at_price,
        currency = 'USD',
        image_url,
        images = [],
        handle,
        fourthwall_product_id,
        fourthwall_url,
        available = true,
      } = req.body

      if (!title || !price || !handle) {
        return res.status(400).json({ error: 'Title, price, and handle are required' })
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          title,
          description,
          price: parseFloat(price),
          compare_at_price: compare_at_price ? parseFloat(compare_at_price) : null,
          currency,
          image_url,
          images: Array.isArray(images) ? images : [],
          handle,
          fourthwall_product_id,
          fourthwall_url,
          available,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      return res.status(201).json({ product: data })
    }

    if (req.method === 'PUT') {
      // Update product (requires auth)
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid authentication' })
      }

      const { id, ...updates } = req.body

      if (!id) {
        return res.status(400).json({ error: 'Product ID is required' })
      }

      // Check if user owns the product
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('created_by')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (existingProduct?.created_by && existingProduct.created_by !== user.id) {
        return res.status(403).json({ error: 'You can only update your own products' })
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          ...updates,
          price: updates.price ? parseFloat(updates.price) : undefined,
          compare_at_price: updates.compare_at_price ? parseFloat(updates.compare_at_price) : undefined,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return res.status(200).json({ product: data })
    }

    if (req.method === 'DELETE') {
      // Delete product (requires auth)
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid authentication' })
      }

      const { id } = req.query

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Product ID is required' })
      }

      // Check if user owns the product
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('created_by')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (existingProduct?.created_by && existingProduct.created_by !== user.id) {
        return res.status(403).json({ error: 'You can only delete your own products' })
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Products API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
