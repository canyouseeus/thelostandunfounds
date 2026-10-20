import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createPaymentLink,
  getStripe,
  nextInvoiceNumber,
  randomToken,
  upsertClientForBooking,
} from './_booking-payment-utils.js'

/**
 * Standalone invoices — jobs billed outside the booking funnel.
 *
 * One implementation shared by /api/admin/create-invoice,
 * /api/admin/create-payment-link and the admin direct-booking route, so a job
 * booked by phone produces the same invoice row and the same Stripe link as
 * any other (email-billing RULE 2).
 */

export class InvoiceInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export interface LineItemInput {
  description?: string
  quantity?: number | string
  unit_price?: number | string
}

export interface StandaloneInvoiceInput {
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  description?: string
  eventDate?: string
  lineItems?: LineItemInput[]
}

export async function createStandaloneInvoice(
  supabase: SupabaseClient,
  input: StandaloneInvoiceInput,
  origin: string
) {
  const { clientName, clientEmail, clientPhone, description, eventDate, lineItems } = input

  if (!clientName?.trim()) throw new InvoiceInputError('clientName is required')
  if (!clientEmail?.includes('@')) throw new InvoiceInputError('clientEmail is required')
  if (!description?.trim()) {
    // client-documents: an invoice with no deliverables is incomplete.
    throw new InvoiceInputError('description (scope of work) is required')
  }
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new InvoiceInputError('eventDate must be YYYY-MM-DD')
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new InvoiceInputError('lineItems is required')
  }

  // Amounts are computed here, never taken from the request.
  const items = lineItems.map((li) => {
    const quantity = li.quantity != null && li.quantity !== '' ? Number(li.quantity) : 1
    const unit_price = Number(li.unit_price)
    return {
      description: String(li.description || '').trim(),
      quantity,
      unit_price,
      amount: Math.round(quantity * unit_price * 100) / 100,
    }
  })
  if (items.some((li) => !li.description || !(li.quantity > 0) || !Number.isFinite(li.unit_price))) {
    throw new InvoiceInputError('Each line item needs a description, a positive quantity and a unit_price')
  }
  const total = Math.round(items.reduce((s, li) => s + li.amount, 0) * 100) / 100
  if (!(total > 0)) throw new InvoiceInputError('Invoice total must be positive')

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
    throw new InvoiceInputError(`Failed to create invoice: ${invErr?.message || 'no row returned'}`, 500)
  }

  return {
    invoiceId: invoice.id as string,
    invoiceNumber,
    clientId: client.id as string,
    clientName: client.name as string,
    clientEmail: client.email as string,
    lineItems: items,
    total,
    status: 'draft',
    pdfUrl: `${origin}/api/invoices/pdf?id=${invoice.id}&token=${pdfToken}`,
  }
}

/**
 * Attach a single-use Stripe Payment Link for the invoice's amount_due, or
 * return the live one it already has. One live link per invoice — a second
 * would let the client pay twice.
 */
export async function ensureInvoicePaymentLink(
  supabase: SupabaseClient,
  invoiceNumber: string,
  origin: string
) {
  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, amount_due, total, description, stripe_payment_link_id, stripe_payment_link_url, clients(name)')
    .eq('invoice_number', invoiceNumber)
    .maybeSingle()
  if (!inv) throw new InvoiceInputError(`Invoice ${invoiceNumber} not found`, 404)

  if (['paid', 'void', 'cancelled'].includes(inv.status)) {
    throw new InvoiceInputError(`Invoice ${invoiceNumber} is ${inv.status}`, 409)
  }

  const stripe = getStripe()
  if (inv.stripe_payment_link_id) {
    const existing = await stripe.paymentLinks.retrieve(inv.stripe_payment_link_id)
    if (existing.active) {
      return { invoiceNumber, paymentLinkId: existing.id, url: existing.url, active: true, created: false }
    }
  }

  const amountDue = Number(inv.amount_due ?? inv.total ?? 0)
  const amountCents = Math.round(amountDue * 100)
  if (amountCents <= 0) throw new InvoiceInputError(`Invoice ${invoiceNumber} has nothing due`)

  const clientName = (inv as any).clients?.name || 'Client'
  const link = await createPaymentLink(stripe, {
    amountCents,
    productName: `${invoiceNumber} — ${clientName}`,
    description: `${invoiceNumber} — ${String(inv.description || '').slice(0, 200)}`,
    metadata: { kind: 'standalone', invoiceId: inv.id },
    redirectUrl: `${origin}/?payment=success`,
  })

  const { error: updErr } = await supabase
    .from('invoices')
    .update({ stripe_payment_link_id: link.id, stripe_payment_link_url: link.url, payment_method: 'Stripe' })
    .eq('id', inv.id)
  if (updErr) {
    // The link exists in Stripe but not on the invoice — the webhook could
    // not settle a payment against it. Kill it rather than leave it orphaned.
    await stripe.paymentLinks.update(link.id, { active: false })
    throw new InvoiceInputError(`Failed to save link on invoice; link deactivated: ${updErr.message}`, 500)
  }

  return { invoiceNumber, paymentLinkId: link.id, url: link.url, amount: amountDue, active: true, created: true }
}
