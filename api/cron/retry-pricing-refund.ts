
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { sendMessage } from '../../lib/api-handlers/_zoho-mail-handler';

/**
 * Cron Job: Retry Pricing Refund
 * 
 * Targeted fix for Order 6WA583698K809903L (Capture 3L2802494A804580W).
 * Attempts to issue a $10 partial refund daily until successful.
 * Sends a confirmation email to the customer upon success.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verification (optional, but good practice)
    const cronSecret = req.headers['x-cron-secret'] || req.query.secret;

    // We allow manual triggering without secret for testing if needed, 
    // or you can strictly enforce it if CRON_SECRET is set.
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
        if (!req.query.force) { // Allow manual force with ?force=true for testing
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        console.log('🔄 Cron job: Retrying pricing refund...');

        // 1. PayPal Configuration
        const environment = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX').toUpperCase();
        const isLive = environment === 'LIVE';

        const clientId = isLive
            ? (process.env.PAYPAL_CLIENT_ID_LIVE || process.env.PAYPAL_CLIENT_ID)
            : (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID);

        const clientSecret = isLive
            ? (process.env.PAYPAL_CLIENT_SECRET_LIVE || process.env.PAYPAL_CLIENT_SECRET)
            : (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET);

        const baseUrl = isLive ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

        if (!clientId || !clientSecret) {
            console.error('❌ Missing PayPal credentials');
            return res.status(500).json({ error: 'Missing PayPal credentials' });
        }

        // 2. Authenticate with PayPal
        const authMsg = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authMsg}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('❌ PayPal Auth Failed:', err);
            // Return 200 to keep cron alive, but report error body
            return res.status(200).json({ success: false, error: 'PayPal Auth Failed', details: err });
        }

        const { access_token } = await tokenRes.json() as any;

        // 3. Check Order/Capture Status
        // We specifically want to refund Capture 3L2802494A804580W from Order 6WA583698K809903L
        const CAPTURE_ID = '3L2802494A804580W'; // Hardcoded for this specific fix
        const REFUND_AMOUNT = '10.00';
        const CUSTOMER_EMAIL = 'jay.paz1424@gmail.com';

        // Check capture details to see if already refunded
        const captureRes = await fetch(`${baseUrl}/v2/payments/captures/${CAPTURE_ID}`, {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });

        if (!captureRes.ok) {
            const err = await captureRes.text();
            console.error('❌ Failed to fetch capture:', err);
            return res.status(200).json({ success: false, error: 'Fetch Capture Failed', details: err });
        }

        const captureData = await captureRes.json() as any;

        // Check if fully or partially refunded
        // "status": "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED"
        // Also check links for refund details if needed, but status is usually enough.

        const amountRefunded = parseFloat(captureData.seller_receivable_breakdown?.refunded_amount?.value || '0');

        if (amountRefunded >= 10.00 || captureData.status === 'REFUNDED' || captureData.status === 'PARTIALLY_REFUNDED') {
            console.log('✅ Refund already processed (or partially processed).');
            return res.status(200).json({
                success: true,
                message: 'Refund already processed',
                refunded_amount: amountRefunded
            });
        }

        // 4. Attempt Refund
        console.log(`Attempting refund of $${REFUND_AMOUNT} for Capture ${CAPTURE_ID}...`);

        const refundRes = await fetch(`${baseUrl}/v2/payments/captures/${CAPTURE_ID}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: {
                    value: REFUND_AMOUNT,
                    currency_code: 'USD'
                },
                note_to_payer: 'Partial refund for bundle pricing adjustment - The Lost and Unfounds'
            })
        });

        if (!refundRes.ok) {
            const err = await refundRes.text();
            console.error('❌ Refund Failed:', err);
            // Likely 'PAYEE_ACCOUNT_RESTRICTED' - return 200 so cron tries again tomorrow
            return res.status(200).json({
                success: false,
                status: 'FAILED',
                error: 'Refund attempt failed (likely restricted)',
                details: err
            });
        }

        const refundData = await refundRes.json() as any;
        console.log('✅ Refund Successful! ID:', refundData.id);

        // 5. Send Success Email
        // Only send if we actually performed the refund just now
        try {
            console.log(`Sending confirmation email to ${CUSTOMER_EMAIL}...`);
            const emailContent = `
            <p>Hi there,</p>
            <p>I'm writing to confirm that we've successfully processed a <strong>$10.00 partial refund</strong> for your order.</p>
            <p>We noticed that the bundle pricing (3 for $20) wasn't automatically applied to your order of 4 photos, so we've refunded the difference to correct the total to $30 as intended.</p>
            <p>You should see this credit appear on your original payment method shortly.</p>
            <p>Thank you so much for your support and for purchasing from The Lost and Unfounds!</p>
            <p>Best,<br>The Lost (and Unfounds)</p>
        `;

            const emailRes = await sendMessage({
                to: CUSTOMER_EMAIL,
                subject: 'Refund Processed: Order Adjustment',
                content: emailContent,
                isHtml: true
            });

            if (emailRes.success) {
                console.log('✅ Confirmation email sent.');
            } else {
                console.error('⚠️ Failed to send confirmation email:', emailRes.error);
            }

        } catch (emailErr) {
            console.error('⚠️ Error sending email:', emailErr);
        }

        return res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund_id: refundData.id
        });

    } catch (error: any) {
        console.error('❌ Cron job fatal error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
