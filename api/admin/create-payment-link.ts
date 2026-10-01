import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createPaymentLink,
  getStripe,
  getSupabaseAdmin,
  siteOrigin,
} from '../../lib/api-handlers/_booking-payment-utils.js'

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { invoiceNumber } = (req.body || {}) as { invoiceNumber?: string }
  if (!invoiceNumber) return res.status(400).json({ error: 'invoiceNumber is required' })

  try {
    const supabase = getSupabaseAdmin()
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, amount_due, total, description, stripe_payment_link_id, stripe_payment_link_url, clients(name)')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()
    if (!inv) return res.status(404).json({ error: `Invoice ${invoiceNumber} not found` })

    if (['paid', 'void', 'cancelled'].includes(inv.status)) {
      return res.status(409).json({ error: `Invoice ${invoiceNumber} is ${inv.status}` })
    }

    // One live link per invoice — a second would let the client pay twice.
    if (inv.stripe_payment_link_id) {
      const stripe = getStripe()
      const existing = await stripe.paymentLinks.retrieve(inv.stripe_payment_link_id)
      if (existing.active) {
        return res.status(200).json({
          invoiceNumber,
          paymentLinkId: existing.id,
          url: existing.url,
          active: true,
          created: false,
        })
      }
    }

    const amountDue = Number(inv.amount_due ?? inv.total ?? 0)
    const amountCents = Math.round(amountDue * 100)
    if (amountCents <= 0) return res.status(400).json({ error: `Invoice ${invoiceNumber} has nothing due` })

    const clientName = (inv as any).clients?.name || 'Client'
    const stripe = getStripe()
    const link = await createPaymentLink(stripe, {
      amountCents,
      productName: `${invoiceNumber} — ${clientName}`,
      description: `${invoiceNumber} — ${String(inv.description || '').slice(0, 200)}`,
      metadata: { kind: 'standalone', invoiceId: inv.id },
      redirectUrl: `${siteOrigin(req)}/?payment=success`,
    })

    const { error: updErr } = await supabase
      .from('invoices')
      .update({ stripe_payment_link_id: link.id, stripe_payment_link_url: link.url, payment_method: 'Stripe' })
      .eq('id', inv.id)
    if (updErr) {
      // The link exists in Stripe but not on the invoice — the webhook could
      // not settle a payment against it. Kill it rather than leave it orphaned.
      await stripe.paymentLinks.update(link.id, { active: false })
      return res.status(500).json({ error: 'Failed to save link on invoice; link deactivated', details: updErr.message })
    }

    return res.status(200).json({
      invoiceNumber,
      paymentLinkId: link.id,
      url: link.url,
      amount: amountDue,
      active: true,
      created: true,
    })
  } catch (err: any) {
    console.error('[create-payment-link] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create payment link' })
  }
}
