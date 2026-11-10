import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js'
import { availablePaymentsCents, runBalanceSweep } from '../../lib/api-handlers/admin/_balance-sweep.js'

/**
 * GET /api/cron/balance-sweep — daily at 4:30 PM Central (vercel.json), the
 * backstop for the sweep the Stripe webhook runs each time funds become
 * available (balance.available).
 *
 * Splits the platform's available Payments balance into the King Midas pot,
 * the Secret Santa pot and the business account (see _balance-sweep.ts for
 * the rules and the no-double-move guarantees). It moves no money itself: it
 * queues `move_funds` admin jobs, which /api/cron/admin-jobs runs within a
 * minute.
 *
 * ?dryRun=1 returns the plan without queueing anything (cron secret only).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const dryRun = ['1', 'true'].includes(String(req.query.dryRun || ''))
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  try {
    const run = await runBalanceSweep(getSupabaseAdmin(), availablePaymentsCents, { trigger: `cron-${day}`, dryRun })
    return res.status(200).json({ day, dryRun, ...run })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[balance-sweep] failed:', message)
    return res.status(500).json({ day, error: message })
  }
}
