import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createPayoutBatch, isPayoutsEnabled } from '../../lib/api-handlers/admin/paypal-payouts.js';
import { sendZohoEmail, getZohoAuthContext } from '../../lib/api-handlers/_zoho-email-utils.js';

/**
 * King Midas Daily Payout Automation
 * 
 * Logic:
 * 1. Runs daily (triggered by Vercel Cron).
 * 2. Calculates yesterday's date.
 * 3. Sums total profit for yesterday to determine the "Pot" (8%).
 * 4. Identifies Top 3 Rankers from `king_midas_daily_stats`.
 * 5. Executes instant PayPal payouts for them.
 * 6. Logs to `payout_requests`.
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const POT_PERCENTAGE = 0.08; // 8% of daily profit
const DISTRIBUTION = {
    1: 0.50, // 50% to 1st place
    2: 0.30, // 30% to 2nd place
    3: 0.10, // 10% to 3rd place
    // Remaining 10% is "House/Rollover" or distributed to runners-up (currently unallocated)
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify cron secret
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Determine "Yesterday"
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        console.log(`👑 King Midas Payouts: Processing for date ${dateStr}`);

        // 2. Fetch Daily Stats for Yesterday
        const { data: stats, error: statsError } = await supabase
            .from('king_midas_daily_stats')
            .select('affiliate_id, profit_generated, rank, affiliates!inner(id, affiliate_code, user_id)')
            .eq('date', dateStr);

        if (statsError) throw statsError;

        if (!stats || stats.length === 0) {
            console.log('No stats found for yesterday. Skipping payouts.');
            return res.status(200).json({ message: 'No stats found', date: dateStr });
        }

        // 3. Calculate Pot
        const totalDailyProfit = stats.reduce((sum, s) => sum + (s.profit_generated || 0), 0);
        const potAmount = totalDailyProfit * POT_PERCENTAGE;

        console.log(`💰 Total Profit: $${totalDailyProfit.toFixed(2)} | Pot Size (8%): $${potAmount.toFixed(2)}`);

        if (potAmount <= 0) {
            return res.status(200).json({ message: 'Pot is zero. No payouts.', date: dateStr });
        }

        // 4. Identify Winners (Rank 1, 2, 3)
        const winners = stats
            .filter(s => s.rank && s.rank <= 3)
            .sort((a, b) => (a.rank || 99) - (b.rank || 99));

        if (winners.length === 0) {
            return res.status(200).json({ message: 'No ranked winners found.', date: dateStr });
        }

        // 5. Prepare Payout Items
        const payoutItems = [];
        const payoutRecords = [];

        for (const winner of winners) {
            if (!winner.rank) continue;

            const share = DISTRIBUTION[winner.rank as 1 | 2 | 3] || 0;
            const prizeAmount = Number((potAmount * share).toFixed(2));

            if (prizeAmount <= 0) continue;

            // Fetch PayPal Email for this affiliate
            const { data: settings } = await supabase
                .from('affiliate_payout_settings')
                .select('paypal_email')
                .eq('affiliate_id', winner.affiliate_id)
                .single();

            if (!settings?.paypal_email) {
                console.warn(`⚠️ Winner #${winner.rank} (Affiliate: ${winner.affiliate_id}) has no PayPal email. Skipping auto-payout.`);
                // TODO: Create a "pending" payout request so they can claim it later?
                // For now, we skip auto-pay but could insert a 'approved' request.
                continue;
            }

            // Add to PayPal Batch
            payoutItems.push({
                requestId: `KM_${dateStr}_Rank${winner.rank}_${winner.affiliate_id}`,
                affiliateCode: (winner.affiliates as any)?.affiliate_code || 'Unknown',
                amount: prizeAmount,
                currency: 'USD',
                paypalEmail: settings.paypal_email,
                note: `🏆 King Midas Payout: Rank #${winner.rank} for ${dateStr}!`
            });

            // Prepare DB Record
            payoutRecords.push({
                affiliate_id: winner.affiliate_id,
                user_id: (winner.affiliates as any)?.user_id,
                affiliate_code: (winner.affiliates as any)?.affiliate_code,
                amount: prizeAmount,
                paypal_email: settings.paypal_email,
                status: 'paid', // Optimistic, will update if fail
                notes: `King Midas Rank #${winner.rank} (${dateStr})`,
                created_at: new Date().toISOString()
            });
        }

        if (payoutItems.length === 0) {
            return res.status(200).json({ message: 'No eligible winners with PayPal emails found.', date: dateStr });
        }

        // 6. Execute Payouts (if enabled)
        if (!isPayoutsEnabled()) {
            console.log('PayPal payouts disabled. Creating "approved" requests instead.');

            // Insert as 'approved' so cron picks them up later or admin pays manually
            const manualRecords = payoutRecords.map(r => ({ ...r, status: 'approved' }));
            const { error: insertError } = await supabase.from('payout_requests').insert(manualRecords);

            if (insertError) throw insertError;

            return res.status(200).json({
                message: 'Payouts disabled. Created approved requests.',
                count: manualRecords.length
            });
        }

        // Call PayPal
        let batchResult;
        try {
            batchResult = await createPayoutBatch(payoutItems);
        } catch (paypalError: any) {
            console.error('King Midas Payout FAILED:', paypalError);
            const errorMessage = paypalError?.message || 'Unknown PayPal error';

            // 1. Insert "Failed" records for visibility
            const failedRecords = payoutRecords.map(r => ({
                ...r,
                status: 'failed',
                error_message: errorMessage,
                notes: `FAILED King Midas: ${errorMessage}`
            }));
            await supabase.from('payout_requests').insert(failedRecords);

            // 2. Alert Admin
            try {
                const auth = await getZohoAuthContext();
                await sendZohoEmail({
                    auth,
                    to: auth.fromEmail,
                    subject: '🚨 CRITICAL: King Midas Automated Payout Failed',
                    htmlContent: `
                <h2>King Midas Payout Failed</h2>
                <p>The automated daily payout for <strong>${dateStr}</strong> failed.</p>
                <ul>
                    <li><strong>Total Amount:</strong> $${payoutItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</li>
                    <li><strong>Error:</strong> ${errorMessage}</li>
                </ul>
                <p><strong>Action Required:</strong> Check your PayPal balance. Once resolved, you must manually payout these affiliates via the Dashboard or API.</p>
            `
                });
            } catch (emailError) {
                console.error('Failed to send admin alert email:', emailError);
            }

            return res.status(500).json({ error: 'Payout failed', message: errorMessage });
        }

        const batchId = batchResult.batch_header.payout_batch_id;

        console.log(`✅ King Midas Batch Created: ${batchId}`);

        // 7. Insert Records with Batch ID
        const finalRecords = payoutRecords.map(r => ({
            ...r,
            paypal_batch_id: batchId,
            paypal_payout_batch_id: batchId,
            paid_at: new Date().toISOString()
        }));

        const { error: finalInsertError } = await supabase.from('payout_requests').insert(finalRecords);

        if (finalInsertError) {
            console.error('Failed to insert payout logs (Money was sent!):', finalInsertError);
        }

        return res.status(200).json({
            success: true,
            message: `Paid ${payoutItems.length} winners`,
            batchId,
            totalAmount: payoutItems.reduce((sum, i) => sum + i.amount, 0),
            winners: winners.map(w => ({ rank: w.rank, affiliate: w.affiliate_id }))
        });

    } catch (error: any) {
        console.error('King Midas Payout Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
