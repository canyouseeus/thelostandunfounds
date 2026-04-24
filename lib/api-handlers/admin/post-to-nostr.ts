import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { finalizeEvent, nip19 } from 'nostr-tools'
import WebSocket from 'ws'

const SITE_URL = 'https://thelostandunfounds.com'

const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.wine',
]

function publishToRelay(relayUrl: string, event: any): Promise<{ relay: string; ok: boolean; message?: string }> {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      try { ws.close() } catch {}
      resolve({ relay: relayUrl, ok: false, message: 'timeout' })
    }, 8000)

    let ws: WebSocket
    try {
      ws = new WebSocket(relayUrl)
    } catch (err: any) {
      clearTimeout(timeout)
      return resolve({ relay: relayUrl, ok: false, message: err.message })
    }

    ws.on('open', () => {
      ws.send(JSON.stringify(['EVENT', event]))
    })

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg[0] === 'OK' && msg[1] === event.id) {
          clearTimeout(timeout)
          ws.close()
          resolve({ relay: relayUrl, ok: msg[2] === true, message: msg[3] })
        }
      } catch {}
    })

    ws.on('error', (err: any) => {
      clearTimeout(timeout)
      resolve({ relay: relayUrl, ok: false, message: err.message })
    })
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  const NOSTR_SECRET_KEY = process.env.NOSTR_SECRET_KEY

  if (!NOSTR_SECRET_KEY) {
    return res.status(500).json({ error: 'NOSTR_SECRET_KEY environment variable is not set' })
  }

  const { photoIds, caption } = req.body || {}

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({ error: 'photoIds array is required' })
  }

  // Decode nsec to raw secret key bytes
  let secretKeyBytes: Uint8Array
  try {
    const decoded = nip19.decode(NOSTR_SECRET_KEY)
    if (decoded.type !== 'nsec') {
      return res.status(500).json({ error: 'NOSTR_SECRET_KEY must be an nsec-encoded key' })
    }
    secretKeyBytes = decoded.data as Uint8Array
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to decode NOSTR_SECRET_KEY: ${err.message}` })
  }

  // Fetch photos from Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select('id, title, google_drive_file_id, thumbnail_url')
    .in('id', photoIds)

  if (fetchError) {
    return res.status(500).json({ error: `Failed to fetch photos: ${fetchError.message}` })
  }

  if (!photos || photos.length === 0) {
    return res.status(404).json({ error: 'No photos found for the given IDs' })
  }

  // Build image URLs
  const imageUrls: string[] = photos.map((photo: any) => {
    if (photo.google_drive_file_id) {
      return `${SITE_URL}/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=1600`
    }
    return photo.thumbnail_url || ''
  }).filter(Boolean)

  if (imageUrls.length === 0) {
    return res.status(400).json({ error: 'None of the selected photos have accessible URLs' })
  }

  // Build Nostr event content
  const imageLines = imageUrls.map(url => url).join('\n')
  const content = caption
    ? `${caption}\n\n${imageLines}`
    : imageLines

  // Build NIP-92 imeta tags for each image
  const imetaTags = imageUrls.map(url => ['imeta', `url ${url}`])

  const eventTemplate = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: imetaTags,
    content,
  }

  const signedEvent = finalizeEvent(eventTemplate, secretKeyBytes)

  // Publish to all relays concurrently
  const results = await Promise.allSettled(
    RELAYS.map(relay => publishToRelay(relay, signedEvent))
  )

  const relayResults = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { relay: RELAYS[i], ok: false, message: r.reason?.message }
  })

  const successCount = relayResults.filter(r => r.ok).length

  return res.status(200).json({
    success: successCount > 0,
    eventId: signedEvent.id,
    publishedTo: successCount,
    totalRelays: RELAYS.length,
    relays: relayResults,
  })
}
