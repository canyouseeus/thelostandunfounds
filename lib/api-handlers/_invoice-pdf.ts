/**
 * Branded TLAU quote / invoice PDF generator.
 *
 * Pure-JS (pdfkit, no native binary) so it runs on Vercel serverless.
 * Monochrome / uppercase to match the TLAU "Noir" brand; white background
 * so it prints cleanly. The Stripe payment URL is rendered as a clickable
 * button annotation inside the document.
 */

import PDFDocument from 'pdfkit'

export interface InvoicePdfLineItem {
  description: string
  quantity?: number
  unit_price?: number
  amount: number
}

export interface InvoicePdfData {
  docType: 'QUOTE' | 'INVOICE'
  invoiceNumber: string
  date: string | null
  eventDate: string | null
  location?: string | null
  description: string | null
  lineItems: InvoicePdfLineItem[]
  subtotal: number
  total: number
  /** Label for the highlighted amount, e.g. "Deposit Due (50%)" / "Balance Due". */
  amountDueLabel: string
  /** What the payment link actually charges. */
  amountDue: number
  paymentUrl: string | null
  clientName: string
  clientBusiness: string | null
  clientEmail: string | null
  notes?: string | null
}

const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  tagline: 'PHOTOGRAPHY & VISUAL STORYTELLING',
  website: 'thelostandunfounds.com',
  email: 'media@thelostandunfounds.com',
}

const INK = '#000000'
const MUTED = '#888888'
const HAIRLINE = '#dddddd'

const LEFT = 56
const RIGHT = 556 // 612 page width − 56 right margin
const CONTENT_W = RIGHT - LEFT

function fmtUSD(n: number): string {
  return `$${Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    // timeZone:'UTC' so a date-only string ('2026-05-19') isn't shifted a day
    // back when the server runs behind UTC.
    return new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return d
  }
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: LEFT, autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // ── Header ────────────────────────────────────────────────────────────────
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(BRAND.name, LEFT, 56, { characterSpacing: 1 })
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text(BRAND.tagline, LEFT, 82, { characterSpacing: 1.5 })
  doc.fillColor(MUTED).fontSize(8).text(BRAND.website, LEFT, 94)

  // Document title (right-aligned, same top line as the wordmark)
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(data.docType, LEFT, 56, { width: CONTENT_W, align: 'right', characterSpacing: 2 })
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text(data.invoiceNumber, LEFT, 82, { width: CONTENT_W, align: 'right' })
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Issued ${fmtDate(data.date)}`, LEFT, 95, { width: CONTENT_W, align: 'right' })

  doc.moveTo(LEFT, 120).lineTo(RIGHT, 120).lineWidth(1).strokeColor(INK).stroke()

  // ── Bill To / Event ───────────────────────────────────────────────────────
  let y = 138
  const labelStyle = () => doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED)
  const valueStyle = () => doc.font('Helvetica').fontSize(10.5).fillColor(INK)

  labelStyle().text('BILL TO', LEFT, y, { characterSpacing: 1.5 })
  labelStyle().text('EVENT DATE', LEFT + 280, y, { characterSpacing: 1.5 })
  y += 14
  valueStyle().font('Helvetica-Bold').text(data.clientName, LEFT, y, { width: 260 })
  valueStyle().text(fmtDate(data.eventDate), LEFT + 280, y, { width: 220 })
  y += 16
  if (data.clientBusiness) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(data.clientBusiness, LEFT, y, { width: 260 })
    y += 13
  }
  if (data.clientEmail) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(data.clientEmail, LEFT, y, { width: 260 })
    y += 13
  }
  y += 14

  // ── Location ──────────────────────────────────────────────────────────────
  if (data.location) {
    labelStyle().text('LOCATION', LEFT, y, { characterSpacing: 1.5 })
    y += 13
    valueStyle().fontSize(10).text(data.location, LEFT, y, { width: CONTENT_W })
    y = doc.y + 16
  }

  // ── Description ───────────────────────────────────────────────────────────
  if (data.description) {
    labelStyle().text('DESCRIPTION', LEFT, y, { characterSpacing: 1.5 })
    y += 13
    valueStyle().fontSize(10).text(data.description, LEFT, y, { width: CONTENT_W })
    y = doc.y + 16
  }

  // ── Line items ────────────────────────────────────────────────────────────
  const COL_QTY = LEFT + 330
  const COL_AMT = LEFT + 400

  labelStyle().text('DESCRIPTION', LEFT, y, { characterSpacing: 1.5 })
  labelStyle().text('QTY', COL_QTY, y, { width: 60, align: 'center', characterSpacing: 1.5 })
  labelStyle().text('AMOUNT', COL_AMT, y, { width: CONTENT_W - 400, align: 'right', characterSpacing: 1.5 })
  y += 13
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor(INK).stroke()
  y += 10

  const items = data.lineItems.length
    ? data.lineItems
    : [{ description: 'No line items', amount: 0 }]

  for (const item of items) {
    doc.font('Helvetica').fontSize(10).fillColor(INK)
    const descHeight = doc.heightOfString(item.description || '', { width: 300 })
    doc.text(item.description || '', LEFT, y, { width: 300 })
    if (item.quantity && item.quantity > 1 && item.unit_price != null) {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(`${item.quantity} × ${fmtUSD(item.unit_price)}`, LEFT, y + descHeight + 1, { width: 300 })
    }
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(INK)
      .text(item.quantity ? String(item.quantity) : '1', COL_QTY, y, { width: 60, align: 'center' })
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(INK)
      .text(fmtUSD(item.amount), COL_AMT, y, { width: CONTENT_W - 400, align: 'right' })

    const rowH = Math.max(descHeight, 12) + (item.quantity && item.quantity > 1 ? 12 : 0) + 10
    y += rowH
    doc.moveTo(LEFT, y - 4).lineTo(RIGHT, y - 4).lineWidth(0.5).strokeColor(HAIRLINE).stroke()
  }
  y += 10

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalsX = LEFT + 300
  const totalsW = CONTENT_W - 300
  const totalRow = (label: string, value: string, bold = false) => {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(label, totalsX, y, { width: totalsW - 110, align: 'left' })
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 12 : 9)
      .fillColor(INK)
      .text(value, totalsX + totalsW - 110, y - (bold ? 2 : 0), { width: 110, align: 'right' })
    y += bold ? 22 : 16
  }
  totalRow('Subtotal', fmtUSD(data.subtotal))
  doc.moveTo(totalsX, y - 2).lineTo(RIGHT, y - 2).lineWidth(1).strokeColor(INK).stroke()
  y += 6
  totalRow('Project Total', fmtUSD(data.total), true)
  y += 10

  // ── Amount due (highlighted black box) ────────────────────────────────────
  const boxH = 56
  const boxY = y
  doc.rect(totalsX, boxY, totalsW, boxH).fill(INK)
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor('#ffffff')
    .text(data.amountDueLabel.toUpperCase(), totalsX + 14, boxY + 12, {
      width: totalsW - 28,
      characterSpacing: 1.5,
    })
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#ffffff')
    .text(fmtUSD(data.amountDue), totalsX + 14, boxY + 24, { width: totalsW - 28 })
  y = boxY + boxH + 24

  // ── Pay button (clickable link annotation) ────────────────────────────────
  if (data.paymentUrl) {
    const btnH = 40
    const btnY = y
    doc.rect(LEFT, btnY, CONTENT_W, btnH).fill(INK)
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#ffffff')
      .text(`PAY ${data.amountDueLabel.toUpperCase()}  »`, LEFT, btnY + 14, {
        width: CONTENT_W,
        align: 'center',
        characterSpacing: 1,
      })
    doc.link(LEFT, btnY, CONTENT_W, btnH, data.paymentUrl)
    y = btnY + btnH + 10
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Secure payment via Stripe. Or open this link:', LEFT, y, { width: CONTENT_W, align: 'center' })
    y += 11
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(data.paymentUrl, LEFT, y, {
        width: CONTENT_W,
        align: 'center',
        link: data.paymentUrl,
        underline: true,
      })
    y += 22
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    labelStyle().text('NOTES', LEFT, y, { characterSpacing: 1.5 })
    y += 13
    doc.font('Helvetica').fontSize(9).fillColor(INK).text(data.notes, LEFT, y, { width: CONTENT_W })
    y = doc.y + 16
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  // Kept above the bottom margin (≈736pt) so pdfkit doesn't auto-add a page.
  const footerY = 696
  doc.moveTo(LEFT, footerY).lineTo(RIGHT, footerY).lineWidth(0.5).strokeColor(HAIRLINE).stroke()
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `Questions? ${BRAND.email}  ·  ${BRAND.website}`,
      LEFT,
      footerY + 10,
      { width: CONTENT_W, align: 'center' }
    )
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text('Thank you for working with THE LOST+UNFOUNDS.', LEFT, footerY + 22, {
      width: CONTENT_W,
      align: 'center',
    })

  doc.end()
  return done
}
