/**
 * One-off: re-issue Kelly's gallery access link.
 *
 * Follows the send-silva-star-proposal pattern — the recipient and gallery are
 * fixed in code, so this endpoint cannot be pointed at anyone else. The general
 * invite path (/api/gallery/invite) is admin-gated and is what should be used
 * for every future send; this file exists only to deliver this one message and
 * is safe to delete afterwards.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { EMAIL_STYLES } from '../../email-template.js'
import { sendTransactionalEmail } from '../_resend-email-handler.js'

const CLIENT_EMAIL = 'kelly@rubyhopehomesolutions.com'
const BUSINESS_CC = 'media@thelostandunfounds.com'
const GALLERY_NAME = 'AIRBNB — PEASE PARKSIDE'
const ACCESS_URL = 'https://www.thelostandunfounds.com/gallery/airbnb-pease-parkside/access'
const SUBJECT = `YOUR GALLERY IS OPEN: ${GALLERY_NAME} | THE LOST+UNFOUNDS`

const bodyContent = `
  <h1 style="${EMAIL_STYLES.heading1}">YOUR GALLERY IS OPEN</h1>

  <p style="${EMAIL_STYLES.paragraph}">
    Kelly —
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    We've made some updates to how gallery access works, so your old link is out of date.
    Here's a new one for your photos from <strong style="color: #ffffff;">${GALLERY_NAME}</strong>.
  </p>

  <div style="margin: 40px 0;">
    <a href="${ACCESS_URL}" style="${EMAIL_STYLES.button}">OPEN MY GALLERY</a>
  </div>

  <p style="${EMAIL_STYLES.paragraph}">
    Enter this email address — <strong style="color: #ffffff;">${CLIENT_EMAIL}</strong> — and we'll
    send you a sign-in link. There's no password to create.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    These photos stay available to you. There's no 30-day window and no expiry — come back and pull
    anything you need, whenever you need it.
  </p>

  <hr style="${EMAIL_STYLES.divider}">

  <p style="${EMAIL_STYLES.muted}">
    GALLERY: ${GALLERY_NAME}<br>
    Questions? Reply to this email or reach us at media@thelostandunfounds.com.<br>
    THE LOST AND UNFOUNDS LLC.
  </p>
`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ?test=1 sends to the business address only, so the copy can be checked
  // without mailing the client.
  const isTest = req.query.test === '1'
  const to = isTest ? BUSINESS_CC : CLIENT_EMAIL

  const result = await sendTransactionalEmail({
    to,
    cc: isTest ? undefined : BUSINESS_CC,
    subject: SUBJECT,
    content: bodyContent,
  })

  return res.status(result.success ? 200 : 500).json({
    success: result.success,
    to,
    cc: isTest ? null : BUSINESS_CC,
    provider: result.provider,
    error: result.error,
  })
}
