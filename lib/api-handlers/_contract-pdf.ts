/**
 * Branded TLAU contract PDF, with signature blocks and a certificate of
 * completion.
 *
 * Same pure-JS pdfkit approach as the invoice generator (no native binary, so
 * it runs on Vercel serverless) and the same banner/typography, so a contract
 * and an invoice read as the same company's paperwork.
 *
 * The certificate page is the legally useful part: it reproduces the audit
 * trail (who, when, from what IP) so the signature can be defended later.
 */

import PDFDocument from 'pdfkit'
import { loadBannerBuffer, pngSize } from './_invoice-pdf.js'
import type { ContractRow, ContractSigner } from './_contracts-utils.js'

const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  tagline: 'CAN YOU SEE US?',
  website: 'thelostandunfounds.com',
  email: 'media@thelostandunfounds.com',
}

const INK = '#000000'
const MUTED = '#888888'

const LEFT = 56
const RIGHT = 556
const CONTENT_W = RIGHT - LEFT
const BOTTOM_LIMIT = 720

export interface ContractPdfEvent {
  event_type: string
  actor: string | null
  ip_address: string | null
  created_at: string
}

export interface ContractPdfData {
  contract: ContractRow
  signers: ContractSigner[]
  events: ContractPdfEvent[]
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'America/New_York',
    })
  } catch {
    return iso
  }
}

/**
 * Decode a `data:image/png;base64,...` signature into a Buffer pdfkit can
 * draw. Returns null on anything malformed rather than throwing — a contract
 * that renders without the ink is far better than one that 500s.
 */
function decodeSignature(dataUrl: string | null): Buffer | null {
  if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) return null
  try {
    const b64 = dataUrl.slice('data:image/png;base64,'.length)
    const buf = Buffer.from(b64, 'base64')
    return buf.length > 0 && pngSize(buf) ? buf : null
  } catch {
    return null
  }
}

export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  const { contract, signers, events } = data

  const doc = new PDFDocument({ size: 'LETTER', margin: LEFT, autoFirstPage: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // ── Brand banner ──────────────────────────────────────────────────────────
  let topShift = 0
  const bannerBuffer = await loadBannerBuffer()
  if (bannerBuffer) {
    const bannerTop = 40
    const size = pngSize(bannerBuffer)
    doc.image(bannerBuffer, LEFT, bannerTop, { width: CONTENT_W })
    // pdfkit does not advance doc.y for an image placed at explicit
    // coordinates, so derive the drawn height ourselves or the header prints
    // on top of the banner.
    const drawnHeight = size ? CONTENT_W * (size.height / size.width) : 166.7
    topShift = Math.max(0, bannerTop + drawnHeight + 16 - 56)
  } else {
    console.error(
      '[contract-pdf] BANNER MISSING — rendering an unbranded contract. ' +
      'Checked public/brand/banner.png. Fix before sending this to a client.'
    )
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20)
      .text(BRAND.name, LEFT, 56, { characterSpacing: 1 })
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const metaTop = bannerBuffer ? 60 : 82
  doc.fillColor(INK).font('Helvetica').fontSize(7.5)
    .text(BRAND.tagline, LEFT, metaTop + topShift, { characterSpacing: 1.5 })
  doc.fillColor(MUTED).fontSize(8).text(BRAND.website, LEFT, metaTop + 12 + topShift)

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20)
    .text('CONTRACT', LEFT, 56 + topShift, { width: CONTENT_W, align: 'right', characterSpacing: 2 })
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    .text(`Ref ${contract.id.slice(0, 8).toUpperCase()}`, LEFT, 82 + topShift, {
      width: CONTENT_W, align: 'right',
    })

  doc.moveTo(LEFT, 108 + topShift).lineTo(RIGHT, 108 + topShift)
    .lineWidth(1).strokeColor(INK).stroke()

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13)
    .text(contract.title.toUpperCase(), LEFT, 126 + topShift, {
      width: CONTENT_W, characterSpacing: 1,
    })

  doc.moveDown(1)

  // ── Body ──────────────────────────────────────────────────────────────────
  // The stored body is the exact text the signer agreed to. It is plain text
  // with blank-line paragraph breaks; a leading "## " marks a section heading.
  doc.font('Helvetica').fontSize(10).fillColor(INK)
  for (const block of String(contract.body || '').split(/\n{2,}/)) {
    const text = block.trim()
    if (!text) continue

    if (doc.y > BOTTOM_LIMIT) doc.addPage()

    if (text.startsWith('## ')) {
      doc.moveDown(0.6)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
        .text(text.slice(3).toUpperCase(), LEFT, doc.y, {
          width: CONTENT_W, characterSpacing: 1,
        })
      doc.moveDown(0.3)
      doc.font('Helvetica').fontSize(10).fillColor(INK)
      continue
    }

    doc.text(text, LEFT, doc.y, { width: CONTENT_W, align: 'left', lineGap: 2 })
    doc.moveDown(0.7)
  }

  // ── Signature blocks ──────────────────────────────────────────────────────
  const ordered = [...signers].sort((a, b) => a.sign_order - b.sign_order)

  for (const signer of ordered) {
    // A signature block must never straddle a page break.
    if (doc.y > BOTTOM_LIMIT - 130) doc.addPage()

    doc.moveDown(1.2)
    const blockTop = doc.y

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED)
      .text(signer.role.toUpperCase(), LEFT, blockTop, { characterSpacing: 1.5 })

    const inkTop = blockTop + 16
    const sigBuf = decodeSignature(signer.signature_data)

    if (sigBuf) {
      const size = pngSize(sigBuf)
      const maxW = 200
      const maxH = 56
      let w = maxW
      let h = maxH
      if (size) {
        const scale = Math.min(maxW / size.width, maxH / size.height)
        w = size.width * scale
        h = size.height * scale
      }
      doc.image(sigBuf, LEFT, inkTop + (maxH - h), { width: w, height: h })
    } else if (signer.status === 'signed' && signer.typed_name) {
      // Typed signatures render in an italic face so they read as a signature
      // rather than as body copy.
      doc.font('Helvetica-Oblique').fontSize(20).fillColor(INK)
        .text(signer.typed_name, LEFT, inkTop + 22)
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text('Not yet signed', LEFT, inkTop + 34)
    }

    const ruleY = inkTop + 62
    doc.moveTo(LEFT, ruleY).lineTo(LEFT + 240, ruleY)
      .lineWidth(0.75).strokeColor(INK).stroke()

    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
      .text(signer.name, LEFT, ruleY + 6, { width: 240 })
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(signer.email, LEFT, ruleY + 19, { width: 240 })

    // Date column, aligned to the same rule.
    doc.moveTo(LEFT + 280, ruleY).lineTo(RIGHT, ruleY)
      .lineWidth(0.75).strokeColor(INK).stroke()
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
      .text(signer.signed_at ? fmtDateTime(signer.signed_at) : '—', LEFT + 280, ruleY + 6, {
        width: CONTENT_W - 280,
      })
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Date signed', LEFT + 280, ruleY + 19)

    doc.y = ruleY + 38
  }

  // ── Certificate of completion ─────────────────────────────────────────────
  // Its own page: this is the evidence exhibit, and it should be separable
  // from the agreement itself.
  doc.addPage()

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13)
    .text('CERTIFICATE OF COMPLETION', LEFT, 56, { characterSpacing: 1.5 })
  doc.moveTo(LEFT, 78).lineTo(RIGHT, 78).lineWidth(1).strokeColor(INK).stroke()

  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
    .text(
      'This certificate records the electronic signature activity for the agreement above, ' +
      'as captured by ' + BRAND.website + '.',
      LEFT, 92, { width: CONTENT_W, lineGap: 1.5 }
    )

  let cy = 126
  const row = (label: string, value: string) => {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED)
      .text(label.toUpperCase(), LEFT, cy, { characterSpacing: 1.2, width: 150 })
    doc.font('Helvetica').fontSize(9.5).fillColor(INK)
      .text(value, LEFT + 150, cy, { width: CONTENT_W - 150 })
    cy += 20
  }

  row('Document', contract.title)
  row('Reference', contract.id)
  row('Status', contract.status.toUpperCase())
  row('Sent', fmtDateTime(contract.sent_at))
  row('Completed', fmtDateTime(contract.completed_at))

  cy += 10
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
    .text('SIGNERS', LEFT, cy, { characterSpacing: 1.5 })
  cy += 18

  for (const signer of ordered) {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
      .text(`${signer.name} — ${signer.email}`, LEFT, cy, { width: CONTENT_W })
    cy += 14
    const detail = [
      `Status: ${signer.status}`,
      signer.signed_at ? `Signed: ${fmtDateTime(signer.signed_at)}` : null,
      signer.ip_address ? `IP: ${signer.ip_address}` : null,
      signer.signature_type ? `Method: ${signer.signature_type === 'draw' ? 'drawn' : 'typed'}` : null,
      signer.consent_esign ? 'Consented to electronic signing' : null,
    ].filter(Boolean).join('  ·  ')
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(detail, LEFT, cy, { width: CONTENT_W, lineGap: 1 })
    cy = doc.y + 12
  }

  cy += 6
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK)
    .text('AUDIT TRAIL', LEFT, cy, { characterSpacing: 1.5 })
  cy += 18

  for (const ev of events) {
    if (cy > BOTTOM_LIMIT) {
      doc.addPage()
      cy = 56
    }
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(fmtDateTime(ev.created_at), LEFT, cy, { width: 150 })
    doc.font('Helvetica').fontSize(8.5).fillColor(INK)
      .text(
        `${ev.event_type.replace(/_/g, ' ')}${ev.actor ? ` — ${ev.actor}` : ''}` +
        `${ev.ip_address ? `  (${ev.ip_address})` : ''}`,
        LEFT + 150, cy, { width: CONTENT_W - 150 }
      )
    cy = Math.max(cy + 14, doc.y + 4)
  }

  // Footer. Writing near the page bottom would push pdfkit past its content
  // area and silently spawn a blank trailing page, so drop the bottom margin
  // for this one line and restore it immediately.
  const prevBottomMargin = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
    .text(
      `${BRAND.name}  ·  ${BRAND.email}  ·  ${BRAND.website}`,
      LEFT, doc.page.height - 60,
      { width: CONTENT_W, align: 'center', lineBreak: false }
    )
  doc.page.margins.bottom = prevBottomMargin

  doc.end()
  return done
}
