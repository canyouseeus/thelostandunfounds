import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { photoIds, email } = req.body

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be a non-empty array' })
    }

    if (!email) {
      return res.status(400).json({ error: 'email is required' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify photo IDs exist
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('id, title, google_drive_file_id, library_id')
      .in('id', photoIds)

    if (photoError || !photos || photos.length !== photoIds.length) {
      return res.status(400).json({ error: 'One or more invalid photo IDs' })
    }

    // Create a free order record
    const { data: order, error: orderError } = await supabase
      .from('photo_orders')
      .insert({
        email: email.toLowerCase(),
        total_amount_cents: 0,
        payment_status: 'free',
        paypal_order_id: `free_${Date.now()}_${Math.random().toString(36).substring(7)}`
      })
      .select()
      .single()

    if (orderError) {
      console.error('[FreeCheckout] Order error:', orderError)
      return res.status(500).json({ error: 'Failed to create order', details: orderError.message })
    }

    // Create entitlements for each photo
    const entitlements = photoIds.map((photoId: string) => ({
      order_id: order.id,
      photo_id: photoId,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    }))

    const { error: entError } = await supabase
      .from('photo_entitlements')
      .insert(entitlements)

    if (entError) {
      console.error('[FreeCheckout] Entitlement error:', entError)
      return res.status(500).json({ error: 'Failed to create entitlements', details: entError.message })
    }

    return res.status(200).json({
      orderId: order.id,
      photos: photos.map(p => ({
        id: p.id,
        title: p.title,
        google_drive_file_id: p.google_drive_file_id
      }))
    })

  } catch (error: any) {
    console.error('[FreeCheckout] Fatal error:', error)
    return res.status(500).json({ error: 'Free checkout failed', message: error.message })
  }
}
