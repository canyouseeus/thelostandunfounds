import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getStripe } from '../../lib/api-handlers/_booking-payment-utils.js'
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js'
import { loadSweepInputs, planSweep, sweepBlocker } from '../../lib/api-handlers/admin/_balance-sweep.js'

/**
 * GET /api/cron/balance-sweep — daily (vercel.json), after the King Midas
 * distribution.
 *
 * Splits the platform's available Payments balance into the King Midas pot,
 * the Secret Santa pot and the business account (see _balance-sweep.ts for
 * the rules). It moves no money itself: it queues `move_funds` admin jobs,
 * which /api/cron/admin-jobs runs within a minute through the same code the
 * hand-queued moves of 2026-10-21 used.
 *
 * Safe to run twice: each move's idempotency key is the Central date plus
 * the destination, so a second run the same day queues nothing, and it
 * refuses to plan while an earlier move is still queued or running.
 *
 * ?dryRun=1 returns the plan without queueing anything (cron secret only).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const dryRun = ['1', 'true'].includes(String(req.query.dryRun || ''))
  const supabase = getSupabaseAdmin()
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  try {
    const blocker = await sweepBlocker(supabase)
    if (blocker) {
      console.warn('[balance-sweep] skipped:', blocker)
      return res.status(200).json({ day, skipped: blocker })
    }

    const balance = await getStripe().balance.retrieve()
    const availableCents = (balance.available || [])
      .filter((b) => b.currency === 'usd')
      .reduce((s, b) => s + b.amount, 0)

    const plan = planSweep(await loadSweepInputs(supabase, availableCents))
    console.log('[balance-sweep] plan:', JSON.stringify({ day, dryRun, ...plan }))
    if (dryRun || plan.moves.length === 0) return res.status(200).json({ day, dryRun, plan, queued: [] })

    const notes = { king_midas: 'King Midas pot (daily sweep)', secret_santa: 'Secret Santa pot (daily sweep)', business: 'Remainder to business (daily sweep)' }
    const queued: Array<{ to: string; amount: number; jobId?: string; duplicate?: boolean }> = []
    for (const m of plan.moves) {
      const amount = m.cents / 100
      const { data, error } = await supabase
        .from('admin_jobs')
        .insert({
          action: 'move_funds',
          payload: { to: m.to, amount, note: notes[m.to] },
          requested_by: 'balance-sweep',
          note: `Daily sweep ${day}: $${amount.toFixed(2)} to ${m.to} of $${(availableCents / 100).toFixed(2)} available, $${(plan.reservedCents / 100).toFixed(2)} reserved`,
          idempotency_key: `balance-sweep-${day}-${m.to}`,
        })
        .select('id')
        .single()
      if (error?.code === '23505') { queued.push({ to: m.to, amount, duplicate: true }); continue }
      if (error) throw new Error(`queue ${m.to} failed: ${error.message}`)
      queued.push({ to: m.to, amount, jobId: data?.id })
    }
    console.log('[balance-sweep] queued:', JSON.stringify(queued))
    return res.status(200).json({ day, plan, queued })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[balance-sweep] failed:', message)
    return res.status(500).json({ day, error: message })
  }
}
