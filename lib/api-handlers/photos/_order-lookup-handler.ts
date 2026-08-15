import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Look up an order's photos for the download portal.
 *
 * The portal used to query photo_orders and photo_entitlements straight from
 * the browser, which RLS blocks for an anonymous visitor; every lookup came
 * back empty and the page said "Order not found", including for the person
 * whose order it was. Delivery links have to work for someone who is not
 * signed in; that is the entire point of them.
 *
 * The order id is a UUID and the address must match it, so the pair is the
 * credential. Neither is guessable, and knowing one without the other returns
 * nothing.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const orderId = (req.query.orderId as string || '').trim()
  const email = (req.query.email as string || '').trim().toLowerCase()

  if (!orderId || !email) {
    return res.status(400).json({ error: 'orderId and email are required' })
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Server configuration error' })

  try {
    const supabase = createClient(url, key)

    const { data: order } = await supabase
      .from('photo_orders')
      .select('id, created_at, email')
      .eq('id', orderId)
      .eq('email', email)
      .maybeSingle()

    if (!order) {
      // Deliberately identical whether the order is missing or the address is
      // wrong: otherwise this confirms which orders exist to anyone probing.
      return res.status(404).json({ error: 'Order not found or email does not match.' })
    }

    const { data: entitlements, error: entError } = await supabase
      .from('photo_entitlements')
      .select('photo_id, token, expires_at, photos (id, title, google_drive_file_id, mime_type, storage_path, thumbnail_url)')
      .eq('order_id', orderId)

    if (entError) throw new Error(entError.message)

    const photos = (entitlements || [])
      .map((e: any) => {
        const photo = Array.isArray(e.photos) ? e.photos[0] : e.photos
        if (!photo) return null
        return { ...photo, download_token: e.token, expires_at: e.expires_at }
      })
      .filter(Boolean)

    return res.status(200).json({
      orderId: order.id,
      email: order.email,
      createdAt: order.created_at,
      count: photos.length,
      photos,
    })
  } catch (err: any) {
    console.error('[order-lookup] failed:', err)
    return res.status(500).json({ error: 'Lookup failed' })
  }
}
