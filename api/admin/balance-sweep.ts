import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { verifyAdmin, verifiedAdminEmail } from '../../lib/api-handlers/_admin-auth.js'
import { availablePaymentsCents, runBalanceSweep } from '../../lib/api-handlers/admin/_balance-sweep.js'

/**
 * The money tab's "Sweep now" button: the same split-and-sweep the Stripe
 * webhook and the 4:30 PM cron run, on demand.
 *
 * GET  — the plan, queueing nothing: what would go to King Midas, Secret
 *        Santa and business right now, what's held back and why, and a
 *        fingerprint of the numbers it was worked out from.
 * POST { fingerprint, requestId } — queue that plan's moves. Only a signed-in
 *        admin (a Supabase session on the admin list) can do this; the agent
 *        secret is not enough, because this moves money. If anything changed
 *        since the GET, the fingerprint no longer matches, nothing is queued
 *        and the new plan comes back with 409 so the owner confirms again.
 *        `requestId` is made once per confirm, so a double click or a retried
 *        request writes the same idempotency key and queues nothing twice.
 *
 * Like the cron, this only queues `move_funds` admin jobs; /api/cron/admin-jobs
 * makes the Stripe moves within a minute, re-checking the live balance first.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    if (!(await verifyAdmin(req))) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const run = await runBalanceSweep(getSupabaseAdmin(), availablePaymentsCents, { trigger: 'preview', dryRun: true })
      return res.status(200).json(run)
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const admin = await verifiedAdminEmail(req)
  if (!admin) return res.status(401).json({ error: 'Sign in as an admin to sweep' })

  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) || {}
  const fingerprint = String(body.fingerprint || '')
  const requestId = String(body.requestId || '')
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) return res.status(400).json({ error: 'Load the plan before confirming' })
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) return res.status(400).json({ error: 'Missing request id' })

  try {
    const run = await runBalanceSweep(getSupabaseAdmin(), availablePaymentsCents, {
      trigger: `manual-${requestId}`,
      expectFingerprint: fingerprint,
    })
    console.log('[balance-sweep] manual sweep by', admin, JSON.stringify(run.queued))
    if (run.stale) return res.status(409).json({ ...run, error: 'The balance changed since you looked. Check the new amounts and confirm again.' })
    return res.status(200).json(run)
  } catch (err) {
    console.error('[balance-sweep] manual sweep failed:', err instanceof Error ? err.message : err)
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
