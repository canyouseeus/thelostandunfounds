import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripe, getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { getAdminUser } from '../../lib/api-handlers/_admin-auth.js'

/**
 * Deactivate a Stripe Payment Link.
 *
 * Voiding an invoice in the database does nothing to Stripe: the link stays
 * live and payable. A test booking once emailed a client a real payment link
 * for a shoot that did not exist, and there was no way to switch it off from
 * inside the app — only the Stripe dashboard.
 *
 * Takes either a payment link id or the invoice number that carries it, and
 * marks the invoice draft so the two cannot drift apart.
 */


async function isAdmin(req: VercelRequest): Promise<boolean> {
    // Verifies a real Supabase session; never trusts a header as identity.
    return (await getAdminUser(req)) !== null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await isAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const { paymentLinkId, invoiceNumber } = (req.body || {}) as {
    paymentLinkId?: string
    invoiceNumber?: string
  }

  try {
    const supabase = getSupabaseAdmin()
    let linkId = paymentLinkId
    let invoiceId: string | null = null
    let invoiceStatus: string | null = null

    if (invoiceNumber) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, stripe_payment_link_id, status')
        .eq('invoice_number', invoiceNumber)
        .maybeSingle()
      if (!inv) return res.status(404).json({ error: `Invoice ${invoiceNumber} not found` })
      invoiceId = inv.id
      invoiceStatus = inv.status || null
      linkId = linkId || inv.stripe_payment_link_id || undefined
    }

    if (!linkId) {
      return res.status(400).json({ error: 'paymentLinkId or an invoiceNumber carrying one is required' })
    }

    const stripe = getStripe()
    const link = await stripe.paymentLinks.update(linkId, { active: false })

    // Keep the invoice in step — a dead link on a "sent" invoice is a trap for
    // whoever reads the record next.
    //
    // But a link is also killed on an invoice that has been PAID, to stop a
    // client paying the same balance twice — and pushing that back to draft
    // erases the payment from the CRM totals, which it did once. Only an
    // unsettled invoice is withdrawn.
    if (invoiceId && invoiceStatus && !['paid', 'void', 'cancelled'].includes(invoiceStatus)) {
      await supabase.from('invoices').update({ status: 'draft' }).eq('id', invoiceId)
    }

    return res.status(200).json({
      success: true,
      paymentLinkId: link.id,
      active: link.active,
      invoiceNumber: invoiceNumber || null,
    })
  } catch (err: any) {
    console.error('[deactivate-payment-link] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to deactivate payment link' })
  }
}
