import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, siteOrigin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { ensureInvoicePaymentLink, InvoiceInputError } from '../../lib/api-handlers/_standalone-invoice.js'

import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
/**
 * Attach a Stripe Payment Link to an existing invoice.
 *
 * Booking quotes and final invoices get their links from create-quote /
 * create-final-invoice, but a standalone invoice (no booking — admin or
 * marketing work) had no way to get one: it was created as a row and could
 * only be paid in cash. This creates the single-use link for the invoice's
 * amount_due and stores it on the row, so the PDF shows the pay button and
 * the Stripe webhook settles the invoice by link id.
 *
 * It sends nothing. Emailing the client is a separate, deliberate step
 * (/api/invoices/send).
 *
 * Body: { invoiceNumber: string }
 */


export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const { invoiceNumber } = (req.body || {}) as { invoiceNumber?: string }
  if (!invoiceNumber) return res.status(400).json({ error: 'invoiceNumber is required' })

  try {
    return res.status(200).json(await ensureInvoicePaymentLink(getSupabaseAdmin(), invoiceNumber, siteOrigin(req)))
  } catch (err: any) {
    if (err instanceof InvoiceInputError) return res.status(err.status).json({ error: err.message })
    console.error('[create-payment-link] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create payment link' })
  }
}
