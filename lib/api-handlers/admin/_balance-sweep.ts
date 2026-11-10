import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '../_booking-payment-utils.js'

/** Available USD in the platform's Payments balance, in cents. */
export async function availablePaymentsCents(): Promise<number> {
  const balance = await getStripe().balance.retrieve()
  return (balance.available || []).filter((b) => b.currency === 'usd').reduce((s, b) => s + b.amount, 0)
}

/**
 * Daily Stripe balance sweep — what /api/cron/balance-sweep queues.
 *
 * Until this existed, nothing moved money out of the Payments balance on its
 * own: the King Midas / Secret Santa / business moves of 2026-10-21 were three
 * `move_funds` jobs an agent queued by hand on the owner's yes. This plans the
 * same three moves every day from the split rules already in the database,
 * and queues them as ordinary `move_funds` admin jobs, so the money moves
 * through the one code path that already does it (and its balance check).
 *
 * The rules are NOT new — they are read back from what the sale functions
 * already record (20261020000000_affiliate_profit_split.sql and
 * 20261021010000_king_midas_secret_santa_payouts.sql):
 *
 *   King Midas pot  = 8% of each day's summed affiliate-sale profit
 *                     (king_midas_daily_stats), less what the daily
 *                     distribution handed on to Secret Santa.
 *   Secret Santa    = every secret_santa_contributions row (3% of
 *                     affiliate-sale profit + King Midas leftovers), except
 *                     year-end carryovers, which are already in the account.
 *   Business        = whatever is left after the pots and everything the
 *                     platform still owes people out of this balance.
 *
 * Pots are funded CUMULATIVELY: target to date minus every move_funds job to
 * that account that is done or in flight. A short day funds what it can and
 * the next run catches up; a second run the same day finds nothing due.
 *
 * Reserved first, never swept (all still paid from the Payments balance):
 * unpaid affiliate commissions, open payout requests, unpaid crew payouts,
 * queued/waiting owner_pay and affiliate_payout jobs, and card deposits on
 * bookings not yet paid in full (crew pay at completion may need them).
 */

/** Below this a pot top-up waits for the next run. */
export const MIN_POT_MOVE_CENTS = 100
/** Below this the business sweep waits for the next run. */
export const MIN_BUSINESS_MOVE_CENTS = 500

export interface SweepInputs {
  availableCents: number
  /** King Midas pot owed to date, before what has been moved. */
  kingMidasTargetCents: number
  secretSantaTargetCents: number
  /** move_funds done or in flight, by destination. */
  movedCents: { king_midas: number; secret_santa: number }
  /** Money still owed to people out of the Payments balance. */
  reserves: Record<string, number>
}

export interface SweepPlan {
  availableCents: number
  reservedCents: number
  reserves: Record<string, number>
  kingMidasDueCents: number
  secretSantaDueCents: number
  moves: Array<{ to: 'king_midas' | 'secret_santa' | 'business'; cents: number }>
  /** Why a due amount was not moved this run, if it wasn't. */
  held: string[]
}

/** Pure: given the numbers, what to move. Order: reserves, King Midas, Secret Santa, business. */
export function planSweep(input: SweepInputs): SweepPlan {
  const clamp = (n: number) => Math.max(0, Math.round(n))
  const reservedCents = clamp(Object.values(input.reserves).reduce((s, n) => s + n, 0))
  const kingMidasDueCents = clamp(input.kingMidasTargetCents - input.movedCents.king_midas)
  const secretSantaDueCents = clamp(input.secretSantaTargetCents - input.movedCents.secret_santa)

  let left = clamp(input.availableCents - reservedCents)
  const moves: SweepPlan['moves'] = []
  const held: string[] = []

  const km = Math.min(kingMidasDueCents, left)
  if (km >= MIN_POT_MOVE_CENTS) { moves.push({ to: 'king_midas', cents: km }); left -= km }
  else if (kingMidasDueCents > 0) held.push(`King Midas $${(kingMidasDueCents / 100).toFixed(2)} due, $${(km / 100).toFixed(2)} movable`)

  const ss = Math.min(secretSantaDueCents, left)
  if (ss >= MIN_POT_MOVE_CENTS) { moves.push({ to: 'secret_santa', cents: ss }); left -= ss }
  else if (secretSantaDueCents > 0) held.push(`Secret Santa $${(secretSantaDueCents / 100).toFixed(2)} due, $${(ss / 100).toFixed(2)} movable`)

  // Business only gets money once both pots are fully funded, so a pot that
  // fell short is made whole from the next day's income first.
  const potsFunded = km === kingMidasDueCents && ss === secretSantaDueCents
  if (potsFunded && left >= MIN_BUSINESS_MOVE_CENTS) moves.push({ to: 'business', cents: left })
  else if (left > 0) held.push(potsFunded ? `Business $${(left / 100).toFixed(2)} under the $${(MIN_BUSINESS_MOVE_CENTS / 100).toFixed(2)} minimum` : 'Business waits until both pots are funded')

  return {
    availableCents: input.availableCents, reservedCents, reserves: input.reserves,
    kingMidasDueCents, secretSantaDueCents, moves, held,
  }
}

const cents = (v: unknown) => Math.round(Number(v || 0) * 100)
type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
const sumCents = (rows: Row[] | null | undefined, key = 'amount') =>
  (rows || []).reduce((s, r) => s + cents(r[key]), 0)

async function rows<T = Row>(q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await q
  // Fail the whole run rather than sweep on a partial picture.
  if (error) throw new Error(`${what}: ${error.message}`)
  return data || []
}

/** Read the split targets, moves so far and reserves from the database. */
export async function loadSweepInputs(supabase: SupabaseClient, availableCents: number): Promise<SweepInputs> {
  const [stats, contributions, moveJobs, commissions, payoutRequests, crew, payJobs, deposits] = await Promise.all([
    rows(supabase.from('king_midas_daily_stats').select('date, profit_generated').gt('profit_generated', 0), 'king_midas_daily_stats'),
    rows(supabase.from('secret_santa_contributions').select('amount, reason'), 'secret_santa_contributions'),
    rows(supabase.from('admin_jobs').select('payload, status').eq('action', 'move_funds').in('status', ['queued', 'running', 'done']), 'admin_jobs move_funds'),
    rows(supabase.from('affiliate_commissions').select('amount').in('status', ['pending', 'approved', 'confirmed']), 'affiliate_commissions'),
    rows(supabase.from('payout_requests').select('amount').in('status', ['pending', 'approved']), 'payout_requests'),
    rows(supabase.from('crew_payouts').select('amount').in('status', ['pending', 'approved']), 'crew_payouts'),
    rows(supabase.from('admin_jobs').select('payload').in('action', ['owner_pay', 'affiliate_payout']).in('status', ['queued', 'running', 'waiting_funds']), 'admin_jobs pay'),
    rows(supabase.from('bookings').select('deposit_amount_cents').not('deposit_paid_at', 'is', null).is('paid_at', null).not('status', 'in', '(cancelled,declined,test,paid)'), 'bookings deposits'),
  ])

  // King Midas: 8% of each day's summed profit, rounded per day like distribute_king_midas.
  const profitByDay = new Map<string, number>()
  for (const s of stats) profitByDay.set(String(s.date), (profitByDay.get(String(s.date)) || 0) + cents(s.profit_generated))
  let kmTarget = 0
  for (const dayCents of profitByDay.values()) kmTarget += Math.round(dayCents * 0.08)

  let ssTarget = 0
  for (const c of contributions) {
    const reason = String(c.reason || '')
    if (reason.startsWith('carryover')) continue
    ssTarget += cents(c.amount)
    // Handed from the King Midas pot to Secret Santa: counted once, in Secret Santa.
    if (reason.startsWith('king_midas_unassigned')) kmTarget -= cents(c.amount)
  }

  const moved = { king_midas: 0, secret_santa: 0 }
  for (const j of moveJobs) {
    const to = j.payload?.to
    if (to === 'king_midas' || to === 'secret_santa') moved[to] += cents(j.payload?.amount)
  }

  return {
    availableCents,
    kingMidasTargetCents: kmTarget,
    secretSantaTargetCents: ssTarget,
    movedCents: moved,
    reserves: {
      affiliateCommissions: sumCents(commissions),
      payoutRequests: sumCents(payoutRequests),
      crewPayouts: sumCents(crew),
      queuedPayJobs: payJobs.reduce((s, j) => s + cents(j.payload?.amount), 0),
      openBookingDeposits: deposits.reduce((s, d) => s + Math.round(Number(d.deposit_amount_cents || 0)), 0),
    },
  }
}

/**
 * Refuse to plan while a move could still be in flight or may have half
 * happened: a queued/running move isn't in Stripe's balance yet, and a move
 * that timed out mid-run may have paid out without being recorded.
 */
export async function sweepBlocker(supabase: SupabaseClient): Promise<string | null> {
  const open = await rows(supabase.from('admin_jobs').select('id, status').eq('action', 'move_funds').in('status', ['queued', 'running']), 'admin_jobs open moves')
  if (open.length) return `${open.length} move_funds job(s) still queued or running`
  const stuck = await rows(supabase.from('admin_jobs').select('id').eq('action', 'move_funds').eq('status', 'failed').like('error', 'Timed out%'), 'admin_jobs timed-out moves')
  if (stuck.length) return `move_funds job ${stuck[0].id} timed out and may have taken effect — check Stripe and cancel or fix it before sweeps resume`
  return null
}

export interface SweepRun {
  trigger: string
  skipped?: string
  plan?: SweepPlan
  queued: Array<{ to: string; amount: number; jobId?: string; duplicate?: boolean }>
}

/**
 * Plan and queue one sweep. Called by the Stripe webhook when funds become
 * available (`trigger` = the event id) and by the daily cron backstop
 * (`trigger` = `cron-<Central date>`).
 *
 * No double moves, even when two runs overlap:
 *  - a pot move's idempotency key is the amount already moved plus the
 *    target it funds up to, so two runs that see the same state write the
 *    same key and the database refuses the second;
 *  - a business move's key is the trigger, so a redelivered webhook event
 *    queues nothing, and two different triggers racing can't both pay out
 *    in full because move_funds re-checks the live balance before each payout.
 */
export async function runBalanceSweep(
  supabase: SupabaseClient,
  getAvailableCents: () => Promise<number>,
  opts: { trigger: string; dryRun?: boolean }
): Promise<SweepRun> {
  const run: SweepRun = { trigger: opts.trigger, queued: [] }
  const blocker = await sweepBlocker(supabase)
  if (blocker) { run.skipped = blocker; console.warn('[balance-sweep] skipped:', JSON.stringify(run)); return run }

  const availableCents = await getAvailableCents()
  const inputs = await loadSweepInputs(supabase, availableCents)
  const plan = planSweep(inputs)
  run.plan = plan
  console.log('[balance-sweep] plan:', JSON.stringify({ trigger: opts.trigger, dryRun: !!opts.dryRun, ...plan }))
  if (opts.dryRun || plan.moves.length === 0) return run

  const notes = { king_midas: 'King Midas pot (sweep)', secret_santa: 'Secret Santa pot (sweep)', business: 'Remainder to business (sweep)' }
  for (const m of plan.moves) {
    const amount = m.cents / 100
    const key = m.to === 'business'
      ? `balance-sweep-business-${opts.trigger}`
      : `balance-sweep-${m.to}-from-${inputs.movedCents[m.to]}-to-${m.to === 'king_midas' ? inputs.kingMidasTargetCents : inputs.secretSantaTargetCents}`
    const { data, error } = await supabase
      .from('admin_jobs')
      .insert({
        action: 'move_funds',
        payload: { to: m.to, amount, note: notes[m.to] },
        requested_by: 'balance-sweep',
        note: `Sweep (${opts.trigger}): $${amount.toFixed(2)} to ${m.to} of $${(availableCents / 100).toFixed(2)} available, $${(plan.reservedCents / 100).toFixed(2)} reserved`,
        idempotency_key: key,
      })
      .select('id')
      .single()
    if (error?.code === '23505') { run.queued.push({ to: m.to, amount, duplicate: true }); continue }
    if (error) throw new Error(`queue ${m.to} failed: ${error.message}`)
    run.queued.push({ to: m.to, amount, jobId: data?.id })
  }
  console.log('[balance-sweep] queued:', JSON.stringify(run.queued))
  return run
}
