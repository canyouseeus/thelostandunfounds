/**
 * GET /api/invoices/pdf?id=<invoiceId>&token=<pdf_token>
 *
 * Streams the branded TLAU quote / invoice PDF. The token (stored on the
 * invoice row) guards the endpoint so invoices are not enumerable. The PDF is
 * regenerated on each request from the invoice + client rows — no storage.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch {
  // .env.local is optional (present in local dev only)
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { generateInvoicePdf, InvoicePdfLineItem } from '../../lib/api-handlers/_invoice-pdf.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const id = (req.query.id as string | undefined) || ''
  const token = (req.query.token as string | undefined) || ''
  if (!id || !token) {
    return res.status(400).json({ error: 'id and token are required' })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }
    // Constant-ish guard: a missing/blank pdf_token must never match.
    if (!invoice.pdf_token || invoice.pdf_token !== token) {
      return res.status(403).json({ error: 'Invalid token' })
    }

    const client = (invoice as any).clients || null
    const lineItems: InvoicePdfLineItem[] = Array.isArray(invoice.line_items)
      ? invoice.line_items
      : []

    const total = Number(invoice.total || 0)
    const amountDue = invoice.amount_due != null ? Number(invoice.amount_due) : total

    let docType: 'QUOTE' | 'INVOICE' = 'INVOICE'
    let amountDueLabel = 'Amount Due'
    if (invoice.invoice_type === 'quote') {
      docType = 'QUOTE'
      const pct = total > 0 ? Math.round((amountDue / total) * 100) : 50
      amountDueLabel = `Deposit Due (${pct}%)`
    } else if (invoice.invoice_type === 'final') {
      amountDueLabel = 'Balance Due'
    }

    const pdf = await generateInvoicePdf({
      docType,
      invoiceNumber: invoice.invoice_number,
      date: invoice.date,
      eventDate: invoice.event_date,
      location: (invoice as any).location || null,
      description: invoice.description,
      lineItems,
      subtotal: Number(invoice.subtotal || 0),
      total,
      amountDueLabel,
      amountDue,
      paymentUrl: invoice.stripe_payment_link_url || null,
      clientName: client?.name || 'Client',
      clientBusiness: client?.business || null,
      clientEmail: client?.email || null,
      notes: null,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`)
    res.setHeader('Cache-Control', 'private, max-age=60')
    return res.status(200).send(pdf)
  } catch (err: any) {
    console.error('[invoices/pdf] error:', err)
    return res.status(500).json({ error: 'Failed to generate PDF', message: err?.message || String(err) })
  }
}
