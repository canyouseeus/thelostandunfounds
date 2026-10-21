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
                .select('id', { count: 'exact', head: true })
                .eq('status', 'active'),
            supabase
                .from('payout_requests')
                .select('amount')
                .eq('status', 'paid'),
        ]);

        if (affiliatesResult.error) throw affiliatesResult.error;
        if (payoutsResult.error) throw payoutsResult.error;

        const totalPaidOut = (payoutsResult.data || []).reduce((sum, p) => {
            const amt = Number(p.amount);
            return Number.isFinite(amt) ? sum + amt : sum;
        }, 0);

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({
            total_affiliates: affiliatesResult.count || 0,
            total_paid_out: Math.round(totalPaidOut * 100) / 100,
        });
    } catch (error) {
        console.error('Public affiliate stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch affiliate stats' });
    }
}
