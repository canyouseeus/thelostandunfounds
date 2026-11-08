import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './_booking-payment-utils.js'
import { triggerSettledInvoiceSplit } from './affiliates/_commission-trigger.js'

/**
 * Record money that arrived outside Stripe Checkout against an invoice. Shared
 * by POST /api/admin/record-invoice-payment and the record_invoice_payment admin
 * job. Callers do their own auth.
 *
 * amount defaults to the outstanding balance. Per client-documents, the invoice
 * flips to 'paid' only when the full balance is in. Settling also closes the
 * booking, deactivates the deposit and pay-in-full links so the client cannot
 * pay twice, and runs the profit split. It sends nothing: the receipt is a
 * separate send_invoice.
 */

const round2 = (n: number) => Math.round(n * 100) / 100

export interface RecordInvoicePaymentInput {
  invoiceNumber?: string
  method?: string
  amount?: number | string
  notes?: string
}

export async function recordInvoicePayment(
  supabase: SupabaseClient,
  input: RecordInvoicePaymentInput
): Promise<{ status: number; body: Record<string, any> }> {
  const reply = (status: number, body: Record<string, any>) => ({ status, body })
  const { invoiceNumber, method, amount, notes } = input || {}
  if (!invoiceNumber) return reply(400, { error: 'invoiceNumber is required' })
  if (!method || !method.trim()) return reply(400, { error: 'method is required (e.g. "Apple Pay")' })

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, payment_method, booking_id, stripe_payment_link_id, stripe_full_payment_link_id')
    .eq('invoice_number', invoiceNumber)
    .maybeSingle()
  if (!inv) return reply(404, { error: `Invoice ${invoiceNumber} not found` })
  if (['void', 'cancelled'].includes(inv.status)) {
    return reply(409, { error: `Invoice ${invoiceNumber} is ${inv.status}` })
  }

  const { data: prior } = await supabase.from('invoice_payments').select('amount').eq('invoice_id', inv.id)
  const collectedBefore = round2((prior || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0))
  const total = Number(inv.total) || 0
  const outstanding = round2(Math.max(0, total - collectedBefore))
  if (outstanding < 0.005) {
    return reply(409, { error: `Invoice ${invoiceNumber} is already fully collected`, collected: collectedBefore, total })
  }

  const requested = amount === undefined || amount === '' ? outstanding : round2(Number(amount))
  if (!(requested > 0)) return reply(400, { error: 'amount must be greater than zero' })
  if (requested - outstanding > 0.005) {
    return reply(400, { error: `amount ${requested} exceeds the ${outstanding} outstanding` })
  }

  const paidAt = new Date().toISOString()
  const { data: payRow, error: payErr } = await supabase
    .from('invoice_payments')
    .insert({ invoice_id: inv.id, amount: requested, method: method.trim(), paid_at: paidAt, notes: notes?.trim() || null })
    .select('id')
    .single()
  if (payErr) return reply(500, { error: 'Failed to record payment', details: payErr.message })

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
    return reply(500, { error: 'Payment recorded but invoice update failed', paymentId: payRow?.id, details: invErr.message })
  }

  // The same close-out the Stripe webhook does for a card payment. Best-effort
  // from here on: never let any of it undo the recorded payment.
  const paymentLinks: { id: string; active: boolean }[] = []
  let split: unknown = null
  if (settles) {
    if (inv.booking_id) {
      const { error: bookingErr } = await supabase
        .from('bookings').update({ status: 'paid', paid_at: paidAt }).eq('id', inv.booking_id)
      if (bookingErr) console.error('[record-invoice-payment] booking update failed:', bookingErr.message)
    }
    for (const id of [inv.stripe_payment_link_id, inv.stripe_full_payment_link_id].filter(Boolean) as string[]) {
      try {
        const link = await getStripe().paymentLinks.update(id, { active: false })
        paymentLinks.push({ id: link.id, active: link.active })
      } catch (e: any) {
        console.error('[record-invoice-payment] could not deactivate payment link:', e?.message)
        paymentLinks.push({ id, active: true })
      }
    }
    // The same profit split a card payment runs (affiliate, pots, owner's 10%).
    try {
      split = await triggerSettledInvoiceSplit(supabase, inv.id)
    } catch (e: any) {
      console.error('[record-invoice-payment] split failed:', e?.message)
      split = { triggered: false, reason: e?.message || 'split failed' }
    }
  }

  const { data: after } = await supabase
    .from('invoices')
    .select('invoice_number, status, total, amount_due, paid_at, payment_method')
    .eq('id', inv.id)
    .single()

  return reply(200, {
    invoice: after,
    paymentId: payRow?.id,
    recorded: requested,
    collected: round2(collectedBefore + requested),
    paymentLinks,
    split,
  })
}
