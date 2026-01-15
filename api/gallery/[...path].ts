import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { path } = req.query;
    const route = Array.isArray(path) ? path.join('/') : path || '';

    console.log('Gallery API routing:', { route, method: req.method });

    if (route === 'checkout') {
        return handleCheckout(req, res);
    }

    if (route === 'resend-order') {
        return handleResendOrder(req, res);
    }

    if (route === 'stream') {
        return handleStream(req, res);
    }

    return res.status(404).json({ error: 'Gallery route not found' });
}

async function handleStream(req: VercelRequest, res: VercelResponse) {
    try {
        const { fileId, size } = req.query;
        if (!fileId) {
            return res.status(400).json({ error: 'Missing fileId' });
        }

        // Try lh3 first (direct link)
        const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s${size || 1600}`;
        const response = await fetch(lh3Url);

        if (response.ok && response.headers.get('content-type')?.includes('image')) {
            const contentType = response.headers.get('content-type') || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            const buffer = await response.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        // Fallback to drive thumbnail
        const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size || 1600}`;
        const driveRes = await fetch(driveUrl);

        if (driveRes.ok) {
            const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            const buffer = await driveRes.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        return res.status(404).json({ error: 'Image not found or inaccessible' });
    } catch (err) {
        console.error('Stream error:', err);
        return res.status(500).json({ error: 'Internal server error while streaming' });
    }
}

async function handleCheckout(req: VercelRequest, res: VercelResponse) {
    try {
        const { photoIds, email, userId } = req.body;

        if (!photoIds || !photoIds.length || !email) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

        // Calculate total price
        const { data: photos, error: photoError } = await supabase
            .from('photos')
            .select('price_cents')
            .in('id', photoIds);

        if (photoError || !photos) {
            return res.status(500).json({ error: 'Failed to fetch photo prices' });
        }

        const totalCents = photos.reduce((sum, p) => sum + (p.price_cents || 500), 0);
        const amount = totalCents / 100;

        // Use the common PayPal handler logic or direct API
        // For local development, we'll hit the sandbox directly
        const environment = process.env.PAYPAL_ENVIRONMENT || 'SANDBOX';
        const isSandbox = environment.toUpperCase() === 'SANDBOX';
        const clientId = isSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID) : process.env.PAYPAL_CLIENT_ID;
        const clientSecret = isSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET) : process.env.PAYPAL_CLIENT_SECRET;
        const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';

        // Get auth token
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        const { access_token } = await tokenRes.json();

        // Create Order
        const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount.toFixed(2)
                    },
                    description: `Photos Archive Access (${photoIds.length} items)`,
                    custom_id: JSON.stringify({ photoIds, email, userId })
                }],
                application_context: {
                    brand_name: 'THE LOST+UNFOUNDS',
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    return_url: `${req.headers.origin || 'http://localhost:3000'}/payment/success`,
                    cancel_url: `${req.headers.origin || 'http://localhost:3000'}/payment/cancel`
                }
            })
        });

        const order = await orderRes.json();
        const approvalUrl = order.links.find((l: any) => l.rel === 'approve')?.href;

        return res.status(200).json({ approvalUrl });

    } catch (err) {
        console.error('Checkout error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleResendOrder(req: VercelRequest, res: VercelResponse) {
    try {
        const { orderId, email, photoIds } = req.body;
        if (!orderId || !email) {
            return res.status(400).json({ error: 'Missing orderId or email' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch order and associated photos
        const { data: entitlements, error: entError } = await supabase
            .from('photo_entitlements')
            .select('photo_id, photos(title, google_drive_file_id)')
            .eq('order_id', orderId);

        if (entError || !entitlements) {
            console.error('Entitlement fetch error:', entError);
            return res.status(404).json({ error: 'Order not found' });
        }

        // Filter if specific photoIds were requested
        const targetItems = photoIds
            ? entitlements.filter((e: any) => photoIds.includes(e.photo_id))
            : entitlements;

        if (targetItems.length === 0) {
            return res.status(404).json({ error: 'No matching items found' });
        }

        // Construct email content
        const itemsHtml = targetItems.map((e: any) => `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                <p style="color: #fff; font-weight: bold; margin: 0; text-transform: uppercase; font-size: 14px;">${e.photos?.title || 'Archive Item'}</p>
                <a href="https://lh3.googleusercontent.com/d/${e.photos?.google_drive_file_id}" style="color: #fff; font-size: 11px; text-decoration: underline; letter-spacing: 1px;">DIRECT DOWNLOAD</a>
            </div>
        `).join('');

        const auth = await getZohoAuthContext();
        await sendZohoEmail({
            auth,
            to: email,
            subject: photoIds ? 'REFRESHED ASSET ACCESS | THE LOST+UNFOUNDS' : 'ARCHIVE ACCESS RESTORED | THE LOST+UNFOUNDS',
            htmlContent: `
                <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace;">
                    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                        ${photoIds ? 'ASSET REFRESH' : 'ACCESS RESTORED'}
                    </h1>
                    <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                        YOUR SECURED ARCHIVE ITEMS ARE READY FOR ACCESS.
                    </p>
                    <div style="max-width: 500px;">
                        ${itemsHtml}
                    </div>
                    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                        <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                            SECURE AUTOMATED DELIVERY SYSTEM<br/>
                            ID: ${orderId}<br/>
                            DESTINATION: ${email}
                        </p>
                    </div>
                </div>
            `
        });

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('Resend error:', err);
        return res.status(500).json({ error: err.message });
    }
}
