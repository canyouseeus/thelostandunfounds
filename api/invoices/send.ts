/**
 * POST /api/invoices/send
 *
 * Sends a branded invoice email to a client via Zoho Mail.
 *
 * Body (JSON):
 *   invoice_id  string   — UUID of the invoice to send
 *   to_email?   string   — Optional override (for testing). Falls back to client's email.
 *
 * Auth: localhost is allowed, otherwise `x-admin-email` or `x-admin-secret`.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
} catch (e) {}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { wrapEmailContent, BRAND } from '../email-template.js'
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils.js'
import { generateInvoicePdf, InvoicePdfLineItem } from '../../lib/api-handlers/_invoice-pdf.js'

const FROM_EMAIL = 'media@thelostandunfounds.com'
const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']

function isAdmin(req: VercelRequest): boolean {
  if (req.headers['x-admin-secret'] === process.env.ADMIN_SECRET) return true
  const adminEmail = (req.headers['x-admin-email'] as string || '').toLowerCase()
  if (ADMIN_EMAILS.includes(adminEmail)) return true
  const host = req.headers.host || ''
  if (host.includes('localhost') || host.includes('127.0.0.1')) return true
  return false
}

interface LineItem {
  description: string
  quantity?: number
  unit_price?: number
  amount: number
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Render a plain-text personal message as branded HTML paragraphs.
 * Blank lines become paragraph breaks; single line breaks become <br>.
 */
function buildPersonalMessageBody(message: string, invoiceNumber: string): string {
  const text = BRAND.colors.text
  const muted = BRAND.colors.textMuted
  const paragraphs = message
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)

  const html = paragraphs
    .map(
      (p) =>
        `<p style="color:${text} !important;font-size:15px;line-height:1.7;margin:0 0 18px 0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('')

  return `
    ${html}
    <p style="color:${muted} !important;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:30px 0 0 0;font-family:Arial,Helvetica,sans-serif;">
      Invoice ${escapeHtml(invoiceNumber)} — attached as PDF
    </p>
  `
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' })

  const { invoice_id, to_email, message } = (req.body || {}) as {
    invoice_id?: string
    to_email?: string
    message?: string
  }

  if (!invoice_id || typeof invoice_id !== 'string') {
    return res.status(400).json({ error: 'invoice_id is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase service credentials not configured' })
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', invoice_id)
      .single()

    if (invErr || !invoice) {
      console.error('[invoices/send] invoice lookup error:', invErr)
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const client = (invoice as any).clients || null

    // Pull start/end time from the linked booking so the PDF can show
    // "Sunday, May 24, 2026" + "5:00 PM – 8:00 PM".
    let bookingStartTime: string | null = null
    let bookingEndTime: string | null = null
    const bookingId = (invoice as any).booking_id
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('id', bookingId)
        .maybeSingle()
      if (booking) {
        bookingStartTime = (booking as any).start_time || null
        bookingEndTime = (booking as any).end_time || null
      }
    }
    const recipient = (to_email && to_email.trim()) || client?.email || ''
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ error: 'No recipient email available (provide to_email or set client.email)' })
    }

    const lineItems: LineItem[] = Array.isArray((invoice as any).line_items)
      ? (invoice as any).line_items
      : []

    // Every invoice email carries the branded PDF as an attachment — never
    // the legacy inline render, which drops the banner/layout in most clients.
    const hasMessage = typeof message === 'string' && message.trim().length > 0
    const bodyMessage = hasMessage
      ? message!.trim()
      : invoice.status === 'paid'
      ? 'Thank you — here is your receipt.'
      : 'Please find your invoice attached.'

    const bodyHtml = buildPersonalMessageBody(bodyMessage, invoice.invoice_number)

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

    const pdfLineItems: InvoicePdfLineItem[] = lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      amount: li.amount,
    }))

    const pdfBuffer = await generateInvoicePdf({
      docType,
      invoiceNumber: invoice.invoice_number,
      date: invoice.date,
      eventDate: invoice.event_date,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      location: (invoice as any).location || null,
      description: invoice.description,
      lineItems: pdfLineItems,
      subtotal: Number(invoice.subtotal || 0),
      total,
      amountDueLabel,
      amountDue,
      paymentUrl: invoice.stripe_payment_link_url || null,
      fullPaymentUrl: (invoice as any).stripe_full_payment_link_url || null,
      clientName: client?.name || 'Client',
      clientBusiness: client?.business || null,
      clientEmail: client?.email || null,
      notes: null,
    })

    const pdfAttachment: { data: Buffer; fileName: string; mimeType: string } = {
      data: pdfBuffer,
      fileName: `${invoice.invoice_number}.pdf`,
      mimeType: 'application/pdf',
    }

    const htmlContent = wrapEmailContent(bodyHtml, {
      includeUnsubscribe: false,
      includeFooter: true,
    })

    const subject = invoice.status === 'paid'
      ? `Receipt — ${invoice.invoice_number} from ${BRAND.name}`
      : `Invoice ${invoice.invoice_number} from ${BRAND.name}`

    const auth = await getZohoAuthContext()
    const result = await sendZohoEmail({
      auth: { ...auth, fromEmail: FROM_EMAIL },
      to: recipient,
      subject,
      htmlContent,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    })

    if (!result.success) {
      console.error('[invoices/send] Zoho error:', result.error)
      return res.status(500).json({ error: 'Failed to send invoice email', details: result.error })
    }

    if (invoice.status === 'draft') {
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice_id)
      if (updateErr) {
        console.warn('[invoices/send] failed to update status to sent:', updateErr)
      }
    }

    console.log(`[invoices/send] ${invoice.invoice_number} sent to ${recipient}`)
    return res.status(200).json({
      success: true,
      sentTo: recipient,
      invoiceNumber: invoice.invoice_number,
    })
  } catch (err: any) {
    console.error('[invoices/send] Error:', err)
    return res.status(500).json({ error: 'Server error', message: err.message })
  }
}
