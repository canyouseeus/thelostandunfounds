
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env.local') });
dotenv.config({ path: resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const PORT = 3001;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const pendingOrders = new Map();

process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (uncaughtException):', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (unhandledRejection):', reason);
});

console.log('✅ Local Server Env Loaded');
console.log('   Supabase URL:', SUPABASE_URL ? 'OK' : 'MISSING');
console.log('   Zoho Client ID:', process.env.ZOHO_CLIENT_ID ? 'Loaded' : 'MISSING');
console.log('   Zoho From Email:', process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL ? 'Loaded' : 'MISSING');

// Branding Constants (matching lib/email-template.ts)
const BRAND = {
    name: 'THE LOST+UNFOUNDS',
    logo: 'https://www.thelostandunfounds.com/brand/banner.png',
    website: 'https://www.thelostandunfounds.com',
    colors: {
        background: '#000000',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.6)',
        border: 'rgba(255, 255, 255, 0.1)',
        link: 'rgba(255, 255, 255, 0.9)',
    },
};

const EMAIL_STYLES = {
    heading1: `color: ${BRAND.colors.text} !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 0.1em; text-align: center; text-transform: uppercase;`,
    heading2: `color: ${BRAND.colors.text} !important; font-size: 24px; font-weight: bold; margin: 30px 0 20px 0; letter-spacing: 0.1em; text-align: center; text-transform: uppercase;`,
    paragraph: `color: ${BRAND.colors.text} !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;`,
    button: `display: inline-block; padding: 14px 28px; background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background}; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid ${BRAND.colors.text}; margin-top: 10px;`,
    footer: `color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 40px 0 0 0; text-align: center; border-top: 1px solid ${BRAND.colors.border}; padding-top: 20px;`,
    divider: `border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 40px 0;`,
};

function wrapEmail(bodyContent) {
    const currentYear = new Date().getFullYear();
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: ${BRAND.colors.background}; margin: 0; padding: 0; font-family: Arial, sans-serif; color: ${BRAND.colors.text}; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.background}; font-family: Arial, sans-serif; color: ${BRAND.colors.text};">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background-color: ${BRAND.colors.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; margin: 0 auto;">
          <!-- Branding Banner -->
          <tr>
            <td align="left" style="padding: 0 0 40px 0;">
              <a href="${BRAND.website}" target="_blank" style="text-decoration: none;">
                <img src="${BRAND.logo}" alt="${BRAND.name}" style="max-width: 100%; height: auto; display: block; border: 0;">
              </a>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td align="center">
              ${bodyContent}
              <div style="${EMAIL_STYLES.footer}">
                © ${currentYear} ${BRAND.name}. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    console.log(`[Local Server] ${req.method} ${pathname}`);

    const setJsonRes = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    if (pathname === '/api/gallery/checkout' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { items, email, userId, librarySlug, metadata } = JSON.parse(body);

                if (!items || !items.length || !email) {
                    return setJsonRes(400, { error: 'Missing required fields' });
                }

                console.log('Processing checkout for:', { email, itemCount: items.length, hasMetadata: !!metadata });

                // Calculate total price
                // Calculate total & Extract photo IDs
                // Calculate total & Extract photo IDs
                let amount = 0;
                let photoIds = [];
                const pricingOptionIds = [...new Set(items.map(i => i.pricingOptionId).filter(id => id && id !== 'legacy'))];

                // Track Full Buyouts to fetch all photos
                const fullGalleryItems = items.filter(i => i.type === 'full_gallery');

                if (fullGalleryItems.length > 0) {
                    // If sending librarySlug in body, use it to fetch all photos
                    // Assuming single library checkout for now based on UI
                    if (librarySlug) {
                        const { data: library } = await supabase.from('photo_libraries').select('id').eq('slug', librarySlug).single();
                        if (library) {
                            const { data: allPhotos } = await supabase.from('photos').select('id').eq('library_id', library.id).eq('status', 'active');
                            if (allPhotos) {
                                const allIds = allPhotos.map(p => p.id);
                                photoIds = [...photoIds, ...allIds];
                                console.log(`Full Gallery Buyout: Included ${allIds.length} photos.`);
                            }
                        }
                    }
                }

                // Add individual items
                items.filter(i => i.type !== 'full_gallery').forEach(i => {
                    if (i.photoId) photoIds.push(i.photoId);
                });

                // Dedupe
                photoIds = [...new Set(photoIds)];

                // Fetch Pricing Options
                // Fetch Pricing Options Details (need name too now to identify 'Single Photo')
                let pricingDetails = {};
                if (pricingOptionIds.length > 0) {
                    const { data: options } = await supabase
                        .from('gallery_pricing_options')
                        .select('id, price, name')
                        .in('id', pricingOptionIds);

                    if (options) {
                        options.forEach(opt => pricingDetails[opt.id] = opt);
                    }
                }

                let standardItemsCount = 0;
                let otherItemsTotal = 0;

                items.forEach(item => {
                    const details = pricingDetails[item.pricingOptionId];

                    if (item.type === 'full_gallery') {
                        if (details) {
                            otherItemsTotal += Number(details.price);
                        } else {
                            // Safety fallback if pricing deleted? Should rarely happen.
                            otherItemsTotal += 999.00;
                        }
                        return;
                    }

                    // Check if it's a standard "Single Photo" eligible for bundling
                    // Legacy items OR items explicitly named "Single Photo" OR items with price 5.00 (legacy back-compat)
                    const isStandard = !item.pricingOptionId ||
                        item.pricingOptionId === 'legacy' ||
                        (details && details.name === 'Single Photo') ||
                        (details && Number(details.price) === 5.00); // Safety net for un-migrated names

                    if (isStandard) {
                        standardItemsCount++;
                    } else if (details) {
                        otherItemsTotal += Number(details.price);
                    } else {
                        // Fallback unknown item
                        otherItemsTotal += 5.00;
                    }
                });

                // --- Dynamic Bundle Logic ---
                // Fetch all pricing options for this library to find bundles
                let standardItemsTotal = 0;
                let singleItemPrice = 5.00; // Default fallback

                if (standardItemsCount > 0 && librarySlug) {
                    const { data: library } = await supabase.from('photo_libraries').select('id, price').eq('slug', librarySlug).single();

                    if (library) {
                        singleItemPrice = library.price || 5.00;

                        // Fetch all valid bundles for this gallery
                        const { data: bundles } = await supabase
                            .from('gallery_pricing_options')
                            .select('price, photo_count')
                            .eq('library_id', library.id)
                            .gt('photo_count', 1) // Only actual bundles
                            .order('photo_count', { ascending: false }); // Biggest bundles first

                        // Apply bundles greedily
                        let remainingCount = standardItemsCount;

                        if (bundles && bundles.length > 0) {
                            for (const bundle of bundles) {
                                if (remainingCount >= bundle.photo_count) {
                                    const numBundles = Math.floor(remainingCount / bundle.photo_count);
                                    standardItemsTotal += numBundles * Number(bundle.price);
                                    remainingCount = remainingCount % bundle.photo_count;
                                }
                            }
                        }

                        // Remaining singles
                        standardItemsTotal += remainingCount * singleItemPrice;
                        console.log(`Dynamic Bundling: Configured Bundles Used. Remaining Singles: ${remainingCount}`);
                    } else {
                        // Library not found? Fallback to simple calculation
                        standardItemsTotal = standardItemsCount * singleItemPrice;
                    }
                } else {
                    // No library context? Regular price.
                    standardItemsTotal = standardItemsCount * singleItemPrice;
                }

                amount = standardItemsTotal + otherItemsTotal;

                console.log(`Pricing Breakdown: ${standardItemsCount} Std Items ($${standardItemsTotal.toFixed(2)}) + Other ($${otherItemsTotal.toFixed(2)})`);

                console.log(`Dynamic Pricing Calculated. Total: $${amount.toFixed(2)}`);

                // PayPal Logic
                const environment = process.env.PAYPAL_ENVIRONMENT || 'SANDBOX';
                const isSandbox = environment.toUpperCase() === 'SANDBOX';
                const clientId = isSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID) : process.env.PAYPAL_CLIENT_ID;
                const clientSecret = isSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET) : process.env.PAYPAL_CLIENT_SECRET;
                const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';

                console.log('Using PayPal Environment:', environment);
                console.log('Using Client ID:', clientId ? (clientId.substring(0, 5) + '...') : 'MISSING');

                if (isSandbox && (!clientId || !clientId.startsWith('A'))) {
                    console.warn('⚠️  WARNING: You are in SANDBOX mode but the Client ID does not look like a standard sandbox key (usually starts with A).');
                    console.warn('⚠️  If this fails with 401/invalid_client, please provide valid Sandbox credentials in .env.local as PAYPAL_CLIENT_ID_SANDBOX');
                }

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
                    const errText = await tokenRes.text();
                    console.error('PayPal Token Error:', errText);
                    return setJsonRes(500, { error: 'PayPal token generation failed. Check server logs for details.' });
                }

                const { access_token } = await tokenRes.json();
                console.log('   Access Token received.');

                // Store metadata via a short reference ID because PayPal custom_id limit is 127 chars
                const internalRefId = `LOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                pendingOrders.set(internalRefId, { photoIds, email, userId, amount, librarySlug, metadata });

                // Expiration for memory cleanup (optional but good practice)
                setTimeout(() => pendingOrders.delete(internalRefId), 3600000); // 1 hour

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
                            custom_id: internalRefId // Short ID fits in 127 chars
                        }],
                        application_context: {
                            brand_name: 'THE LOST+UNFOUNDS (LOCAL)',
                            landing_page: 'NO_PREFERENCE',
                            user_action: 'PAY_NOW',
                            return_url: `http://localhost:3000/payment/success?library=${librarySlug || ''}`,
                            cancel_url: 'http://localhost:3000/payment/cancel'
                        }
                    })
                });

                if (!orderRes.ok) {
                    const errText = await orderRes.text();
                    console.error('PayPal Order Error:', errText);
                    return setJsonRes(500, { error: 'PayPal order creation failed', details: errText });
                }

                const order = await orderRes.json();
                const approvalUrl = order.links.find(l => l.rel === 'approve')?.href;

                console.log('   PayPal Approval URL:', approvalUrl);
                return setJsonRes(200, { approvalUrl });

            } catch (err) {
                console.error('Checkout handler error:', err);
                return setJsonRes(500, {
                    error: 'Internal server error',
                    details: err.message,
                    stack: err.stack
                });
            }
        });
        return;
    }

    if ((pathname === '/api/shop/payments/paypal/capture' || pathname === '/api/gallery/capture') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const { orderId } = JSON.parse(body || '{}');
            if (!orderId) return setJsonRes(400, { error: 'Missing orderId' });

            console.log('Capturing Local Order:', orderId);

            try {
                // 0. Idempotency Check (Support internal UUID or PayPal ID)
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
                let checkQuery = supabase.from('photo_orders').select('id, payment_status');
                if (isUuid) {
                    checkQuery = checkQuery.or(`id.eq.${orderId},paypal_order_id.eq.${orderId}`);
                } else {
                    checkQuery = checkQuery.eq('paypal_order_id', orderId);
                }
                const { data: earlyCheck } = await checkQuery.maybeSingle();

                if (earlyCheck?.payment_status === 'completed') {
                    console.log('   Order already completed in DB:', earlyCheck.id);
                    const { data: existingE } = await supabase
                        .from('photo_entitlements')
                        .select('token, photo_id')
                        .eq('order_id', earlyCheck.id);

                    if (existingE && existingE.length > 0) {
                        const pIds = existingE.map(e => e.photo_id);
                        const { data: photos } = await supabase
                            .from('photos')
                            .select('id, title, google_drive_file_id, photo_libraries(name)')
                            .in('id', pIds);

                        const libraryTitle = photos?.[0]?.photo_libraries?.name || 'GALLERY';

                        return setJsonRes(200, {
                            success: true,
                            message: 'Order already captured (Idempotent)',
                            libraryTitle,
                            entitlements: existingE.map(e => {
                                const p = photos?.find(ph => ph.id === e.photo_id);
                                return {
                                    token: e.token,
                                    photoId: e.photo_id,
                                    photoTitle: p?.title || 'Purchased Photo',
                                    thumbnailUrl: p?.google_drive_file_id ? `/api/gallery/stream?fileId=${p.google_drive_file_id}&size=400` : null
                                };
                            })
                        });
                    }
                }

                // 1. Get Access Token
                const environment = process.env.PAYPAL_ENVIRONMENT || 'SANDBOX';
                const isSandbox = environment.toUpperCase() === 'SANDBOX';
                const clientId = isSandbox ? (process.env.PAYPAL_CLIENT_ID_SANDBOX || process.env.PAYPAL_CLIENT_ID) : process.env.PAYPAL_CLIENT_ID;
                const clientSecret = isSandbox ? (process.env.PAYPAL_CLIENT_SECRET_SANDBOX || process.env.PAYPAL_CLIENT_SECRET) : process.env.PAYPAL_CLIENT_SECRET;
                const baseUrl = isSandbox ? 'https://api.sandbox.paypal.com' : 'https://api.paypal.com';

                const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
                const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'grant_type=client_credentials'
                });
                const { access_token } = await tokenRes.json();

                // 2. Capture Order
                const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
                });

                if (!captureRes.ok) {
                    const errText = await captureRes.text();

                    // Handle "Already Captured" or "Max Attempts" scenarios
                    if (errText.includes('ORDER_ALREADY_CAPTURED') || errText.includes('MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED')) {
                        console.log('⚠️ Order capture limit/status reached. Fetching existing entitlements via 2-step lookup...');

                        // Step 1: Find the order
                        const { data: orderData } = await supabase
                            .from('photo_orders')
                            .select('id')
                            .eq('paypal_order_id', orderId)
                            .single();

                        if (orderData) {
                            console.log('   Found Order ID:', orderData.id);
                            // Step 2: Get entitlements
                            const { data: existingE } = await supabase
                                .from('photo_entitlements')
                                .select('token, photo_id')
                                .eq('order_id', orderData.id);

                            console.log('   Found Entitlements:', existingE?.length);

                            if (existingE && existingE.length > 0) {
                                // Fetch photo details for thumbnails
                                const pIds = existingE.map(e => e.photo_id);
                                const { data: photos } = await supabase
                                    .from('photos')
                                    .select('id, title, google_drive_file_id, photo_libraries(name)')
                                    .in('id', pIds);

                                const libraryTitle = photos?.[0]?.photo_libraries?.name || 'GALLERY';

                                return setJsonRes(200, {
                                    success: true,
                                    message: 'Order already captured',
                                    libraryTitle,
                                    entitlements: existingE.map(e => {
                                        const p = photos?.find(ph => ph.id === e.photo_id);
                                        return {
                                            token: e.token,
                                            photoId: e.photo_id,
                                            photoTitle: p?.title || 'Purchased Photo',
                                            thumbnailUrl: p?.google_drive_file_id ? `/api/gallery/stream?fileId=${p.google_drive_file_id}&size=400` : null
                                        };
                                    })
                                });
                            }
                        } else {
                            console.error('❌ Order already captured at PayPal but NOT found in DB:', orderId);
                        }
                    }

                    console.error('Capture Failed:', errText);
                    return setJsonRes(500, { error: 'Capture failed', details: errText });
                }
                const captureData = await captureRes.json();

                // 3. Find Metadata to unlock content
                // We need to look up the 'custom_id' from the capture data (purchase_units[0].payments.captures[0].custom_id)
                // OR fetch the order details if not in capture response.
                // Usually it's in captureData.purchase_units[0].payments.captures[0].custom_id

                // Let's safe fetch logic:
                let internalRefId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
                    captureData.purchase_units?.[0]?.custom_id;

                if (!internalRefId) {
                    console.log('   Metadata not in capture, fetching order details...');
                    const orderDetailRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
                        headers: { 'Authorization': `Bearer ${access_token}` }
                    });
                    const orderDetail = await orderDetailRes.json();
                    internalRefId = orderDetail.purchase_units?.[0]?.custom_id || orderDetail.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;
                }

                console.log('   Reference ID found:', internalRefId);
                const metadata = pendingOrders.get(internalRefId);

                if (metadata) {
                    const { photoIds, email, userId, librarySlug } = metadata;
                    console.log('✅ Metadata Retrieved for Order:', internalRefId);
                    console.log('   > Email:', email);
                    console.log('   > Library:', librarySlug);
                    console.log('   > Items:', photoIds?.length);
                    console.log('Fulfilling purchase for:', email, 'Photos:', photoIds.length, 'Slug:', librarySlug);

                    // Proceed with fulfillment...
                } else {
                    console.warn('⚠️ Metadata missing from memory (Server restart?). Checking DB for existing order...');
                    // Fallback Recovery: Check DB
                    const { data: existingOrd } = await supabase
                        .from('photo_orders')
                        .select('id')
                        .eq('paypal_order_id', orderId)
                        .single();

                    if (existingOrd) {
                        const { data: existingE } = await supabase
                            .from('photo_entitlements')
                            .select('token, photo_id')
                            .eq('order_id', existingOrd.id);

                        if (existingE && existingE.length > 0) {
                            console.log('   ✅ Recovered entitlements from DB:', existingE.length);

                            // Fetch photo details for thumbnails
                            const pIds = existingE.map(e => e.photo_id);
                            const { data: photos } = await supabase
                                .from('photos')
                                .select('id, title, google_drive_file_id, photo_libraries(name)')
                                .in('id', pIds);

                            const libraryTitle = photos?.[0]?.photo_libraries?.name || 'GALLERY';

                            return setJsonRes(200, {
                                success: true,
                                message: 'Captured locally (Recovered)',
                                captureData,
                                libraryTitle,
                                entitlements: existingE.map(e => {
                                    const p = photos?.find(ph => ph.id === e.photo_id);
                                    return {
                                        token: e.token,
                                        photoId: e.photo_id,
                                        photoTitle: p?.title || 'Purchased Photo',
                                        thumbnailUrl: p?.google_drive_file_id ? `/api/gallery/stream?fileId=${p.google_drive_file_id}&size=400` : null
                                    };
                                })
                            });
                        }
                    }
                    console.error('❌ Could not recover order metadata or DB record.');
                }

                // If we found metadata, continue to fulfillment logic below...
                if (metadata) {
                    const { photoIds, email, userId, librarySlug } = metadata;

                    // --- ZOHO EMAIL LOGIC START ---
                    try {
                        const zohoClientId = process.env.ZOHO_CLIENT_ID ? process.env.ZOHO_CLIENT_ID.trim() : '';
                        const zohoSecret = process.env.ZOHO_CLIENT_SECRET ? process.env.ZOHO_CLIENT_SECRET.trim() : '';
                        const zohoRefresh = process.env.ZOHO_REFRESH_TOKEN ? process.env.ZOHO_REFRESH_TOKEN.trim() : '';
                        const zohoFrom = (process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || '').trim();

                        if (zohoClientId && zohoSecret && zohoRefresh && zohoFrom) {
                            console.log('📧 Sending confirmation email via Zoho...');

                            // 1. Get Access Token
                            const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    refresh_token: zohoRefresh,
                                    client_id: zohoClientId,
                                    client_secret: zohoSecret,
                                    grant_type: 'refresh_token'
                                })
                            });

                            console.log('   Zoho Token Status:', tokenRes.status);
                            console.log('   Refresh Token Length:', zohoRefresh ? zohoRefresh.length : 0);

                            if (!tokenRes.ok) {
                                const errTxt = await tokenRes.text();
                                console.error('Zoho Token Error Body:', errTxt.substring(0, 200) + '...'); // Truncate HTML
                                throw new Error(`Zoho Token Failed: ${tokenRes.status}`);
                            }
                            const tokenData = await tokenRes.json();
                            const accessToken = tokenData.access_token;

                            // 2. Get Account ID
                            const accountRes = await fetch('https://mail.zoho.com/api/accounts', {
                                headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
                            });
                            const accountData = await accountRes.json();
                            const accountId = accountData.data?.[0]?.accountId || accountData.data?.[0]?.account_id;

                            if (accountId) {
                                const galleryUrl = `http://localhost:3000/photos/success?token=${orderId}`;
                                const emailContent = wrapEmail(`
                                    <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
                                        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                                            ACCESS GRANTED
                                        </h1>
                                        <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                                            YOUR SECURED ARCHIVE ITEMS ARE READY FOR ACCESS.
                                        </p>
                                        <div style="margin: 40px 0;">
                                            <a href="${galleryUrl}" style="${EMAIL_STYLES.button}">ACCESS GALLERY</a>
                                        </div>
                                        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                                            <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                                                SECURE AUTOMATED DELIVERY SYSTEM<br/>
                                                ORDER ID: ${orderId}<br/>
                                                DESTINATION: ${email}
                                            </p>
                                        </div>
                                    </div>
                                `);

                                const mailPayload = {
                                    fromAddress: zohoFrom,
                                    toAddress: email,
                                    subject: "ARCHIVE ACCESS GRANTED | THE LOST+UNFOUNDS",
                                    content: emailContent,
                                    mailFormat: 'html'
                                };

                                await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
                                    method: 'POST',
                                    headers: {
                                        Authorization: `Zoho-oauthtoken ${accessToken}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(mailPayload)
                                });
                                console.log('✅ Email sent successfully to:', email);
                            } else {
                                console.warn('⚠️ No Zoho accountId found. Email skipped.');
                            }
                        } else {
                            console.warn('⚠️ Zoho credentials missing. Skipping email attempt.');
                        }
                    } catch (emailErr) {
                        console.error('❌ Failed to send email:', emailErr.message);
                        console.log('📧 [FALLBACK LOG] Email attempt failed. Ensure Zoho tokens are valid.');
                    }
                    // --- ZOHO EMAIL LOGIC END ---

                    // --- DATABASE RECORDING START ---
                    try {
                        let { data: order, error: orderErr } = await supabase
                            .from('photo_orders')
                            .insert({
                                paypal_order_id: orderId,
                                user_id: metadata.userId || null,
                                total_amount_cents: Math.round((metadata.amount || 0) * 100),
                                payment_status: 'completed',
                                email: metadata.email,
                                metadata: metadata.metadata || {}
                            })
                            .select('id')
                            .single();

                        if (orderErr) {
                            // Handle duplicate order (race condition or retry)
                            if (orderErr.code === '23505') {
                                console.log('⚠️ Order duplicate detected (23505). Fetching existing ID...');
                                const { data: existingOrder } = await supabase
                                    .from('photo_orders')
                                    .select('id')
                                    .eq('paypal_order_id', orderId)
                                    .single();
                                if (existingOrder) {
                                    order = existingOrder;
                                    // Manually clear error state to proceed
                                    orderErr = null;
                                }
                            }

                            if (orderErr) {
                                console.error('❌ Failed to save photo order:', orderErr);
                            }
                        }

                        // Continue if we have a valid order (either new or existing)
                        if (order) {
                            const entitlements = photoIds.map(pid => ({
                                order_id: order.id,
                                photo_id: pid
                            }));
                            const { data: createdEntitlements, error: entErr } = await supabase
                                .from('photo_entitlements')
                                .insert(entitlements)
                                .select('token, photo_id'); // Removed photos(title)

                            if (entErr) {
                                console.error('❌ Failed to save photo entitlements:', entErr);
                            } else {
                                console.log('✅ Purchase recorded. Entitlements Found:', createdEntitlements?.length);

                                // Fetch photo details for thumbnails
                                const pIds = createdEntitlements.map(e => e.photo_id);
                                const { data: photos } = await supabase
                                    .from('photos')
                                    .select('id, title, google_drive_file_id, photo_libraries(name)')
                                    .in('id', pIds);

                                const libraryTitle = photos?.[0]?.photo_libraries?.name || 'GALLERY';

                                return setJsonRes(200, {
                                    success: true,
                                    message: 'Captured locally',
                                    captureData,
                                    libraryTitle,
                                    entitlements: createdEntitlements?.map(e => {
                                        const p = photos?.find(ph => ph.id === e.photo_id);
                                        return {
                                            token: e.token,
                                            photoId: e.photo_id,
                                            photoTitle: p?.title || 'Purchased Photo',
                                            thumbnailUrl: p?.google_drive_file_id ? `/api/gallery/stream?fileId=${p.google_drive_file_id}&size=400` : null
                                        };
                                    })
                                });
                            }
                        }
                    } catch (dbErr) {
                        console.error('❌ Database fulfillment error:', dbErr);
                    }
                    // --- DATABASE RECORDING END ---
                }

                // Fallback success if DB insert failed but payment worked (shouldn't happen often)
                return setJsonRes(200, { success: true, message: 'Captured locally (DB Warning)', captureData });

            } catch (e) {
                console.error('Capture Local Error:', e);
                return setJsonRes(500, { error: e.message });
            }
        });
        return;
    }

    if (pathname === '/api/gallery/resend-order' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const { orderId, email } = JSON.parse(body || '{}');
            if (!orderId || !email) return setJsonRes(400, { error: 'Missing requirements' });

            try {
                const { data: order } = await supabase
                    .from('photo_orders')
                    .select('*')
                    .eq('id', orderId)
                    .eq('email', email)
                    .single();

                if (!order) return setJsonRes(404, { error: 'Order not found' });

                const { data: entitlements } = await supabase
                    .from('photo_entitlements')
                    .select('token, photos(title)')
                    .eq('order_id', orderId);

                if (!entitlements || entitlements.length === 0) {
                    return setJsonRes(404, { error: 'No entitlements found for this order' });
                }

                try {
                    const zohoClientId = (process.env.ZOHO_CLIENT_ID || '').trim();
                    const zohoSecret = (process.env.ZOHO_CLIENT_SECRET || '').trim();
                    const zohoRefresh = (process.env.ZOHO_REFRESH_TOKEN || '').trim();
                    const zohoFrom = (process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || '').trim();

                    if (zohoClientId && zohoSecret && zohoRefresh && zohoFrom) {
                        const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                refresh_token: zohoRefresh,
                                client_id: zohoClientId,
                                client_secret: zohoSecret,
                                grant_type: 'refresh_token'
                            })
                        });
                        const tokenData = await tokenRes.json();
                        const accessToken = tokenData.access_token;

                        const accountRes = await fetch('https://mail.zoho.com/api/accounts', {
                            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
                        });
                        const accountData = await accountRes.json();
                        const accountId = accountData.data?.[0]?.accountId || accountData.data?.[0]?.account_id;

                        if (accountId) {
                            const galleryUrl = `http://localhost:3000/photos/success?token=${orderId}`;
                            const emailContent = wrapEmail(`
                                <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
                                    <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block;">
                                        ACCESS RESTORED
                                    </h1>
                                    <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                                        YOUR SECURED ARCHIVE ITEMS ARE READY FOR DOWNLOAD.
                                    </p>
                                    <div style="margin: 40px 0;">
                                        <a href="${galleryUrl}" style="${EMAIL_STYLES.button}">ACCESS GALLERY</a>
                                    </div>
                                    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                                        <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                                            SECURE AUTOMATED DELIVERY SYSTEM<br/>
                                            ORDER ID: ${orderId}<br/>
                                            DESTINATION: ${email}
                                        </p>
                                    </div>
                                </div>
                            `);

                            await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    fromAddress: zohoFrom,
                                    toAddress: email,
                                    subject: "Safe House Access - THE LOST+UNFOUNDS",
                                    content: emailContent,
                                    mailFormat: 'html'
                                })
                            });
                            console.log('✅ Resend email successful to:', email);
                        }
                    }
                } catch (emailErr) {
                    console.error('❌ Failed to resend email:', emailErr.message);
                }

                return setJsonRes(200, { success: true });
            } catch (err) {
                console.error('❌ Resend Error:', err);
                return setJsonRes(500, { error: err.message });
            }
        });
        return;
    }

    if (pathname === '/api/photos/download' && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const token = urlObj.searchParams.get('token');

        if (!token) {
            return setJsonRes(400, { error: 'Missing token' });
        }

        try {
            // 1. Verify token and get photo info
            const { data: entitlement, error: entitlementError } = await supabase
                .from('photo_entitlements')
                .select('*, photos!inner(google_drive_file_id, title)')
                .eq('token', token)
                .single();

            if (entitlementError || !entitlement) {
                console.error('[Download] Invalid token:', token, entitlementError);
                return setJsonRes(44, { error: 'Invalid or expired download token' });
            }

            const fileId = entitlement.photos.google_drive_file_id;
            const title = entitlement.photos.title || 'photo';

            // 2. Stream using the same logic as /api/gallery/stream
            const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}=s0`;
            console.log(`[Download] Fetching high-res for ${title}: ${driveUrl}`);

            const driveRes = await fetch(driveUrl, {
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!driveRes.ok) {
                console.error(`[Download] Failed to fetch: ${driveRes.status}`);
                return setJsonRes(502, { error: `Upstream error: ${driveRes.status}` });
            }

            // Check if we got an HTML login page
            const contentType = driveRes.headers.get('content-type');
            if (contentType && contentType.toLowerCase().includes('text/html')) {
                console.error('[Download] Received HTML instead of image. Likely auth redirection.');
                return setJsonRes(403, { error: 'File requires authentication. Please ensure Google Drive link settings are "Anyone with the link".' });
            }

            // Update download count (fire and forget locally)
            supabase
                .from('photo_entitlements')
                .update({ download_count: (entitlement.download_count || 0) + 1 })
                .eq('id', entitlement.id)
                .then(({ error }) => { if (error) console.error('[Download] Failed to update count:', error); });

            // Set headers for download
            res.writeHead(200, {
                'Content-Type': contentType || 'image/jpeg',
                'Content-Disposition': `attachment; filename="${title}.jpg"`,
                'Access-Control-Allow-Origin': '*'
            });

            if (driveRes.body) {
                const { Readable } = await import('stream');
                console.log(`[Download] Piping high-res stream for ${title}...`);
                Readable.fromWeb(driveRes.body).pipe(res);
            } else {
                res.end();
            }

        } catch (err) {
            console.error('[Download] Critical error:', err);
            if (!res.headersSent) setJsonRes(500, { error: 'Internal Download Error' });
        }
        return;
    }

    if (pathname === '/api/gallery/stream' && req.method === 'GET') {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const fileId = urlObj.searchParams.get('fileId');
        const isDownload = urlObj.searchParams.get('download') === 'true';

        console.log(`[Stream] Request for fileId: ${fileId}`);

        if (!fileId) {
            return setJsonRes(400, { error: 'Missing fileId' });
        }

        try {
            // Use the lh3 URL format which is generally better for public images, remove authuser
            const driveUrl = `https://lh3.googleusercontent.com/d/${fileId}=s0`;
            console.log(`[Stream] Fetching upstream: ${driveUrl}`);

            const driveRes = await fetch(driveUrl, {
                redirect: 'follow', // Explicitly follow redirects
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            console.log(`[Stream] Upstream status: ${driveRes.status} ${driveRes.statusText}`);
            console.log(`[Stream] Upstream content-type: ${driveRes.headers.get('content-type')}`);

            if (!driveRes.ok) {
                console.error(`[Stream] Failed to fetch: ${driveRes.status}`);
                return setJsonRes(502, { error: `Upstream error: ${driveRes.status}` });
            }

            // Check if we got an HTML login page
            const contentType = driveRes.headers.get('content-type');
            if (contentType && contentType.toLowerCase().includes('text/html')) {
                console.error('[Stream] Received HTML instead of image. Likely auth redirection.');
                return setJsonRes(403, { error: 'File requires authentication. Please ensure Google Drive link settings are "Anyone with the link".' });
            }

            // Construct new clean headers
            const headers = {
                'Content-Type': contentType || 'application/octet-stream',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Cache-Control': 'public, max-age=3600'
            };

            if (isDownload) {
                headers['Content-Disposition'] = `attachment; filename="photo-${fileId}.jpg"`; // Use a safe filename
            }

            res.writeHead(200, headers);

            if (driveRes.body) {
                const { Readable } = await import('stream');
                console.log('[Stream] Piping response...');
                Readable.fromWeb(driveRes.body).pipe(res);
            } else {
                res.end();
            }

        } catch (err) {
            console.error('[Stream] Critical error:', err);
            if (!res.headersSent) setJsonRes(500, { error: 'Internal Streaming Error' });
        }
        return;
    }

    // Default 404
    setJsonRes(404, {
        error: `Route not found: ${req.method} ${pathname}`,
        help: "If this looks correct, ensure local-server.js was restarted after code changes."
    });
});

server.listen(PORT, () => {
    console.log(`Local API Server running on http://localhost:${PORT}`);
    console.log('Enabling local PayPal sandbox testing...');
});
