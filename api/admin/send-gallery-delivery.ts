import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js'
import { EMAIL_STYLES, renderImageButton } from '../../lib/email-template.js'

import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
/**
 * Tell a client their delivery gallery is ready, in the client's own words.
 *
 * `/api/gallery/invite` already mails an invited client, but its copy is fixed
 * and it is gated on a logged-in admin session (a Supabase bearer token), which
 * an unattended agent run does not have. So a delivery with anything specific
 * to say — extra frames included, a note about tips, an ask to rebook — had
 * nowhere to go except a hand-written send, which is exactly the raw-HTML path
 * brand-email-manager forbids.
 *
 * This is deliberately NOT a general send endpoint. The recipients are read
 * from the gallery's own invited_emails; the caller cannot name them. The only
 * address a caller may substitute is `testEmail`, and it must be an admin
 * address. So the worst a leaked admin header can do is mail a client their
 * own gallery link, or mail the owner — never a stranger. Widening it to an
 * arbitrary `to` would make it an open relay for our domain, which is the
 * trap the invite endpoint's own comment warns about.
 */

const ADMIN_EMAILS = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']
const SITE = 'https://www.thelostandunfounds.com'
// Business record — client correspondence stays on file regardless of who replies.
const RECORD_CC = 'media@thelostandunfounds.com'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The owner writes a note as plain text. Blank lines separate paragraphs; the
 * text is escaped first, so a stray < or & in a client's note cannot break the
 * markup or inject anything into the email.
 */
function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="${EMAIL_STYLES.paragraph}">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
    )
    .join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email, X-Admin-Secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  const { slug, message, testEmail, photoCount, videoNote, includeAffiliateCta, includeNewsletterCta } =
    (req.body || {}) as {
      slug?: string
      message?: string
      testEmail?: string
      photoCount?: number
      videoNote?: string
      // Fixed, hardcoded destinations only (/become-affiliate, the homepage) —
      // these two booleans toggle a real image button (brand-email-manager RULE:
      // buttons are images, never a bare URL in message text, which Gmail does
      // not reliably linkify and which never gets the branded black/white
      // button styling). Kept boolean rather than an arbitrary href so this
      // endpoint stays narrow — see the file header on why that matters.
      includeAffiliateCta?: boolean
      includeNewsletterCta?: boolean
    }

  if (!slug) return res.status(400).json({ error: 'slug is required' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials' })

  try {
    const supabase = createClient(url, key)
    const { data: library, error: libErr } = await supabase
      .from('photo_libraries')
      .select('id, name, slug, invited_emails')
      .eq('slug', slug)
      .maybeSingle()

    if (libErr) return res.status(500).json({ error: `Gallery lookup failed: ${libErr.message}` })
    if (!library) return res.status(404).json({ error: `No gallery with slug "${slug}"` })

    const invited = (library.invited_emails || '')
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)

    let recipients: string[]
    let isTest = false
    if (testEmail) {
      // A test may only ever go to us. Without this the endpoint would happily
      // mail any address handed to it, which is the whole thing being avoided.
      if (!ADMIN_EMAILS.includes(testEmail.toLowerCase())) {
        return res.status(400).json({
          error: 'testEmail must be an admin address',
          allowed: ADMIN_EMAILS,
        })
      }
      recipients = [testEmail]
      isTest = true
    } else {
      if (invited.length === 0) {
        return res.status(400).json({
          error: `Gallery "${slug}" has no invited_emails — nobody to deliver to`,
        })
      }
      recipients = invited
    }

    // Each recipient's button carries their own key (#k=), so tapping it signs
    // them in and opens the gallery. A test send to an address that isn't
    // invited gets a key that won't open it — the access page's email form is
    // the fallback. See lib/api-handlers/_gallery-access-link.ts.
    const { inviteUrl, inviteRecordUrl } = await import('../../lib/api-handlers/_gallery-access-link.js')
    const galleryUrl = inviteRecordUrl(library.slug)

    const count = typeof photoCount === 'number' && photoCount > 0 ? photoCount : null
    const intro = count
      ? `Your photos are ready — <strong>${count} edited images</strong>, up and waiting for you.`
      : 'Your photos are ready and waiting for you.'

    const note = typeof message === 'string' && message.trim() ? paragraphs(message) : ''

    const bodyFor = (openUrl: string) => `
      <h1 style="${EMAIL_STYLES.heading1}">YOUR PHOTOS ARE READY</h1>

      <p style="${EMAIL_STYLES.paragraph}">${intro}</p>

      ${note}

      ${renderImageButton(openUrl, 'btn-open-gallery', 'OPEN MY GALLERY')}

      <p style="${EMAIL_STYLES.paragraph}">
        Tap the button and the gallery opens — there's no password to create. Everything
        is full resolution and yours to download, print and post.
      </p>

      ${videoNote ? `<p style="${EMAIL_STYLES.paragraph}">${escapeHtml(videoNote)}</p>` : ''}

      <p style="${EMAIL_STYLES.paragraph}">
        The gallery doesn't expire — come back and pull anything you need, whenever you need it.
      </p>

      ${
        includeAffiliateCta
          ? `<p style="${EMAIL_STYLES.paragraph}">
               Know anyone who could use a photographer? <strong>THE AFFILIATE PROGRAM</strong> pays
               42% lifetime commission on anyone you send our way.
             </p>
             ${renderImageButton(`${SITE}/become-affiliate?ref=THELOSTANDUNFOUNDS`, 'btn-affiliate', 'JOIN THE AFFILIATE PROGRAM')}`
          : ''
      }

      ${
        includeNewsletterCta
          ? `<p style="${EMAIL_STYLES.paragraph}">
               Want to hear about future shoots and openings? Join the newsletter.
             </p>
             ${renderImageButton(SITE, 'btn-newsletter', 'JOIN THE NEWSLETTER')}`
          : ''
      }

      <hr style="${EMAIL_STYLES.divider}">

      <p style="${EMAIL_STYLES.muted}">
        GALLERY: ${escapeHtml(library.name)}<br>
        Questions? Just reply to this email, or reach us at ${RECORD_CC}.
      </p>
    `

    const baseSubject = `YOUR PHOTOS ARE READY: ${library.name} | THE LOST+UNFOUNDS`
    const subject = isTest ? `[TEST] ${baseSubject}` : baseSubject

    const results: Array<{ email: string; success: boolean; provider?: string; error?: string }> = []
    for (const to of recipients) {
      // No CC: this copy carries the recipient's personal key, and a CC would
      // let whoever reads it open their account.
      const r = await sendTransactionalEmail({
        to,
        subject,
        content: bodyFor(inviteUrl(library.slug, library.id, to)),
      })
      results.push({ email: to, success: r.success, provider: r.provider, error: r.error })
      // Business record (EMAIL SENDING RULE): media@ gets its own copy with the
      // plain access link, as it got the CC before (test sends included).
      if (r.success && to.toLowerCase() !== RECORD_CC) {
        const record = await sendTransactionalEmail({
          to: RECORD_CC,
          subject: `${subject} (copy — sent to ${to})`,
          content: bodyFor(galleryUrl),
        })
        if (!record.success) console.error(`[send-gallery-delivery] record copy for ${to} failed:`, record.error)
      }
    }

    const failed = results.filter((r) => !r.success)
    return res.status(200).json({
      success: failed.length === 0,
      test: isTest,
      gallery: library.slug,
      galleryUrl,
      recordCopyTo: RECORD_CC,
      recipients,
      results,
    })
  } catch (err: any) {
    console.error('[send-gallery-delivery] failed:', err)
    return res.status(500).json({ error: err?.message || 'Failed to send gallery delivery' })
  }
}
