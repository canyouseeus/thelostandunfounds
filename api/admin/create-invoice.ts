import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, siteOrigin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { createStandaloneInvoice, InvoiceInputError } from '../../lib/api-handlers/_standalone-invoice.js'

import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
/**
 * Create a standalone invoice (no booking) as an `invoices` row.
 *
 * The admin New Invoice form does this from a signed-in browser session, so an
 * agent working without one had no way to bill a job that never went through
 * the booking funnel. This is the same insert, server-side: find-or-create the
 * client by email, assign the next INV number, store the line items, set a
 * pdf_token so /api/invoices/pdf renders it.
 *
 * It sends nothing and creates no payment link. Those are separate, deliberate
 * steps: /api/admin/create-payment-link, then /api/invoices/send.
 *
 * Body: {
 *   clientName: string, clientEmail: string, clientPhone?: string,
 *   description: string,          — scope of work, deliverables, turnaround
 *   eventDate?: string,           — YYYY-MM-DD
 *   lineItems: { description, quantity?, unit_price }[]
 * }
 */


export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const invoice = await createStandaloneInvoice(getSupabaseAdmin(), req.body || {}, siteOrigin(req))
    return res.status(200).json(invoice)
  } catch (err: any) {
    if (err instanceof InvoiceInputError) return res.status(err.status).json({ error: err.message })
    console.error('[create-invoice] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create invoice' })
  }
}
