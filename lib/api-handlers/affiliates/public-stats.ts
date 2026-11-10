import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Public program totals for the /become-affiliate page.
 * Aggregates only — never returns a row, a code or an amount tied to one affiliate.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables for public-stats');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });

    try {
        const [affiliatesResult, payoutsResult] = await Promise.all([
            supabase
                .from('affiliates')
                .select('created_at', { count: 'exact' })
                .eq('status', 'active'),
            supabase
                .from('payout_requests')
                .select('amount, paid_at, processed_at, updated_at')
                .eq('status', 'paid'),
        ]);

        if (affiliatesResult.error) throw affiliatesResult.error;
        if (payoutsResult.error) throw payoutsResult.error;

        const totalPaidOut = (payoutsResult.data || []).reduce((sum, p) => {
            const amt = Number(p.amount);
            return Number.isFinite(amt) ? sum + amt : sum;
        }, 0);

        const history = buildMonthlyHistory(
            (affiliatesResult.data || []).map((a) => a.created_at as string | null),
            (payoutsResult.data || []).map((p) => ({
                date: (p.paid_at || p.processed_at || p.updated_at) as string | null,
                amount: Number(p.amount),
            })),
        );

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({
            total_affiliates: affiliatesResult.count || 0,
            total_paid_out: Math.round(totalPaidOut * 100) / 100,
            history,
        });
    } catch (error) {
        console.error('Public affiliate stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch affiliate stats' });
    }
}

/** Month key in UTC, e.g. "2026-10". */
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Running totals per month, from the first enrollment or payout up to this month.
 * Program-wide only: enrollments are counted and payouts summed per month,
 * so no row, code or name ever leaves this handler.
 */
export function buildMonthlyHistory(
    enrollments: (string | null)[],
    payouts: { date: string | null; amount: number }[],
    now: Date = new Date(),
): { month: string; affiliates: number; paid_out: number }[] {
    const joined = new Map<string, number>();
    const paid = new Map<string, number>();
    let firstMs = Infinity;

    const note = (iso: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return null;
        firstMs = Math.min(firstMs, d.getTime());
        return monthKey(d);
    };

    for (const iso of enrollments) {
        const k = note(iso);
        if (k) joined.set(k, (joined.get(k) || 0) + 1);
    }
    for (const p of payouts) {
        const k = note(p.date);
        if (k && Number.isFinite(p.amount)) paid.set(k, (paid.get(k) || 0) + p.amount);
    }
    if (!Number.isFinite(firstMs)) return [];
    const first = new Date(firstMs);

    const out: { month: string; affiliates: number; paid_out: number }[] = [];
    const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
    const end = monthKey(now);
    let affiliates = 0;
    let paidOut = 0;
    // Hard stop keeps a bad date from looping for long.
    for (let i = 0; i < 240; i++) {
        const k = monthKey(cursor);
        affiliates += joined.get(k) || 0;
        paidOut += paid.get(k) || 0;
        out.push({ month: k, affiliates, paid_out: Math.round(paidOut * 100) / 100 });
        if (k >= end) break;
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return out;
}
