import type { VercelRequest, VercelResponse } from '@vercel/node'
import { EMAIL_STYLES } from '../../email-template.js'
import { sendTransactionalEmail } from '../_resend-email-handler.js'

const CLIENT_EMAIL = 'danielsilvaatx@gmail.com'
const TEST_EMAIL = 'thelostandunfounds@gmail.com'
const SUBJECT = 'YOUR PROPOSAL IS READY | SILVA STAR WATER SOLUTIONS × THE LOST+UNFOUNDS'
const PROPOSAL_URL = 'https://www.thelostandunfounds.com/silva-star/proposal'

const bodyContent = `
  <h1 style="${EMAIL_STYLES.heading1}">YOUR PROPOSAL IS READY</h1>

  <p style="${EMAIL_STYLES.paragraph}">
    Daniel —
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Your custom proposal is live. It covers everything we discussed: the website build, the service dashboard, invoicing with Stripe, the built-in referral program, and the full pricing breakdown — flat-rate fees, no surprises.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Review it at your own pace. All three pages are there: cover, scope, and investment with next steps.
  </p>

  <div style="margin: 40px 0;">
    <a href="${PROPOSAL_URL}" style="${EMAIL_STYLES.button}">VIEW PROPOSAL →</a>
  </div>

  <p style="${EMAIL_STYLES.paragraph}">
    To accept, reply with <strong style="color: #ffffff;">“approved”</strong> and we will send the deposit invoice within the hour. The deposit is $1,000 — balance due on launch day. Site goes live within 3 weeks of deposit clearing.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    Questions? Text or call — (512) 967-2787. We will be in touch.
  </p>

  <hr style="${EMAIL_STYLES.divider}">

  <p style="${EMAIL_STYLES.muted}">
    PROPOSAL · SILVA STAR WATER SOLUTIONS<br>
    Prepared by Joshua Greene · THE LOST AND UNFOUNDS LLC.<br>
    Valid through July 31, 2026
  </p>
`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const recipients = [CLIENT_EMAIL, TEST_EMAIL]
  const results: Array<{ to: string; success: boolean; provider?: string; error?: string }> = []

  for (const to of recipients) {
    const result = await sendTransactionalEmail({ to, subject: SUBJECT, content: bodyContent })
    results.push({ to, success: result.success, provider: result.provider, error: result.error })
  }

  const allSuccess = results.every(r => r.success)
  const status = allSuccess ? 200 : 207

  return res.status(status).json({ success: allSuccess, results })
}
