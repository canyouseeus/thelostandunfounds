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

function fmtUSD(n: number): string {
  return `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return d
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function statusBadge(status: string): string {
  const isPaid = status === 'paid'
  const bg = isPaid ? '#1f3a1f' : '#3a2a1f'
  const color = isPaid ? '#7be07b' : '#ffb47b'
  const label = (status || 'unpaid').toUpperCase()
  return `<span style="display:inline-block;padding:6px 14px;background-color:${bg};color:${color};font-size:11px;font-weight:bold;letter-spacing:0.2em;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</span>`
}

function buildInvoiceBody(args: {
  invoiceNumber: string
  date: string
  eventDate: string | null
  description: string | null
  lineItems: LineItem[]
  subtotal: number
  total: number
  status: string
  paymentMethod: string | null
  clientName: string
  clientEmail: string | null
  clientBusiness: string | null
}): string {
  const {
    invoiceNumber,
    date,
    eventDate,
    description,
    lineItems,
    subtotal,
    total,
    status,
    paymentMethod,
    clientName,
    clientEmail,
    clientBusiness,
  } = args

  const muted = BRAND.colors.textMuted
  const text = BRAND.colors.text
  const border = BRAND.colors.border

  const labelStyle = `color:${muted};font-size:10px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;margin:0 0 6px 0;`
  const valueStyle = `color:${text} !important;font-size:14px;font-family:Arial,Helvetica,sans-serif;margin:0;`

  const lineItemsRows = lineItems.length
    ? lineItems
        .map(
          (item) => `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid ${border};color:${text} !important;font-size:14px;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(item.description || '')}
                ${item.quantity && item.quantity > 1 ? `<br><span style="color:${muted};font-size:11px;">${item.quantity} × ${fmtUSD(Number(item.unit_price || 0))}</span>` : ''}
              </td>
              <td align="right" style="padding:14px 0;border-bottom:1px solid ${border};color:${text} !important;font-size:14px;font-family:'Courier New',monospace;font-weight:bold;white-space:nowrap;">
                ${fmtUSD(Number(item.amount || 0))}
              </td>
            </tr>`
        )
        .join('')
    : `<tr><td colspan="2" style="padding:14px 0;color:${muted};font-size:13px;">No line items</td></tr>`

  return `
    <!-- Header -->
    <h1 style="color:${text} !important;font-size:32px;font-weight:bold;letter-spacing:0.1em;margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;">INVOICE</h1>
    <p style="color:${muted};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 30px 0;font-family:Arial,Helvetica,sans-serif;">
      ${escapeHtml(invoiceNumber)}
    </p>

    <!-- Status badge -->
    <div style="margin:0 0 30px 0;">${statusBadge(status)}</div>

    <!-- From / To -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 30px 0;">
      <tr>
        <td valign="top" style="width:50%;padding-right:15px;">
          <p style="${labelStyle}">From</p>
          <p style="${valueStyle}font-weight:bold;">${escapeHtml(BRAND.name)}</p>
          <p style="color:${muted} !important;font-size:12px;margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;">Photography &amp; Visual Storytelling</p>
          <p style="color:${muted} !important;font-size:12px;margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;">
            <a href="${BRAND.website}" style="color:${muted};text-decoration:none;">thelostandunfounds.com</a>
          </p>
        </td>
        <td valign="top" style="width:50%;padding-left:15px;">
          <p style="${labelStyle}">Bill To</p>
          <p style="${valueStyle}font-weight:bold;">${escapeHtml(clientName)}</p>
          ${clientBusiness ? `<p style="color:${muted} !important;font-size:12px;margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(clientBusiness)}</p>` : ''}
          ${clientEmail ? `<p style="color:${muted} !important;font-size:12px;margin:2px 0 0 0;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(clientEmail)}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Meta info -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 30px 0;border-top:1px solid ${border};border-bottom:1px solid ${border};">
      <tr>
        <td valign="top" style="padding:18px 15px 18px 0;width:50%;">
          <p style="${labelStyle}">Invoice Date</p>
          <p style="${valueStyle}">${escapeHtml(fmtDate(date))}</p>
        </td>
        <td valign="top" style="padding:18px 0 18px 15px;width:50%;">
          <p style="${labelStyle}">Event Date</p>
          <p style="${valueStyle}">${escapeHtml(fmtDate(eventDate))}</p>
        </td>
      </tr>
    </table>

    ${
      description
        ? `<div style="margin:0 0 30px 0;">
            <p style="${labelStyle}">Description</p>
            <p style="${valueStyle}">${escapeHtml(description)}</p>
          </div>`
        : ''
    }

    <!-- Line items -->
    <p style="${labelStyle}margin:0 0 12px 0;">Line Items</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px 0;">
      <thead>
        <tr>
          <th align="left" style="padding:10px 0;border-bottom:1px solid ${text};color:${muted};font-size:10px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Description</th>
          <th align="right" style="padding:10px 0;border-bottom:1px solid ${text};color:${muted};font-size:10px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsRows}
      </tbody>
    </table>

    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 30px 0;">
      <tr>
        <td align="right" style="padding:6px 0;color:${muted} !important;font-size:13px;font-family:Arial,Helvetica,sans-serif;">Subtotal</td>
        <td align="right" style="padding:6px 0 6px 20px;color:${text} !important;font-size:13px;font-family:'Courier New',monospace;width:130px;">${fmtUSD(subtotal)}</td>
      </tr>
      <tr>
        <td align="right" style="padding:14px 0 6px 0;border-top:1px solid ${text};color:${text} !important;font-size:13px;font-weight:bold;letter-spacing:0.2em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Total</td>
        <td align="right" style="padding:14px 0 6px 20px;border-top:1px solid ${text};color:${text} !important;font-size:22px;font-weight:bold;font-family:'Courier New',monospace;">${fmtUSD(total)}</td>
      </tr>
    </table>

    ${
      paymentMethod
        ? `<p style="color:${muted} !important;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;margin:0 0 24px 0;">
            Accepted Payment: ${escapeHtml(paymentMethod)}
          </p>`
        : ''
    }

    <hr style="border:none;border-top:1px solid ${border};margin:30px 0;">

    <p style="color:${text} !important;font-size:14px;line-height:1.6;margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;">
      Thank you for your business.
    </p>
    <p style="color:${muted} !important;font-size:12px;line-height:1.6;margin:0;font-family:Arial,Helvetica,sans-serif;">
      Questions about this invoice? Just reply to this email.
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

  const { invoice_id, to_email } = (req.body || {}) as { invoice_id?: string; to_email?: string }

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
    const recipient = (to_email && to_email.trim()) || client?.email || ''
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ error: 'No recipient email available (provide to_email or set client.email)' })
    }

    const lineItems: LineItem[] = Array.isArray((invoice as any).line_items)
      ? (invoice as any).line_items
      : []

    const bodyHtml = buildInvoiceBody({
      invoiceNumber: invoice.invoice_number,
      date: invoice.date,
      eventDate: invoice.event_date,
      description: invoice.description,
      lineItems,
      subtotal: Number(invoice.subtotal || 0),
      total: Number(invoice.total || 0),
      status: invoice.status,
      paymentMethod: invoice.payment_method,
      clientName: client?.name || 'Client',
      clientEmail: client?.email || null,
      clientBusiness: client?.business || null,
    })

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
