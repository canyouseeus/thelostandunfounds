import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Server-side image proxy — fetches a remote image and returns it with proper
 * CORS headers so the browser's @imgly/background-removal WebAssembly can read it.
 *
 * Usage: GET /api/image-proxy?url=<encoded-image-url>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  let targetUrl: string
  try {
    targetUrl = decodeURIComponent(url)
    // Validate it's a proper https URL
    const parsed = new URL(targetUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Invalid protocol')
    }
  } catch {
    return res.status(400).json({ error: 'Invalid url parameter' })
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; thelostandunfounds/1.0)',
      },
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` })
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    return res.status(200).send(Buffer.from(buffer))
  } catch (err) {
    console.error('Image proxy error:', err)
    return res.status(500).json({ error: 'Failed to fetch image' })
  }
}
