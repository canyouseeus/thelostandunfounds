import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveVerifiedAdmin, toMoney } from '../../lib/api-handlers/crew/_shared.js';
import { OWNER_AFFILIATE_CODE, findAffiliateByCode } from '../../lib/api-handlers/affiliates/_referral-tie.js';

/**
 * The owner's bitcoin stack, read only.
 *
 *   GET → what the site has paid the owner (his 10% and his own affiliate
 *         commissions), by month, plus his Strike bitcoin balance.
 *
 * Both kinds of pay land in his Stripe Connect account, which pays out daily
 * to his Strike account, where every deposit is auto-bought as bitcoin. So the
 * dollars here are the dollars that went to bitcoin, about two days later.
 *
 * The Strike balance needs STRIKE_STACK_READ_KEY: a key from his personal
 * Strike account with read scopes only (balances, rates). It is never the
 * business STRIKE_API_KEY that creates checkout invoices. The key's value is
 * never logged or returned, and only GET endpoints are called with it. With no
 * key, the card still shows the inflows and says what is missing.
 *
 * Financial records, so the gate is a verified Supabase session.
 */

const STRIKE_API = 'https://api.strike.me';
/** Strike's auto-withdrawal sends the whole balance once it reaches this. */
export const AUTO_WITHDRAW_BTC = 0.01;
const TZ = 'America/Chicago';

type Kind = 'owner_cut' | 'affiliate';
interface Inflow { at: string; kind: Kind; amount: number; label: string }

const monthOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7);

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface OwnerPayJob {
  payload: { amount?: unknown; source?: unknown } | null;
  result: { transferId?: unknown } | null;
  created_at: string;
  finished_at: string | null;
}
interface CommissionRow {
  amount: unknown;
  source: string | null;
  paid_at: string | null;
  updated_at: string | null;
  created_at: string;
}
interface StrikeBalance { currency?: string; current?: unknown; total?: unknown; available?: unknown; stacks?: { amount?: unknown }[] }
interface StrikeRate { sourceCurrency?: string; targetCurrency?: string; amount?: unknown }

const readable = (v: unknown) => String(v).replace(/_/g, ' ');

async function readInflows(): Promise<Inflow[]> {
  const supabase = getSupabaseAdmin();
  const out: Inflow[] = [];

  // His 10%: only jobs that finished with a transfer count. A queued or
  // waiting job has not paid him yet; a failed one never will.
  const { data: jobs, error: jobsError } = await supabase
    .from('admin_jobs')
    .select('payload, result, created_at, finished_at')
    .eq('action', 'owner_pay')
    .eq('status', 'done');
  if (jobsError) throw new Error(`owner pay: ${jobsError.message}`);
  for (const j of (jobs || []) as OwnerPayJob[]) {
    const amount = toMoney(j.payload?.amount);
    if (!(amount > 0) || !j.result?.transferId) continue;
    const source = j.payload?.source;
    out.push({
      at: j.finished_at || j.created_at,
      kind: 'owner_cut',
      amount,
      label: source ? `10% of ${readable(source)}` : '10% owner pay',
    });
  }

  // His own affiliate commissions, once paid out to him.
  const owner = await findAffiliateByCode(supabase, OWNER_AFFILIATE_CODE);
  if (owner) {
    const { data: commissions, error: cError } = await supabase
      .from('affiliate_commissions')
      .select('amount, source, paid_at, updated_at, created_at')
      .eq('affiliate_id', owner.id)
      .eq('status', 'paid');
    if (cError) throw new Error(`affiliate pay: ${cError.message}`);
    for (const c of (commissions || []) as CommissionRow[]) {
      const amount = toMoney(c.amount);
      if (!(amount > 0)) continue;
      out.push({
        at: c.paid_at || c.updated_at || c.created_at,
        kind: 'affiliate',
        amount,
        label: `Affiliate pay${c.source ? ` (${readable(c.source)})` : ''}`,
      });
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

type StrikeState =
  | { connected: true; btc: number; stacksBtc: number; priceUsd: number | null }
  | { connected: false; reason: 'not_configured' | 'key_rejected' | 'unavailable'; status?: number };

async function readStrike(): Promise<StrikeState> {
  const key = process.env.STRIKE_STACK_READ_KEY;
  if (!key) return { connected: false, reason: 'not_configured' };
  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' };

  try {
    const [balRes, rateRes] = await Promise.all([
      fetch(`${STRIKE_API}/v1/balances`, { method: 'GET', headers }),
      fetch(`${STRIKE_API}/v1/rates/ticker`, { method: 'GET', headers }),
    ]);
    if (!balRes.ok) {
      return {
        connected: false,
        reason: balRes.status === 401 || balRes.status === 403 ? 'key_rejected' : 'unavailable',
        status: balRes.status,
      };
    }
    const balances: StrikeBalance[] = await balRes.json().catch(() => []);
    const row = Array.isArray(balances) ? balances.find(b => b?.currency === 'BTC') : null;
    // `current` is the live balance; `total` is deprecated but still sent.
    const btc = num(row?.current) ?? num(row?.total) ?? num(row?.available) ?? 0;
    const stacksBtc = Array.isArray(row?.stacks)
      ? row.stacks.reduce((sum, s) => sum + (num(s?.amount) ?? 0), 0)
      : 0;

    let priceUsd: number | null = null;
    if (rateRes.ok) {
      const rates: StrikeRate[] = await rateRes.json().catch(() => []);
      const pair = Array.isArray(rates)
        ? rates.find(r => r?.sourceCurrency === 'BTC' && r?.targetCurrency === 'USD')
        : null;
      const p = num(pair?.amount);
      // Strike's docs don't define the pair's amount. Accept it only when it
      // reads as a dollar price for one bitcoin, rather than show a wrong value.
      if (p !== null && p > 1_000 && p < 10_000_000) priceUsd = p;
    }
    return { connected: true, btc, stacksBtc, priceUsd };
  } catch {
    return { connected: false, reason: 'unavailable' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await resolveVerifiedAdmin(req))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const [inflows, strike] = await Promise.all([readInflows(), readStrike()]);

    const byMonth = new Map<string, { ownerCut: number; affiliate: number }>();
    for (const i of inflows) {
      const m = monthOf(i.at);
      const row = byMonth.get(m) || { ownerCut: 0, affiliate: 0 };
      if (i.kind === 'owner_cut') row.ownerCut += i.amount; else row.affiliate += i.amount;
      byMonth.set(m, row);
    }
    const months = [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, r]) => ({
        month,
        ownerCut: toMoney(r.ownerCut),
        affiliate: toMoney(r.affiliate),
        total: toMoney(r.ownerCut + r.affiliate),
      }));

    const sum = (k?: Kind) => toMoney(inflows.filter(i => !k || i.kind === k).reduce((s, i) => s + i.amount, 0));
    const thisMonth = monthOf(new Date().toISOString());

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      inflows: {
        total: sum(),
        ownerCut: sum('owner_cut'),
        affiliate: sum('affiliate'),
        thisMonth: months.find(m => m.month === thisMonth)?.total ?? 0,
        thisMonthKey: thisMonth,
        months,
        recent: inflows.slice(0, 10),
      },
      strike,
      autoWithdrawBtc: AUTO_WITHDRAW_BTC,
    });
  } catch (err) {
    console.error('[bitcoin-stack]', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Could not load the bitcoin stack' });
  }
}
