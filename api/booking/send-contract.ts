import { getAdminUser } from '../../lib/api-handlers/_admin-auth.js'
/**
 * POST /api/booking/send-contract
 *
 * Generates a photography services contract and emails it to the client.
 * Sent from media@thelostandunfounds.com via Zoho Mail.
 *
 * Body (JSON):
 *   clientName            string   — Client / company name
 *   clientEmail           string   — Where the contract is sent
 *   eventDate             string   — Human-readable date (e.g. "Saturday, April 19, 2026")
 *   locations             Array<{ name, address?, peakHours? }>
 *   totalPrice            number   — Total price in USD
 *   deliverablesPerLocation string — e.g. "10 photos + 1 reel"
 *   notes?                string
 *
 * Auth: verified Supabase admin session (Authorization: Bearer <token>).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateContract } from './contract-template.js'
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils.js'

const FROM_EMAIL = 'media@thelostandunfounds.com'
const FROM_NAME = 'THE LOST+UNFOUNDS'

async function isAdmin(req: VercelRequest): Promise<boolean> {
    // Verifies a real Supabase session; never trusts a header as identity.
    return (await getAdminUser(req)) !== null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const {
    clientName,
    clientEmail,
    eventDate,
    locations,
    totalPrice,
    deliverablesPerLocation,
    notes,
  } = req.body || {}

  // Validate required fields
  if (!clientName || !clientEmail || !eventDate || !locations || !totalPrice || !deliverablesPerLocation) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['clientName', 'clientEmail', 'eventDate', 'locations', 'totalPrice', 'deliverablesPerLocation'],
    })
  }

  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: 'locations must be a non-empty array' })
  }

  if (typeof totalPrice !== 'number' || totalPrice <= 0) {
    return res.status(400).json({ error: 'totalPrice must be a positive number' })
  }

  if (!clientEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid clientEmail' })
  }

  try {
    // Build the contract HTML
    const htmlContent = generateContract({
      clientName,
      clientEmail,
      eventDate,
      locations,
      totalPrice,
      deliverablesPerLocation,
      notes,
    })

    const auth = await getZohoAuthContext()
    const result = await sendZohoEmail({
      auth,
      to: clientEmail,
      subject: `Photography Services Agreement — ${FROM_NAME}`,
      htmlContent,
    })

    if (!result.success) {
      console.error('[send-contract] Zoho error:', result.error)
      return res.status(500).json({ error: 'Failed to send contract email', details: result.error })
    }

    console.log(`[send-contract] Contract sent to ${clientEmail} for ${clientName}`)
    return res.status(200).json({ success: true, sentTo: clientEmail })
  } catch (err: any) {
    console.error('[send-contract] Error:', err)
    return res.status(500).json({ error: 'Server error', message: err.message })
  }
}
