import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { recordInvoicePayment } from '../../lib/api-handlers/_record-invoice-payment.js'

import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
/**
 * Record a payment that arrived outside Stripe Checkout — Apple Pay / Apple
 * Cash, Zelle, Venmo, cash — against an existing invoice.
 *
 * The Stripe webhook settles invoices paid through their payment link, but
 * money that lands anywhere else never reaches it: the invoice stays 'sent',
 * nothing is written to invoice_payments, and the revenue tiles (which sum
 * invoice_payments) never see the sale. The admin panel's Record Payment form
 * does the same write from the browser; this is the server-side equivalent.
 *
 * GET  ?client=<name or email fragment>  — read-only lookup: matching invoices
 *      with what has been collected on each. Use it to pick the invoice.
 * POST { invoiceNumber, method, amount?, notes? }
 *      See _record-invoice-payment.ts, shared with the record_invoice_payment
 *      admin job.
 *
 * It sends nothing. The receipt is a separate step: /api/invoices/send picks
 * the "Receipt — INV-xxx" subject once the invoice is 'paid'.
 */


const round2 = (n: number) => Math.round(n * 100) / 100

async function collectedFor(supabase: any, invoiceIds: string[]) {
  const byInvoice: Record<string, { amount: number; method: string | null; paid_at: string; notes: string | null }[]> = {}
  if (!invoiceIds.length) return byInvoice
  const { data } = await supabase
    .from('invoice_payments')
    .select('invoice_id, amount, method, paid_at, notes')
    .in('invoice_id', invoiceIds)
  for (const p of data || []) {
    ;(byInvoice[p.invoice_id] ||= []).push({
      amount: Number(p.amount) || 0,
      method: p.method,
      paid_at: p.paid_at,
      notes: p.notes,
    })
  }
  return byInvoice
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = getSupabaseAdmin()

    if (req.method === 'GET') {
      const q = String(req.query.client || '').trim()
      if (q.length < 2) return res.status(400).json({ error: 'client query (2+ chars) is required' })
      const like = `%${q.replace(/[%_,()]/g, '')}%`
      const { data: clients, error: cErr } = await supabase
        .from('clients')
        .select('id, name, email, business')
        .or(`name.ilike.${like},email.ilike.${like},business.ilike.${like}`)
      if (cErr) return res.status(500).json({ error: cErr.message })
      const clientIds = (clients || []).map((c: any) => c.id)
      if (!clientIds.length) return res.status(200).json({ clients: [], invoices: [] })

      const { data: invoices, error: iErr } = await supabase
        .from('invoices')
        .select('id, client_id, invoice_number, invoice_type, status, date, total, amount_due, paid_at, payment_method, description, stripe_payment_link_id, contractor_name, contractor_payout')
        .in('client_id', clientIds)
        .order('date', { ascending: false })
      if (iErr) return res.status(500).json({ error: iErr.message })

      const payments = await collectedFor(supabase, (invoices || []).map((i: any) => i.id))
      return res.status(200).json({
        clients,
        invoices: (invoices || []).map((i: any) => {
          const rows = payments[i.id] || []
          const collected = round2(rows.reduce((s, p) => s + p.amount, 0))
          return { ...i, collected, outstanding: round2(Math.max(0, Number(i.total) - collected)), payments: rows }
        }),
      })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const result = await recordInvoicePayment(supabase, (req.body || {}) as any)
    return res.status(result.status).json(result.body)
  } catch (err: any) {
    console.error('[record-invoice-payment] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to record payment' })
  }
}
