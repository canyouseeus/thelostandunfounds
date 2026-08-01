/**
 * Branded TLAU quote / invoice PDF generator.
 *
 * Pure-JS (pdfkit, no native binary) so it runs on Vercel serverless.
 * Monochrome / uppercase to match the TLAU "Noir" brand; white background
 * so it prints cleanly. The Stripe payment URL is rendered as a clickable
 * button annotation inside the document.
 */

import PDFDocument from 'pdfkit'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Canonical banner location, used only as a fallback when disk lookup misses. */
const BANNER_URL = 'https://www.thelostandunfounds.com/brand/banner.png'

/** Cached across invocations so a warm serverless container reads disk once. */
let cachedBanner: Buffer | null | undefined

/**
 * Fallback banner height in points, used only if the PNG header can't be read.
 * Matches the shipped 1500x500 asset drawn at CONTENT_W (500pt) wide.
 */
const DEFAULT_BANNER_HEIGHT = 166.7

/**
 * Read intrinsic pixel dimensions straight from a PNG's IHDR chunk.
 *
 * pdfkit exposes `doc.openImage()` at runtime but does not declare it in its
 * type definitions, so calling it fails the typecheck. The banner is a PNG we
 * ship ourselves, and the header is fixed-layout — width and height are two
 * big-endian uint32s at byte offset 16 — so parsing it directly is both typed
 * and dependency-free.
 */
function pngSize(buf: Buffer): { width: number; height: number } | null {
  // 8-byte signature + 4-byte length + 'IHDR' + 8 bytes of dimensions
  if (buf.length < 24) return null
  if (buf.readUInt32BE(0) !== 0x89504e47) return null // not a PNG
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null

  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  return width > 0 && height > 0 ? { width, height } : null
}

/**
 * Resolve the brand banner, preferring the copy bundled in the repo.
 * Returns null (never throws) if neither disk nor network yields the image —
 * the caller logs that case rather than failing the whole PDF.
 */
async function loadBannerBuffer(): Promise<Buffer | null> {
  if (cachedBanner !== undefined) return cachedBanner

  // Vercel's bundler and local dev resolve cwd differently; try both shapes.
  const candidates = [
    join(process.cwd(), 'public', 'brand', 'banner.png'),
    join(process.cwd(), 'brand', 'banner.png'),
  ]
  for (const path of candidates) {
    try {
      cachedBanner = await readFile(path)
      return cachedBanner
    } catch {
      // try the next candidate
    }
  }

  try {
    const res = await fetch(BANNER_URL)
    if (res.ok) {
      cachedBanner = Buffer.from(await res.arrayBuffer())
      return cachedBanner
    }
    console.warn(`[invoice-pdf] banner fetch returned HTTP ${res.status} from ${BANNER_URL}`)
  } catch (err: any) {
    console.warn(`[invoice-pdf] banner fetch failed: ${err?.message}`)
  }

  cachedBanner = null
  return cachedBanner
}

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
  /** Optional 'HH:MM:SS' (or 'HH:MM') from bookings.start_time. */
  startTime?: string | null
  /** Optional 'HH:MM:SS' (or 'HH:MM') from bookings.end_time. */
  endTime?: string | null
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
  /** Optional second payment link that charges the full project total. */
  fullPaymentUrl?: string | null
  clientName: string
  clientBusiness: string | null
  clientEmail: string | null
  notes?: string | null
}

const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  tagline: 'CAN YOU SEE US?',
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

function fmtDateWithWeekday(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return d
  }
}

/** Format a 'HH:MM[:SS]' (or '5:00 PM' already-formatted) into '5:00 PM'. */
function fmtTime(t: string | null | undefined): string | null {
  if (!t) return null
  const trimmed = String(t).trim()
  if (!trimmed) return null
  // If it already includes AM/PM, hand it back as-is.
  if (/AM|PM/i.test(trimmed)) return trimmed.toUpperCase()
  const m = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return trimmed
  const h24 = Number(m[1])
  const mm = m[2]
  if (Number.isNaN(h24)) return trimmed
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

function fmtTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const s = fmtTime(start)
  const e = fmtTime(end)
  if (s && e) return `${s} – ${e}`
  return s || e || null
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: LEFT, autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // ── Brand banner ──────────────────────────────────────────────────────────
  // Read from disk first. This used to fetch the banner over HTTP on every
  // render, which meant the single most recognisable brand element depended on
  // a network round trip succeeding at render time — and the failure was
  // swallowed, so a bannerless invoice went out looking structurally correct
  // with no error anywhere. That is exactly what happened to INV-004.
  //
  // The file ships in the repo at public/brand/banner.png, so bundle it rather
  // than fetching it. The HTTP fetch stays only as a fallback for environments
  // where the static asset isn't on disk, and a miss is now logged loudly.
  let topShift = 0
  const bannerBuffer = await loadBannerBuffer()
  if (bannerBuffer) {
    const bannerTop = 40
    const bannerGap = 16
    doc.image(bannerBuffer, LEFT, bannerTop, { width: CONTENT_W })

    // Derive the drawn height from the image's own aspect ratio. Do NOT use
    // doc.y here: pdfkit does not advance the cursor past an image placed at
    // explicit coordinates, so doc.y still points at the top of the page and
    // the header renders on top of the banner (dark text on black, unreadable).
    const size = pngSize(bannerBuffer)
    const drawnHeight = size ? CONTENT_W * (size.height / size.width) : DEFAULT_BANNER_HEIGHT
    topShift = Math.max(0, bannerTop + drawnHeight + bannerGap - 56)
  } else {
    console.error(
      '[invoice-pdf] BANNER MISSING — rendering an unbranded invoice. ' +
      'Checked disk (public/brand/banner.png) and ' + BANNER_URL + '. ' +
      'Fix before sending this document to a client.'
    )
  }

  // ── Header ────────────────────────────────────────────────────────────────
  // The banner artwork already contains the wordmark. Drawing BRAND.name as
  // text as well prints the brand name twice — once inside the image, once
  // beneath it. Only render the text wordmark when there is no banner.
  if (!bannerBuffer) {
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(BRAND.name, LEFT, 56 + topShift, { characterSpacing: 1 })
  }

  // Tagline + website sit beneath the text wordmark when it's present, and
  // move up to sit level with the document title when the banner supplies the
  // wordmark instead — otherwise the left column starts with a blank gap.
  const metaTop = bannerBuffer ? 60 : 82
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text(BRAND.tagline, LEFT, metaTop + topShift, { characterSpacing: 1.5 })
  doc.fillColor(MUTED).fontSize(8).text(BRAND.website, LEFT, metaTop + 12 + topShift)

  // Document title (right-aligned, same top line as the wordmark)
  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(data.docType, LEFT, 56 + topShift, { width: CONTENT_W, align: 'right', characterSpacing: 2 })
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text(data.invoiceNumber, LEFT, 82 + topShift, { width: CONTENT_W, align: 'right' })
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(`Issued ${fmtDate(data.date)}`, LEFT, 95 + topShift, { width: CONTENT_W, align: 'right' })

  doc.moveTo(LEFT, 120 + topShift).lineTo(RIGHT, 120 + topShift).lineWidth(1).strokeColor(INK).stroke()

  // ── Bill To / Event ───────────────────────────────────────────────────────
  let y = 138 + topShift
  const labelStyle = () => doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED)
  const valueStyle = () => doc.font('Helvetica').fontSize(10.5).fillColor(INK)

  labelStyle().text('BILL TO', LEFT, y, { characterSpacing: 1.5 })
  labelStyle().text('EVENT', LEFT + 280, y, { characterSpacing: 1.5 })
  y += 14
  valueStyle().font('Helvetica-Bold').text(data.clientName, LEFT, y, { width: 260 })
  const eventLineY = y
  valueStyle().text(fmtDateWithWeekday(data.eventDate), LEFT + 280, eventLineY, { width: 220 })
  y += 16
  const timeRange = fmtTimeRange(data.startTime, data.endTime)
  let eventY = eventLineY + 14
  if (timeRange) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(timeRange, LEFT + 280, eventY, { width: 220 })
    eventY += 13
  }
  if (data.clientBusiness) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(data.clientBusiness, LEFT, y, { width: 260 })
    y += 13
  }
  if (data.clientEmail) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(data.clientEmail, LEFT, y, { width: 260 })
    y += 13
  }
  y = Math.max(y, eventY) + 14

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

  // ── Pay buttons (clickable link annotations) ──────────────────────────────
  // If a full-payment link is provided, render two full-width black buttons
  // stacked vertically — guarantees both fit on the page and stay legible at
  // any zoom, and matches the brand's noir aesthetic (pure #000000 fill).
  // Otherwise fall back to the single "PAY {label}" button.
  const drawPayButton = (
    x: number,
    btnY: number,
    width: number,
    height: number,
    label: string,
    url: string
  ) => {
    // Pure black fill, no stroke — avoids any antialias greys at fill edges.
    doc.save()
    doc.rect(x, btnY, width, height).fill('#000000')
    doc.restore()
    // Center the label vertically inside the button.
    const fontPt = 12
    const textY = btnY + (height - fontPt) / 2 - 1
    doc
      .font('Helvetica-Bold')
      .fontSize(fontPt)
      .fillColor('#ffffff')
      .text(label, x, textY, {
        width,
        align: 'center',
        characterSpacing: 1,
        lineBreak: false,
      })
    doc.link(x, btnY, width, height, url)
  }

  if (data.paymentUrl && data.fullPaymentUrl) {
    const btnH = 44
    const gap = 10
    drawPayButton(
      LEFT,
      y,
      CONTENT_W,
      btnH,
      `PAY DEPOSIT — ${fmtUSD(data.amountDue)}  »`,
      data.paymentUrl
    )
    y += btnH + gap
    drawPayButton(
      LEFT,
      y,
      CONTENT_W,
      btnH,
      `PAY FULL AMOUNT — ${fmtUSD(data.total)}  »`,
      data.fullPaymentUrl
    )
    y += btnH + 10
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Secure payment via Stripe. Choose deposit or pay in full.', LEFT, y, {
        width: CONTENT_W,
        align: 'center',
      })
    y += 22
  } else if (data.paymentUrl) {
    const btnH = 44
    const btnY = y
    drawPayButton(
      LEFT,
      btnY,
      CONTENT_W,
      btnH,
      `PAY ${data.amountDueLabel.toUpperCase()}  »`,
      data.paymentUrl
    )
    y = btnY + btnH + 10
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Secure payment via Stripe. Or open this link:', LEFT, y, {
        width: CONTENT_W,
        align: 'center',
      })
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
