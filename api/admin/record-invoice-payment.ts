import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe, getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'

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
 *      amount defaults to the outstanding balance. Per client-documents, the
 *      invoice flips to 'paid' only when the full balance is in. A still-active
 *      Stripe payment link on a settled invoice is deactivated so the client
 *      cannot pay twice.
 *
 * It sends nothing. The receipt is a separate step: /api/invoices/send picks
 * the "Receipt — INV-xxx" subject once the invoice is 'paid'.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] && req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) {
    return true
  }
  const email = ((req.headers['x-admin-email'] as string) || '').toLowerCase()
  if (ADMIN_EMAILS.includes(email)) return true
  const host = req.headers.host || ''
  return host.includes('localhost') || host.includes('127.0.0.1')
}

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
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

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

    const { invoiceNumber, method, amount, notes } = (req.body || {}) as {
      invoiceNumber?: string
      method?: string
      amount?: number | string
      notes?: string
    }
    if (!invoiceNumber) return res.status(400).json({ error: 'invoiceNumber is required' })
    if (!method || !method.trim()) return res.status(400).json({ error: 'method is required (e.g. "Apple Pay")' })

    const { data: inv } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, total, amount_due, payment_method, stripe_payment_link_id')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()
    if (!inv) return res.status(404).json({ error: `Invoice ${invoiceNumber} not found` })
    if (['void', 'cancelled'].includes(inv.status)) {
      return res.status(409).json({ error: `Invoice ${invoiceNumber} is ${inv.status}` })
    }

    const prior = (await collectedFor(supabase, [inv.id]))[inv.id] || []
    const collectedBefore = round2(prior.reduce((s, p) => s + p.amount, 0))
    const total = Number(inv.total) || 0
    const outstanding = round2(Math.max(0, total - collectedBefore))
    if (outstanding < 0.005) {
      return res.status(409).json({ error: `Invoice ${invoiceNumber} is already fully collected`, collected: collectedBefore, total })
    }

    const requested = amount === undefined || amount === '' ? outstanding : round2(Number(amount))
    if (!(requested > 0)) return res.status(400).json({ error: 'amount must be greater than zero' })
    if (requested - outstanding > 0.005) {
      return res.status(400).json({ error: `amount ${requested} exceeds the ${outstanding} outstanding` })
    }

    const paidAt = new Date().toISOString()
    const { data: payRow, error: payErr } = await supabase
      .from('invoice_payments')
      .insert({ invoice_id: inv.id, amount: requested, method: method.trim(), paid_at: paidAt, notes: notes?.trim() || null })
      .select('id')
      .single()
    if (payErr) return res.status(500).json({ error: 'Failed to record payment', details: payErr.message })

    const remaining = round2(Math.max(0, outstanding - requested))
    const settles = remaining < 0.005
    const { error: invErr } = await supabase
      .from('invoices')
      .update({
        amount_due: remaining,
        ...(settles ? { status: 'paid', paid_at: paidAt } : {}),
        ...(!inv.payment_method ? { payment_method: method.trim() } : {}),
      })
      .eq('id', inv.id)
    if (invErr) {
      return res.status(500).json({ error: 'Payment recorded but invoice update failed', paymentId: payRow?.id, details: invErr.message })
    }

    // A settled invoice must not keep a payable link — the client could pay twice.
    let paymentLink: { id: string; active: boolean } | null = null
    if (settles && inv.stripe_payment_link_id) {
      try {
        const link = await getStripe().paymentLinks.update(inv.stripe_payment_link_id, { active: false })
        paymentLink = { id: link.id, active: link.active }
      } catch (e: any) {
        console.error('[record-invoice-payment] could not deactivate payment link:', e?.message)
        paymentLink = { id: inv.stripe_payment_link_id, active: true }
      }
    }

    const { data: after } = await supabase
      .from('invoices')
      .select('invoice_number, status, total, amount_due, paid_at, payment_method')
      .eq('id', inv.id)
      .single()

    return res.status(200).json({
      invoice: after,
      paymentId: payRow?.id,
      recorded: requested,
      collected: round2(collectedBefore + requested),
      paymentLink,
    })
  } catch (err: any) {
    console.error('[record-invoice-payment] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to record payment' })
  }
}
