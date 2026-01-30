import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const toMoney = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
};

async function getPayoutHistory(supabase: SupabaseClient, affiliateId: string) {
    const { data, error } = await supabase
        .from('payout_requests')
        .select('id, amount, status, created_at, paid_at, paypal_batch_id, notes, error_message')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return data.map(payout => ({
        id: payout.id,
        date_requested: payout.created_at,
        date_paid: payout.paid_at,
        amount: toMoney(Number(payout.amount)),
        status: payout.status,
        method: 'PayPal', // Currently only PayPal supported
        transaction_id: payout.paypal_batch_id,
        notes: payout.notes,
        error: payout.error_message
    }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables for payout-history');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });

    const affiliateId = req.query.affiliate_id as string;
    const affiliateCode = req.query.affiliate_code as string;

    if (!affiliateId && !affiliateCode) {
        return res.status(400).json({ error: 'affiliate_id or affiliate_code is required' });
    }

    try {
        let targetAffiliateId = affiliateId;

        // specific lookup if only code provided
        if (!targetAffiliateId && affiliateCode) {
            const { data: affiliate } = await supabase
                .from('affiliates')
                .select('id')
                .or(`code.eq.${affiliateCode},affiliate_code.eq.${affiliateCode}`)
                .maybeSingle();

            if (affiliate) {
                targetAffiliateId = affiliate.id;
            } else {
                return res.status(404).json({ error: 'Affiliate not found' });
            }
        }

        const history = await getPayoutHistory(supabase, targetAffiliateId);

        return res.status(200).json({
            success: true,
            data: history
        });

    } catch (error: any) {
        console.error('Payout history error:', error);
        return res.status(500).json({
            error: 'Failed to fetch payout history',
            message: error?.message || 'Unknown error'
        });
    }
}
