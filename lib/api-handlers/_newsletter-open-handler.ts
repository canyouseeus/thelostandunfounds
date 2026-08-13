import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Newsletter open tracking pixel.
 *
 * GET /api/newsletter/open?c=<campaignId>&e=<base64url email>
 *
 * ALWAYS returns a 1x1 transparent GIF, whatever happens. A tracking pixel that
 * can return an error is a tracking pixel that puts a broken-image icon in the
 * middle of a client's email. Recording the open is best-effort; serving the
 * image is not optional.
 *
 * The subscriber's address is base64url encoded rather than plain text so it is
 * not sitting in referrer headers and proxy logs in readable form. That is
 * obfuscation, not security: anyone can decode it. It is not used for
 * authorisation, only to attribute an open to a row we already have.
 */

// 1x1 fully transparent GIF.
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

function sendPixel(res: VercelResponse) {
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Content-Length', String(PIXEL.length))
  // Never let a proxy cache the pixel, or the second open is invisible.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  return res.status(200).send(PIXEL)
}

function decodeEmail(raw: string): string | null {
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
    const email = Buffer.from(b64, 'base64').toString('utf8')
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Record first, but never at the cost of the response.
  try {
    const campaignId = String(req.query.c || '')
    const email = decodeEmail(String(req.query.e || ''))

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)

    if (isUuid && email) {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (url && key) {
        const supabase = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        const forwarded = (req.headers['x-forwarded-for'] as string) || ''
        const ip = forwarded.split(',')[0].trim()

        await supabase.from('newsletter_opens').insert({
          campaign_id: campaignId,
          subscriber_email: email,
          user_agent: (req.headers['user-agent'] as string)?.slice(0, 500) || null,
          // Hashed, not stored raw: the IP adds nothing to an open rate and
          // storing it makes this table a liability it does not need to be.
          ip_hash: ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16) : null,
        })
      }
    }
  } catch (error) {
    console.error('[newsletter/open] failed to record open:', error)
  }

  return sendPixel(res)
}
