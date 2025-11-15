import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Process PayPal payout for affiliate commissions
 * This should be called by an admin or automated system
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Add admin authentication check here
    const { affiliate_id, commission_ids } = req.body;

    if (!affiliate_id || !commission_ids || !Array.isArray(commission_ids)) {
      return res.status(400).json({ error: 'Affiliate ID and commission IDs are required' });
    }

    // Get affiliate info
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, paypal_email, user_id')
      .eq('id', affiliate_id)
      .maybeSingle();

    if (!affiliate || !affiliate.paypal_email) {
      return res.status(400).json({ error: 'Affiliate not found or PayPal email not set' });
    }

    // Get pending commissions
    const { data: commissions } = await supabase
      .from('commissions')
      .select('*')
      .eq('affiliate_id', affiliate_id)
      .eq('status', 'pending')
      .in('id', commission_ids);

    if (!commissions || commissions.length === 0) {
      return res.status(400).json({ error: 'No pending commissions found' });
    }

    const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount.toString()), 0);

    // TODO: Integrate with PayPal Payouts API
    // For now, we'll simulate the payout
    // You'll need to implement actual PayPal integration using @paypal/payouts-sdk
    
    // Example PayPal Payout API call (commented out - requires PayPal SDK):
    /*
    const paypal = require('@paypal/payouts-sdk');
    const environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET
    );
    const client = new paypal.core.PayPalHttpClient(environment);

    const request = new paypal.payouts.PayoutsPostRequest();
    request.requestBody({
      sender_batch_header: {
        sender_batch_id: `BATCH_${Date.now()}`,
        email_subject: 'Your affiliate commission payout',
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: totalAmount.toFixed(2),
          currency: 'USD',
        },
        receiver: affiliate.paypal_email,
        note: 'Affiliate commission payout',
      }],
    });

    const response = await client.execute(request);
    const payoutId = response.result.batch_header.payout_batch_id;
    */

    // For now, simulate successful payout
    const payoutId = `PAYOUT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Update commissions to paid status
    const { error: updateError } = await supabase
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payout_id: payoutId,
      })
      .in('id', commission_ids);

    if (updateError) {
      console.error('Error updating commissions:', updateError);
      return res.status(500).json({ error: 'Failed to update commission status' });
    }

    // Update affiliate total_paid
    await supabase.rpc('increment_affiliate_paid', {
      p_affiliate_id: affiliate_id,
      p_amount: totalAmount,
    });

    return res.status(200).json({
      success: true,
      payout_id: payoutId,
      amount: totalAmount.toFixed(2),
      commissions_paid: commissions.length,
    });
  } catch (error) {
    console.error('Payout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
