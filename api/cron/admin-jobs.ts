import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin } from '../../lib/api-handlers/_booking-payment-utils.js'
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js'
import { runAdminJob } from '../../lib/api-handlers/admin/_jobs.js'

/**
 * GET /api/cron/admin-jobs — every minute.
 *
 * Runs admin actions agents queued in `admin_jobs` through the Supabase
 * connector. Only Vercel's scheduler (CRON_SECRET) can trigger it; only the
 * actions in lib/api-handlers/admin/_jobs.ts can run.
 *
 * A job is run at most once. One left `running` past STALE_MS (the function
 * died mid-job) is marked failed, not retried: an email or transfer may
 * already have gone out, so a person checks before re-queuing it.
 */

const STALE_MS = 10 * 60 * 1000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const staleBefore = new Date(Date.now() - STALE_MS).toISOString()
  const { data: stale } = await supabase
    .from('admin_jobs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error: 'Timed out while running. It may have taken effect — check before re-queuing.',
    })
    .eq('status', 'running')
    .lt('started_at', staleBefore)
    .select('id')

  const { data: jobs, error } = await supabase.rpc('claim_admin_jobs', { p_limit: 5 })
  if (error) return res.status(500).json({ error: `claim failed: ${error.message}` })

  const ran: Array<{ id: string; action: string; status: string }> = []
  for (const job of jobs || []) {
    const outcome = await runAdminJob(supabase, job)
    await supabase
      .from('admin_jobs')
      .update({
        status: outcome.status,
        http_status: outcome.httpStatus ?? null,
        result: outcome.result === undefined ? null : outcome.result,
        error: outcome.error ?? null,
        finished_at: outcome.status === 'waiting_funds' ? null : new Date().toISOString(),
        not_before: outcome.retryAt || job.not_before,
      })
      .eq('id', job.id)
    ran.push({ id: job.id, action: job.action, status: outcome.status })
  }

  return res.status(200).json({ ran, staleFailed: (stale || []).length })
}
