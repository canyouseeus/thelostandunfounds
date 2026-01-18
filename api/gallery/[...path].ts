import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';


const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        console.log(`[API] Req: ${req.url} [${req.method}]`);

        // Vercel sometimes passes the spread param with the ellipses key (e.g. '...path' or just 'path')
        // dependent on the exact runtime/platform version. We check both.
        const rawPath = req.query.path || req.query['...path'] || req.query['slug'];

        // Normalize path: join array, remove trailing slash, lowercase
        const rawRoute = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath as string) || '';
        const route = rawRoute.replace(/\/$/, '').toLowerCase();

        console.log('Gallery API routing:', {
            rawPath,
            resolvedRoute: route,
            method: req.method,
            query: req.query
        });

        if (route === 'checkout') {
            return await handleCheckout(req, res);
        }

        if (route === 'resend-order') {
            return await handleResendOrder(req, res);
        }

        if (route === 'capture') {
            return await handleCapture(req, res);
        }

        if (route === 'stream') {
            return await handleStream(req, res);
        }

        if (route === 'invite') {
            return await handleInvite(req, res);
        }

        if (route === 'sync') {
            return await handleSync(req, res);
        }

        return res.status(404).json({
            error: 'Gallery route not found',
            debug: {
                receivedPathFromQuery: rawPath,
                resolvedRoute: route,
                originalUrl: req.url,
                method: req.method,
                queryKeys: Object.keys(req.query)
            }
        });
    } catch (err: any) {
        console.error('[CRITICAL API ERROR] Uncaught exception in gallery handler:', err);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
}

async function handleStream(req: VercelRequest, res: VercelResponse) {
    const { fileId, size } = req.query;
    try {
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

        console.warn('lh3 stream failed, trying fallback:', {
            fileId,
            status: response.status,
            contentType: response.headers.get('content-type')
        });

        // Fallback to drive thumbnail
        const driveUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size || 1600}`;
        const driveRes = await fetch(driveUrl);

        if (driveRes.ok && driveRes.headers.get('content-type')?.includes('image')) {
            const contentType = driveRes.headers.get('content-type') || 'image/jpeg';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

            const buffer = await driveRes.arrayBuffer();
            return res.send(Buffer.from(buffer));
        }

        console.error('All stream methods failed for fileId:', fileId, {
            lh3Status: response.status,
            driveStatus: driveRes.status,
            driveContentType: driveRes.headers.get('content-type')
        });

        return res.status(driveRes.status === 403 ? 403 : 404).json({
            error: 'Image not found or inaccessible',
            debug: {
                lh3: response.status,
                drive: driveRes.status
            }
        });
    } catch (err: any) {
        console.error('Stream error:', {
            fileId,
            message: err.message,
            stack: err.stack,
            cause: err.cause
        });
        return res.status(500).json({
            error: 'Internal server error while streaming',
            details: err.message,
            fileId
        });
    }
}

async function handleCheckout(req: VercelRequest, res: VercelResponse) {
    try {
        const { photoIds, email, userId, librarySlug } = req.body;

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            return res.status(400).json({ error: 'photoIds must be a non-empty array' });
        }

        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

        // Calculate total price
        const { data: photos, error: photoError } = await supabase
            .from('photos')
            .select('price_cents')
            .in('id', photoIds);

        if (photoError || !photos) {
            console.error('Photo fetch error:', photoError);
            return res.status(500).json({ error: 'Failed to fetch photo prices' });
        }

        const totalCents = photos.reduce((sum, p) => sum + (p.price_cents || 500), 0);
        const amount = totalCents / 100;

        // --- NEW LOGIC: Create Pending Order in DB FIRST ---
        // This avoids PayPal custom_id string limit bugs

        const { data: pendingOrder, error: orderError } = await supabase
            .from('photo_orders')
            .insert({
                user_id: userId || null,
                email,
                total_amount_cents: totalCents,
                currency: 'USD',
                payment_status: 'pending',
                metadata: {
                    photoIds,
                    librarySlug,
                    source: 'checkout_v2'
                }
            })
            .select('id')
            .single();

        if (orderError || !pendingOrder) {
            console.error('Failed to create pending order:', orderError);
            return res.status(500).json({ error: 'Failed to initialize order record' });
        }

        const internalRefId = pendingOrder.id; // UUID is safe for custom_id (36 chars)

        // PayPal API Setup - Use strict regex to strip ANY whitespace/hidden chars
        const environmentRaw = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX');
        const environment = environmentRaw.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const isSandbox = environment.toUpperCase() === 'SANDBOX';

        const rawClientId = isSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID) : process.env.PAYPAL_CLIENT_ID;
        const rawClientSecret = isSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET) : process.env.PAYPAL_CLIENT_SECRET;

        const clientId = (rawClientId || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const clientSecret = (rawClientSecret || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';

        // Get auth token
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        console.log('PayPal Auth Attempt:', {
            env: environment,
            isSandbox,
            url: baseUrl,
            clientIdPrefix: clientId ? clientId.substring(0, 10) : 'MISSING',
            secretPrefix: clientSecret ? clientSecret.substring(0, 5) : 'MISSING'
        });

        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenRes.ok) {
            const tokenErr = await tokenRes.text();
            console.error('PayPal token error:', tokenErr);
            console.error('PayPal token error:', tokenErr);
            return res.status(500).json({
                error: 'Failed to authenticate with PayPal',
                details: tokenErr,
                debug: {
                    deploymentTimestamp: '2026-01-16T20:55:00Z',
                    environment: environment,
                    usedBaseUrl: baseUrl,
                    usedClientIdPrefix: clientId ? clientId.substring(0, 4) + '...' : 'N/A'
                }
            });
        }

        const tokenData = await tokenRes.json();
        const access_token = tokenData.access_token;

        if (!access_token) {
            console.error('No access token in PayPal response');
            return res.status(500).json({ error: 'PayPal authentication failed' });
        }

        // Create Order at PayPal
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
                    custom_id: internalRefId // UUID fits in 127 chars
                }],
                application_context: {
                    brand_name: 'THE LOST+UNFOUNDS',
                    landing_page: 'NO_PREFERENCE',
                    user_action: 'PAY_NOW',
                    return_url: `${req.headers.origin || 'https://www.thelostandunfounds.com'}/payment/success`,
                    cancel_url: `${req.headers.origin || 'https://www.thelostandunfounds.com'}/payment/cancel`
                }
            })
        });

        if (!orderRes.ok) {
            const orderErr = await orderRes.text();
            console.error('PayPal order creation error:', orderErr);
            // Optimization: Delete or mark fatal error on pending order?
            // For now, leave as pending (it will stale out).
            return res.status(500).json({ error: 'Failed to create PayPal order', details: orderErr });
        }

        const order = await orderRes.json();

        // UPDATE pending order with PayPal Order ID
        await supabase
            .from('photo_orders')
            .update({ paypal_order_id: order.id })
            .eq('id', internalRefId);

        const approvalUrl = order.links.find((l: any) => l.rel === 'approve')?.href;
        return res.status(200).json({ approvalUrl });

    } catch (err) {
        console.error('Checkout error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function handleCapture(req: VercelRequest, res: VercelResponse) {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ error: 'Missing orderId' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 1. Initial Idempotency Check
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        let query = supabase.from('photo_orders').select('id, payment_status, email');

        if (isUuid) {
            query = query.or(`id.eq.${orderId},paypal_order_id.eq.${orderId}`);
        } else {
            query = query.eq('paypal_order_id', orderId);
        }

        const { data: existingOrder } = await query.maybeSingle();

        if (existingOrder?.payment_status === 'completed') {
            const { data: ents } = await supabase
                .from('photo_entitlements')
                .select('*, photos(title, library_id, google_drive_file_id, photo_libraries(name))')
                .eq('order_id', existingOrder.id);

            const libraryTitle = (ents?.[0]?.photos as any)?.photo_libraries?.name || 'GALLERY';

            return res.status(200).json({
                success: true,
                orderId: existingOrder.id,
                libraryTitle,
                entitlements: ents?.map(e => ({
                    photoId: e.photo_id,
                    token: e.token,
                    photoTitle: (e.photos as any)?.title,
                    thumbnailUrl: (e.photos as any)?.google_drive_file_id ? `/api/gallery/stream?fileId=${(e.photos as any).google_drive_file_id}&size=400` : null
                }))
            });
        }

        // 2. PayPal Auth
        const environmentRaw = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX');
        const environment = environmentRaw.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const isSandbox = environment.toUpperCase() === 'SANDBOX';

        const rawClientId = isSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID) : process.env.PAYPAL_CLIENT_ID;
        const rawClientSecret = isSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET) : process.env.PAYPAL_CLIENT_SECRET;

        const clientId = (rawClientId || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const clientSecret = (rawClientSecret || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';

        console.log('PayPal Capture Auth Attempt:', {
            env: environment,
            isSandbox,
            url: baseUrl,
            clientIdPrefix: clientId ? clientId.substring(0, 10) : 'MISSING',
            orderId
        });

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials'
        });
        const { access_token } = await tokenRes.json();

        // 3. Capture Order
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        });

        if (!captureRes.ok) {
            const err = await captureRes.json();
            console.error('PayPal Capture Error:', JSON.stringify(err, null, 2));
            return res.status(500).json({
                error: 'Failed to capture payment',
                details: err,
                debug: {
                    environment,
                    usedBaseUrl: baseUrl,
                    orderId
                }
            });
        }

        // 4. Update Database
        const { data: photoOrder, error: orderError } = await supabase
            .from('photo_orders')
            .update({ payment_status: 'completed' })
            .eq('paypal_order_id', orderId)
            .select()
            .single();

        if (orderError || !photoOrder) {
            console.error('DB Update Error:', orderError);
            return res.status(500).json({ error: 'Order update failed' });
        }

        // 5. Ensure Entitlements Exist (Create if from new flow)
        let { data: ents, error: entsError } = await supabase
            .from('photo_entitlements')
            .select('*, photos(title, google_drive_file_id, photo_libraries(name))')
            .eq('order_id', photoOrder.id);

        if (!ents || ents.length === 0) {
            // Check metadata for photoIds
            // Use type assertion to access metadata if it's typed as JSON
            const meta = photoOrder.metadata as any;
            if (meta && meta.photoIds && Array.isArray(meta.photoIds)) {
                console.log('Creating entitlements from metadata for order:', photoOrder.id);
                const newEntitlements = meta.photoIds.map((pid: string) => ({
                    order_id: photoOrder.id,
                    photo_id: pid
                }));

                const { error: insertErr } = await supabase
                    .from('photo_entitlements')
                    .insert(newEntitlements);

                if (insertErr) {
                    console.error('Entitlement creation failed:', insertErr);
                    // Continue, but log critical error. User might need support.
                } else {
                    // Refetch with joins
                    const { data: refreshed, error: refetchErr } = await supabase
                        .from('photo_entitlements')
                        .select('*, photos(title, google_drive_file_id, photo_libraries(name))')
                        .eq('order_id', photoOrder.id);

                    if (refreshed) ents = refreshed;
                }
            }
        }

        if (!ents) ents = []; // Safety fallthrough

        const libraryTitle = (ents?.[0]?.photos as any)?.photo_libraries?.name || 'GALLERY';

        // 6. Send Confirmation Email
        try {
            const galleryUrl = `https://www.thelostandunfounds.com/photos/success?token=${photoOrder.id}`;
            const zohoAuth = await getZohoAuthContext();
            await sendZohoEmail({
                auth: zohoAuth,
                to: photoOrder.email,
                subject: 'ARCHIVE ACCESS GRANTED | THE LOST+UNFOUNDS',
                htmlContent: `
                    <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
                        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                            ACCESS GRANTED
                        </h1>
                        <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                            YOUR SECURED ARCHIVE ITEMS ARE READY FOR DOWNLOAD.
                        </p>
                        <div style="margin: 40px 0;">
                            <a href="${galleryUrl}" style="display: inline-block; padding: 14px 28px; background-color: #fff; color: #000; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">ACCESS GALLERY</a>
                        </div>
                        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                            <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                                SECURE AUTOMATED DELIVERY SYSTEM<br/>
                                ORDER ID: ${photoOrder.id}<br/>
                                DESTINATION: ${photoOrder.email}
                            </p>
                        </div>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error('Post-capture email failure:', emailErr);
            // Don't fail the request if just the email fails, but log it.
        }

        return res.status(200).json({
            success: true,
            orderId: photoOrder.id,
            libraryTitle,
            entitlements: ents.map(e => ({
                photoId: e.photo_id,
                token: e.token,
                photoTitle: (e.photos as any)?.title,
                thumbnailUrl: (e.photos as any)?.google_drive_file_id ? `/api/gallery/stream?fileId=${(e.photos as any).google_drive_file_id}&size=400` : null
            }))
        });

    } catch (err: any) {
        console.error('Capture handler error:', err);
        return res.status(500).json({ error: err.message });
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
            .select('token, photo_id, photos(title, google_drive_file_id)')
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

        const galleryUrl = `https://www.thelostandunfounds.com/photos/success?token=${orderId}`;
        const auth = await getZohoAuthContext();
        await sendZohoEmail({
            auth,
            to: email,
            subject: photoIds ? 'REFRESHED ASSET ACCESS | THE LOST+UNFOUNDS' : 'ARCHIVE ACCESS RESTORED | THE LOST+UNFOUNDS',
            htmlContent: `
                <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
                    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                        ${photoIds ? 'ASSET REFRESH' : 'ACCESS RESTORED'}
                    </h1>
                    <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                        YOUR SECURED ARCHIVE ITEMS ARE READY FOR ACCESS.
                    </p>
                    <div style="margin: 40px 0;">
                        <a href="${galleryUrl}" style="display: inline-block; padding: 14px 28px; background-color: #fff; color: #000; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">ACCESS GALLERY</a>
                    </div>
                    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                        <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                            SECURE AUTOMATED DELIVERY SYSTEM<br/>
                            ORDER ID: ${orderId}<br/>
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

async function handleInvite(req: VercelRequest, res: VercelResponse) {
    try {
        const { libraryId, emails } = req.body;
        if (!libraryId || !emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Missing libraryId or emails array' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const { data: library, error: libError } = await supabase
            .from('photo_libraries')
            .select('name, slug')
            .eq('id', libraryId)
            .single();

        if (libError || !library) {
            console.error('Library fetch error:', libError);
            return res.status(404).json({ error: 'Gallery not found' });
        }

        const galleryUrl = `https://www.thelostandunfounds.com/photos/${library.slug}`;
        const auth = await getZohoAuthContext();

        // Send to each email
        for (const email of emails) {
            try {
                await sendZohoEmail({
                    auth,
                    to: email,
                    subject: `ACCESS GRANTED: ${library.name} | THE LOST+UNFOUNDS`,
                    htmlContent: `
                        <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
                            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                                GALLERY OPENED
                            </h1>
                            <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                                YOU HAVE BEEN INVITED TO ACCESS THE FOLLOWING SECURED ARCHIVE:
                            </p>
                            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${library.name}</h2>
                            <div style="margin: 40px 0;">
                                <a href="${galleryUrl}" style="display: inline-block; padding: 14px 28px; background-color: #fff; color: #000; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">ENTER GALLERY</a>
                            </div>
                            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                                <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                                    SECURE AUTOMATED DELIVERY SYSTEM<br/>
                                    GALLERY: ${library.name}<br/>
                                    INVITEE: ${email}
                                </p>
                            </div>
                        </div>
                    `
                });
            } catch (innerErr) {
                console.error(`Failed to send invite to ${email}:`, innerErr);
            }
        }

        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error('Invite handler error:', err);
        return res.status(500).json({ error: err.message });
    }
}

// --- INLINED EMAIL UTILS ---

interface ZohoAuthContext {
    accessToken: string
    accountId: string
    fromEmail: string
}

interface ZohoSendEmailParams {
    auth: ZohoAuthContext
    to: string
    subject: string
    htmlContent: string
}

interface ZohoTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
}

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts'
const BANNER_URL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='50%25' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>"

function getZohoEnv() {
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
        throw new Error('Zoho Mail environment variables are not configured')
    }

    return { clientId, clientSecret, refreshToken, fromEmail }
}

function ensureBannerHtml(htmlContent: string): string {
    const bannerBlock = `
<div style="padding: 0 0 30px 0; background-color: #000000 !important; text-align: center;">
  <img src="${BANNER_URL}" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
</div>`

    const ensureShell = (html: string) => {
        if (/<html[\s>]/i.test(html)) return html
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0; padding:0; background-color:#000000; font-family: Arial, sans-serif;">${html}</body></html>`
    }

    const insertAfterBody = (html: string) => {
        const match = /<body[^>]*>/i.exec(html)
        if (!match) return null
        const idx = (match.index ?? 0) + match[0].length
        return html.slice(0, idx) + bannerBlock + html.slice(idx)
    }

    let html = htmlContent || ''
    if (html.includes(BANNER_URL)) {
        return ensureShell(html)
    }

    const withBodyInsert = insertAfterBody(html)
    if (withBodyInsert) {
        return ensureShell(withBodyInsert)
    }

    return ensureShell(bannerBlock + html)
}

async function getZohoAccessToken(): Promise<string> {
    const { clientId, clientSecret, refreshToken } = getZohoEnv()

    const response = await fetch(ZOHO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to refresh Zoho token: ${response.status} ${errorText}`)
    }

    const data: ZohoTokenResponse = await response.json()
    return data.access_token
}

async function getZohoAccountInfo(accessToken: string, fallbackEmail: string) {
    try {
        const response = await fetch(ZOHO_ACCOUNTS_URL, {
            method: 'GET',
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
        })

        if (response.ok) {
            const json = await response.json()
            const account = json?.data?.[0] || json?.accounts?.[0]

            if (account) {
                const accountId =
                    account.accountId ||
                    account.account_id ||
                    account.accountID ||
                    account.accountid ||
                    account.accountid_zuid ||
                    account.accountName ||
                    account.account_name

                let accountEmail = fallbackEmail
                if (typeof account.emailAddress === 'string') {
                    accountEmail = account.emailAddress
                } else if (typeof account.email === 'string') {
                    accountEmail = account.email
                } else if (typeof account.accountName === 'string') {
                    accountEmail = account.accountName
                }

                if (accountId) {
                    return { accountId: String(accountId), email: accountEmail }
                }
            }
        }
    } catch (error) {
        console.warn('Zoho account lookup failed, falling back to derived account id', error)
    }

    const fallbackAccountId = fallbackEmail.split('@')[0]
    return { accountId: fallbackAccountId, email: fallbackEmail }
}

async function getZohoAuthContext(): Promise<ZohoAuthContext> {
    const { fromEmail } = getZohoEnv()
    const accessToken = await getZohoAccessToken()
    const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)

    return {
        accessToken,
        accountId: accountInfo.accountId,
        fromEmail: accountInfo.email || fromEmail
    }
}

async function sendZohoEmail({
    auth,
    to,
    subject,
    htmlContent
}: ZohoSendEmailParams): Promise<{ success: boolean; error?: string }> {
    const finalHtml = ensureBannerHtml(htmlContent)
    const mailApiUrl = `https://mail.zoho.com/api/accounts/${auth.accountId}/messages`

    const response = await fetch(mailApiUrl, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${auth.accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fromAddress: auth.fromEmail,
            toAddress: to,
            subject,
            content: finalHtml,
            mailFormat: 'html'
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('Zoho email API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
        })
        return { success: false, error: `Failed to send email: ${response.status}` }
    }

    return { success: true }
}

// --- INLINED SYNC FUNCTION ---
async function syncGalleryPhotos(librarySlug: string) {
    const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const GOOGLE_EMAIL = (rawEmail || '').replace(/[^a-zA-Z0-9@._-]/g, '');

    // Debug: log raw key format
    console.log('Raw key debug:', {
        rawLength: rawKey?.length,
        hasLiteralBackslashN: rawKey?.includes('\\n'),
        hasRealNewline: rawKey?.includes('\n'),
        first50: rawKey?.substring(0, 50),
        last30: rawKey?.slice(-30)
    });

    // Handle all possible newline formats from Vercel:
    // 1. Literal string "\\n" (two chars: backslash + n)
    // 2. Already proper newlines
    let GOOGLE_KEY = rawKey || '';

    // Replace literal \n string with actual newlines
    if (GOOGLE_KEY.includes('\\n')) {
        GOOGLE_KEY = GOOGLE_KEY.replace(/\\n/g, '\n');
    }

    // Clean up quotes and whitespace
    GOOGLE_KEY = GOOGLE_KEY.replace(/"/g, '').trim();

    console.log('Processed key debug:', {
        processedLength: GOOGLE_KEY.length,
        startsCorrectly: GOOGLE_KEY.startsWith('-----BEGIN'),
        endsCorrectly: GOOGLE_KEY.endsWith('-----'),
        hasNewlines: GOOGLE_KEY.includes('\n'),
        newlineCount: (GOOGLE_KEY.match(/\n/g) || []).length
    });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_EMAIL || !GOOGLE_KEY) {
        console.error('Sync missing credentials:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
            hasEmail: !!GOOGLE_EMAIL,
            hasKey: !!GOOGLE_KEY,
            keyLength: GOOGLE_KEY.length
        });
        throw new Error(`Missing credentials. Email: ${!!GOOGLE_EMAIL}, Key: ${!!GOOGLE_KEY}`);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('*')
        .eq('slug', librarySlug)
        .single();

    if (libError || !library) {
        throw new Error(`Library not found: ${librarySlug}`);
    }

    const folderId = library.google_drive_folder_id;
    if (!folderId) {
        throw new Error(`Library ${librarySlug} has no Google Drive folder ID configured`);
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_EMAIL,
            private_key: GOOGLE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType = 'video/quicktime') and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, mimeType, imageMediaMetadata)',
        pageSize: 1000,
    });

    const files = response.data.files || [];

    for (const file of files) {
        if (!file.id || !file.name) continue;

        const title = file.name.split('.').slice(0, -1).join('.');
        const thumbnailUrl = file.thumbnailLink?.replace(/=s220$/, '=s1200');
        let metadata = file.imageMediaMetadata || {};
        let finalCreatedAt = file.createdTime || new Date().toISOString();

        const captureTime = (metadata as any).time;
        if (captureTime) {
            const captureDate = new Date(captureTime);
            const uploadDate = new Date(finalCreatedAt);
            if (captureDate.getFullYear() === 2025 && uploadDate.getFullYear() === 2026) {
                captureDate.setFullYear(2026);
                finalCreatedAt = captureDate.toISOString();
                (metadata as any)._corrected = true;
                (metadata as any).time = captureDate.toISOString();
            } else {
                finalCreatedAt = captureTime;
            }
        }

        await supabase
            .from('photos')
            .upsert({
                library_id: library.id,
                google_drive_file_id: file.id,
                title: title,
                thumbnail_url: thumbnailUrl,
                status: 'active',
                mime_type: file.mimeType,
                created_at: finalCreatedAt,
                metadata: metadata
            }, {
                onConflict: 'google_drive_file_id'
            });
    }

    const currentDriveFileIds = new Set(files.map(f => f.id));
    const { data: existingPhotos } = await supabase
        .from('photos')
        .select('google_drive_file_id')
        .eq('library_id', library.id);

    if (existingPhotos) {
        const photosToDelete = existingPhotos
            .filter(p => p.google_drive_file_id && !currentDriveFileIds.has(p.google_drive_file_id))
            .map(p => p.google_drive_file_id);

        if (photosToDelete.length > 0) {
            await supabase
                .from('photos')
                .delete()
                .in('google_drive_file_id', photosToDelete);
        }
    }

    return { synced: files.length, deleted: existingPhotos?.length || 0 - files.length };
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
    try {
        const { slug } = req.query;
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        if (slug && typeof slug === 'string') {
            const result = await syncGalleryPhotos(slug);
            return res.json({ success: true, results: [result] });
        }

        // Sync all if no slug provided
        const { data: libraries, error: libError } = await supabase
            .from('photo_libraries')
            .select('slug');

        if (libError || !libraries) {
            return res.status(500).json({ error: 'Failed to fetch galleries for sync' });
        }

        const results = [];
        for (const lib of libraries) {
            try {
                const syncResult = await syncGalleryPhotos(lib.slug);
                results.push({ slug: lib.slug, ...syncResult });
            } catch (syncErr: any) {
                console.error(`Sync failed for ${lib.slug}:`, syncErr);
                results.push({ slug: lib.slug, error: syncErr.message });
            }
        }

        return res.json({ success: true, results });
    } catch (err: any) {
        console.error('Sync route error:', err);
        return res.status(500).json({ error: 'Sync operation failed', details: err.message });
    }
}
