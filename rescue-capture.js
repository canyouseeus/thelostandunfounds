import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function rescueCapture(orderId) {
    console.log(`🚀 Attempting rescue capture for Order ID: ${orderId}`);

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = process.env.PAYPAL_ENVIRONMENT || 'SANDBOX';
    const baseUrl = environment === 'LIVE' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

    console.log(`Environment: ${environment}`);
    console.log(`Base URL: ${baseUrl}`);

    try {
        // 1. Get Token
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`Token fetch failed: ${err}`);
        }

        const { access_token } = await tokenRes.json();
        console.log('✅ Access Token obtained.');

        // 2. Capture
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            }
        });

        const captureData = await captureRes.json();
        console.log('Capture Response:', JSON.stringify(captureData, null, 2));

        if (captureRes.ok) {
            console.log('🎉 SUCCESS: Payment captured manually!');
        } else {
            console.error('❌ FAILED: Capture rejected by PayPal.');
        }

    } catch (err) {
        console.error('💥 Error during rescue capture:', err.message);
    }
}

// Get order ID from args
const orderId = process.argv[2] || '4XS73048WD033012W';
rescueCapture(orderId);
