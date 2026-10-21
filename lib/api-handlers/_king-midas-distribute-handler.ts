import { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from './_booking-payment-utils.js'
import { isCronAuthorized } from './crew/_shared.js'
import { verifyAdmin } from './_admin-auth.js'

/**
 * KING MIDAS daily payout — /api/shop/king-midas/distribute
 *
 * Runs once a day (vercel.json cron) for the Central day that just ended.
 * The work happens in the `distribute_king_midas` SQL function, in one
 * transaction: pot = 8% of the day's summed profit, 1st 50% / 2nd 30% /
 * 3rd 10% / everyone else splits 10%, winnings written as payable
 * commissions, and whatever nobody qualifies for goes to that year's
 * Secret Santa pot. A day pays at most once.
 *
 * ?date=YYYY-MM-DD runs a specific past Central day (admin or cron only).
 */

function centralYesterday(): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req) && !(await verifyAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const requested = (Array.isArray(req.query.date) ? req.query.date[0] : req.query.date) as string | undefined
  if (requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' })
  }
  const date = requested || centralYesterday()

  const { data, error } = await getSupabaseAdmin().rpc('distribute_king_midas', { p_date: date })
  if (error) {
    console.error('[king-midas] distribution failed:', error.message)
    return res.status(500).json({ error: error.message, date })
  }
  console.log('[king-midas] distribution:', JSON.stringify(data))
  return res.status(200).json(data)
}
