/**
 * POST /api/invoices/send
 *
 * Sends a branded invoice email to a client via Zoho Mail.
 *
 * Body (JSON):
 *   invoice_id  string   — UUID of the invoice to send
 *   to_email?   string   — Optional override (for testing). Falls back to client's email.
 *
 * Auth: verified admin session (Bearer token) or `x-admin-secret` — see lib/api-handlers/_admin-auth.ts.
 */


import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch (e) {}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendInvoiceEmail } from '../../lib/api-handlers/_invoice-send.js'
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const result = await sendInvoiceEmail(req.body || {})
  return res.status(result.status).json(result.body)
}
