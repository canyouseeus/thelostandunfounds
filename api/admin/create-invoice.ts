import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  getSupabaseAdmin,
  nextInvoiceNumber,
  randomToken,
  siteOrigin,
  upsertClientForBooking,
} from '../../lib/api-handlers/_booking-payment-utils.js'

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


interface LineItemInput {
  description?: string
  quantity?: number
  unit_price?: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const { clientName, clientEmail, clientPhone, description, eventDate, lineItems } = (req.body || {}) as {
    clientName?: string
    clientEmail?: string
    clientPhone?: string
    description?: string
    eventDate?: string
    lineItems?: LineItemInput[]
  }

  if (!clientName?.trim()) return res.status(400).json({ error: 'clientName is required' })
  if (!clientEmail?.includes('@')) return res.status(400).json({ error: 'clientEmail is required' })
  if (!description?.trim()) {
    // client-documents: an invoice with no deliverables is incomplete.
    return res.status(400).json({ error: 'description (scope of work) is required' })
  }
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return res.status(400).json({ error: 'eventDate must be YYYY-MM-DD' })
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'lineItems is required' })
  }

  // Amounts are computed here, never taken from the request.
  const items = lineItems.map((li) => {
    const quantity = li.quantity != null ? Number(li.quantity) : 1
    const unit_price = Number(li.unit_price)
    return {
      description: String(li.description || '').trim(),
      quantity,
      unit_price,
      amount: Math.round(quantity * unit_price * 100) / 100,
    }
  })
  if (items.some((li) => !li.description || !(li.quantity > 0) || !Number.isFinite(li.unit_price))) {
    return res.status(400).json({ error: 'Each line item needs a description, a positive quantity and a unit_price' })
  }
  const total = Math.round(items.reduce((s, li) => s + li.amount, 0) * 100) / 100
  if (!(total > 0)) return res.status(400).json({ error: 'Invoice total must be positive' })

  try {
    const supabase = getSupabaseAdmin()
    const client = await upsertClientForBooking(supabase, {
      name: clientName.trim(),
      email: clientEmail.trim(),
      phone: clientPhone?.trim() || null,
    })

    // An existing client keeps their record, but gains a phone if it was missing.
    if (clientPhone?.trim()) {
      await supabase.from('clients').update({ phone: clientPhone.trim() }).eq('id', client.id).is('phone', null)
    }

    const invoiceNumber = await nextInvoiceNumber(supabase, 'INV')
    const pdfToken = randomToken()

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        client_id: client.id,
        booking_id: null,
        invoice_number: invoiceNumber,
        invoice_type: 'standard',
        date: new Date().toISOString().slice(0, 10),
        event_date: eventDate || null,
        description: description.trim(),
        line_items: items,
        subtotal: total,
        total,
        amount_due: total,
        status: 'draft',
        payment_method: null,
        pdf_token: pdfToken,
      })
      .select('id')
      .single()

    if (invErr || !invoice) {
      return res.status(500).json({ error: 'Failed to create invoice', details: invErr?.message })
    }

    return res.status(200).json({
      invoiceId: invoice.id,
      invoiceNumber,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      lineItems: items,
      total,
      status: 'draft',
      pdfUrl: `${siteOrigin(req)}/api/invoices/pdf?id=${invoice.id}&token=${pdfToken}`,
    })
  } catch (err: any) {
    console.error('[create-invoice] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create invoice' })
  }
}
