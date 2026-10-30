import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { verifyAdmin } from '../../lib/api-handlers/_admin-auth.js'
import { sendPhotographerInvite } from '../../lib/api-handlers/admin/photographer-invite.js'

/**
 * Admin panel → Gallery → Invite Photographer. The email itself lives in
 * lib/api-handlers/admin/photographer-invite.ts, shared with the
 * `invite_photographer` admin job.
 *
 * Admin-only: it mails an address taken from the request, from media@, so
 * without the gate it is a relay for anyone who finds the URL.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const { email, name } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const result = await sendPhotographerInvite(getSupabaseAdmin(), { email, name })
    if (!result.sent) {
      console.error('Failed to send invitation email:', result.error)
      // Still return success since the invitation is stored - admin can share the link manually
      return res.status(200).json({
        success: true,
        message: 'Invitation created but email delivery failed. Share this link manually:',
        inviteUrl: result.inviteUrl,
        emailError: result.error,
      })
    }

    return res.status(200).json({ success: true, message: 'Invitation sent', inviteUrl: result.inviteUrl })
  } catch (err: any) {
    console.error('Invite error:', err)
    return res.status(err?.status || 500).json({ error: err.message })
  }
}
