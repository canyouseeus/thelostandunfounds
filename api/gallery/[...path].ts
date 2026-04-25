// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
// import { google } from 'googleapis'; // Moved to dynamic import to prevent cold start crashes
import dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';
// syncGalleryPhotos is dynamically imported inside handleSync to avoid loading
// googleapis on every cold start (stream/checkout/capture don't need it)

// --- INLINED EMAIL TEMPLATE UTILS (to avoid Vercel module resolution path errors) ---
const BRAND = {
    name: 'THE LOST+UNFOUNDS',
    logo: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png',
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
    heading1: `color: ${BRAND.colors.text} !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 0.1em;`,
    heading2: `color: ${BRAND.colors.text} !important; font-size: 24px; font-weight: bold; margin: 30px 0 20px 0; letter-spacing: 0.1em;`,
    heading3: `color: ${BRAND.colors.text} !important; font-size: 20px; font-weight: bold; margin: 25px 0 15px 0;`,
    paragraph: `color: ${BRAND.colors.text} !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;`,
    link: `color: ${BRAND.colors.link}; text-decoration: underline;`,
    button: `display: inline-block; padding: 14px 28px; background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background}; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid ${BRAND.colors.text};`,
    divider: `border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;`,
    muted: `color: ${BRAND.colors.textMuted}; font-size: 14px; line-height: 1.5;`,
};

function generateTransactionalEmail(bodyContent: string): string {
    const currentYear = new Date().getFullYear();
    const footerHtml = `
              <hr style="border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;">
              <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left;">
                © ${currentYear} ${BRAND.name}. All rights reserved.
              </p>
  `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.name}</title>
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    /* Brand styles */
    body {
      background-color: ${BRAND.colors.background} !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, Helvetica, sans-serif;
      color: ${BRAND.colors.text};
    }
    table {
      background-color: ${BRAND.colors.background} !important;
      border-collapse: collapse !important;
    }
    td {
      background-color: ${BRAND.colors.background} !important;
    }
    a {
      color: ${BRAND.colors.link};
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${BRAND.colors.text} !important;
      font-family: Arial, Helvetica, sans-serif;
      margin: 0 0 20px 0;
    }
    p {
      color: ${BRAND.colors.text} !important;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    ul, ol {
      color: ${BRAND.colors.text} !important;
      font-size: 16px;
      line-height: 1.8;
      margin: 0 0 20px 0;
      padding-left: 20px;
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: ${BRAND.colors.background} !important; font-family: Arial, Helvetica, sans-serif;">
  <!-- Email wrapper table -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100% !important; border-collapse: collapse !important; background-color: ${BRAND.colors.background} !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important; background-color: ${BRAND.colors.background} !important;">
        <!-- Content container -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px !important; width: 100% !important; background-color: ${BRAND.colors.background} !important; margin: 0 auto !important;">
          <!-- Logo -->
          <tr>
            <td align="left" style="padding: 0 0 30px 0 !important;">
              <a href="${BRAND.website}" target="_blank">
                <img src="${BRAND.logo}" alt="${BRAND.name}" style="max-width: 100%; height: auto; display: block;">
              </a>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td style="padding: 0 !important; color: ${BRAND.colors.text} !important;">
              ${bodyContent}
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
// ---------------------------------------------------------------------------------------------------

// Load env vars if running locally
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const { width = 1600, height = 1200 } = await image.metadata();

    const fontSize = Math.max(24, Math.round(Math.min(width, height) * 0.04));
    const padding = Math.round(fontSize * 0.8);
    const textWidth = Math.round(fontSize * 7.5); // approx width of "@tlau.photos"
    const textHeight = Math.round(fontSize * 1.4);

    // SVG watermark: bottom-right corner, semi-transparent
    const watermarkSvg = `<svg width="${textWidth + padding * 2}" height="${textHeight + padding}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" rx="4"/>
      <text
        x="${padding}"
        y="${textHeight * 0.82}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="rgba(255,255,255,0.75)"
        letter-spacing="1"
      >@tlau.photos</text>
    </svg>`;

    const watermarkBuffer = Buffer.from(watermarkSvg);
    const wmWidth = textWidth + padding * 2;
    const wmHeight = textHeight + padding;

    return image
        .jpeg({ quality: 92 })
        .composite([{
            input: watermarkBuffer,
            gravity: 'southeast',
            left: width - wmWidth - Math.round(width * 0.015),
            top: height - wmHeight - Math.round(height * 0.015),
        }])
        .toBuffer();
}

// Build a branded download filename: the_lost_and_unfounds_llc_joshua_abram_greene_[title].jpg
function buildDownloadFilename(rawTitle: string): string {
    const PREFIX = 'the_lost_and_unfounds_llc_joshua_abram_greene';
    const sanitized = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')  // non-alphanumeric → underscore
        .replace(/^_+|_+$/g, '');      // trim leading/trailing underscores
    return `${PREFIX}_${sanitized || 'photo'}.jpg`;
}

async function fetchViaServiceAccount(fileId: string, targetSize: number): Promise<{ buffer: Buffer; contentType: string } | null> {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const saKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!saEmail || !saKey) return null;
    try {
        const { google } = await import('googleapis');
        const auth = new google.auth.JWT({
            email: saEmail,
            key: saKey,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const { token } = await auth.getAccessToken();
        if (!token) return null;
        const fileRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
            {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(25000),
            }
        );
        if (!fileRes.ok) {
            console.warn('[stream] SA drive fetch failed:', fileRes.status);
            return null;
        }
        const contentType = fileRes.headers.get('content-type') || 'image/jpeg';
        if (!contentType.includes('image')) return null;
        const fullBuffer = Buffer.from(await fileRes.arrayBuffer());
        if (targetSize > 0 && targetSize < 4096) {
            const resized = await sharp(fullBuffer)
                .resize(targetSize, targetSize, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            return { buffer: resized, contentType: 'image/jpeg' };
        }
        return { buffer: fullBuffer, contentType };
    } catch (err: any) {
        console.warn('[stream] SA fallback error:', err?.message);
        return null;
    }
}

async function handleStream(req: VercelRequest, res: VercelResponse) {
    const { fileId, size, download, email } = req.query;
    const isDownload = download === 'true';

    try {
        if (!fileId) {
            return res.status(400).json({ error: 'Missing fileId' });
        }

        // Downloads require an email for tracking + contact follow-up.
        // Views (no download flag) stay public as before.
        const emailStr = typeof email === 'string' ? email.trim() : '';
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
        if (isDownload && !emailValid) {
            return res.status(400).json({ error: 'A valid email is required to download.' });
        }

        // Look up photo (id + title) from DB — id goes into the download event log,
        // title drives the branded filename.
        let downloadFilename = buildDownloadFilename('photo');
        let photoIdForEvent: string | null = null;
        if (isDownload) {
            try {
                const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
                const { data: photo } = await supabase
                    .from('photos')
                    .select('id, title')
                    .eq('google_drive_file_id', fileId as string)
                    .single();
                if (photo?.title) downloadFilename = buildDownloadFilename(photo.title);
                if (photo?.id) photoIdForEvent = photo.id as string;
            } catch {
                // Non-fatal — fall back to generic filename
            }

            // Fire-and-forget: write the download event.
            try {
                const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
                const ipRaw = (req.headers['x-forwarded-for'] as string | undefined) || (req.socket as any)?.remoteAddress || '';
                const ip = ipRaw.split(',')[0].trim() || null;
                const ua = (req.headers['user-agent'] as string | undefined) || null;
                void supabase.from('photo_download_events').insert({
                    photo_id: photoIdForEvent,
                    google_drive_file_id: fileId as string,
                    email: emailStr,
                    ip_address: ip,
                    user_agent: ua,
                    source: 'free',
                }).then(({ error: insErr }) => {
                    if (insErr) console.warn('[download-event] insert failed:', insErr.message);
                });
            } catch (err: any) {
                console.warn('[download-event] skipped:', err?.message);
            }
        }

        // Try lh3 first (direct link) — use full resolution for downloads
        const fetchSize = isDownload ? 'w4096-h4096' : (size || 1600);
        const lh3Url = `https://lh3.googleusercontent.com/d/${fileId}=s${fetchSize}`;

        let lh3Status = 0;
        let lh3ContentType = '';
        let lh3Buffer: Buffer | null = null;

        try {
            const response = await fetch(lh3Url, { signal: AbortSignal.timeout(15000) });
            lh3Status = response.status;
            lh3ContentType = response.headers.get('content-type') || '';
            if (response.ok && lh3ContentType.includes('image')) {
                lh3Buffer = Buffer.from(await response.arrayBuffer());
            }
        } catch (lh3Err: any) {
            console.warn('[stream] lh3 fetch failed:', lh3Err?.message);
        }

        if (lh3Buffer) {
            if (isDownload) {
                const watermarked = await addWatermark(lh3Buffer);
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(watermarked);
            }
            res.setHeader('Content-Type', lh3ContentType || 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(lh3Buffer);
        }

        console.warn('[stream] lh3 failed, trying service account:', { fileId, lh3Status, lh3ContentType });

        // Fallback: authenticated Drive API via service account
        const targetSize = isDownload ? 0 : Number(size || 1600);
        const saResult = await fetchViaServiceAccount(fileId as string, targetSize);

        if (saResult) {
            if (isDownload) {
                const watermarked = await addWatermark(saResult.buffer);
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(watermarked);
            }
            res.setHeader('Content-Type', saResult.contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.send(saResult.buffer);
        }

        console.error('[stream] All methods failed for fileId:', fileId, { lh3Status });

        const statusCode = lh3Status === 403 ? 403 : 404;
        return res.status(statusCode).json({
            error: statusCode === 403
                ? 'File not accessible. Check Drive sharing settings.'
                : 'Image not found or inaccessible',
            debug: { lh3: lh3Status }
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

        // Diagnostic logging for debugging 403 errors
        console.log('[Gallery Checkout] Using Supabase key:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY,
            svcKeyLength: SUPABASE_SERVICE_ROLE_KEY?.length,
            fallbackToAnon: !SUPABASE_SERVICE_ROLE_KEY && !!process.env.VITE_SUPABASE_ANON_KEY
        });

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

        // Calculate total price with Tiered Pricing support
        const { data: photos, error: photoError } = await supabase
            .from('photos')
            .select('id, price_cents, library_id')
            .in('id', photoIds);

        if (photoError || !photos) {
            console.error('Photo fetch error:', photoError);
            return res.status(500).json({ error: 'Failed to fetch photo prices' });
        }

        // Group photos by library to apply library-specific pricing
        const photosByLibrary: Record<string, typeof photos> = {};
        photos.forEach(p => {
            const libId = p.library_id || 'unknown';
            if (!photosByLibrary[libId]) photosByLibrary[libId] = [];
            photosByLibrary[libId].push(p);
        });

        let totalCents = 0;

        for (const [libId, libPhotos] of Object.entries(photosByLibrary)) {
            if (libId === 'unknown') {
                // Fallback for unknown library
                totalCents += libPhotos.reduce((sum, p) => sum + (p.price_cents || 500), 0);
                continue;
            }

            // Fetch pricing options for this library
            const { data: options } = await supabase
                .from('gallery_pricing_options')
                .select('*')
                .eq('library_id', libId)
                .eq('is_active', true);

            const count = libPhotos.length;
            const bundleOption = options?.find(o => o.photo_count === count);

            if (bundleOption) {
                console.log(`[Pricing] Found bundle for ${count} photos: $${bundleOption.price}`);
                totalCents += Math.round(bundleOption.price * 100);
            } else {
                // Use "Single Photo" price or fallback
                const singleOption = options?.find(o => o.photo_count === 1);
                if (singleOption) {
                    console.log(`[Pricing] Using single photo price: $${singleOption.price} x ${count}`);
                    totalCents += Math.round(singleOption.price * 100) * count;
                } else {
                    console.log(`[Pricing] Fallback to legacy price_cents`);
                    totalCents += libPhotos.reduce((sum, p) => sum + (p.price_cents || 500), 0);
                }
            }
        }

        const amount = totalCents / 100;

        // --- NEW LOGIC: Create Pending Order in DB FIRST ---
        // This avoids PayPal custom_id string limit bugs

        // Determine PayPal Environment first
        const environmentRaw = (process.env.PAYPAL_ENVIRONMENT || 'SANDBOX');
        const environment = environmentRaw.replace(/[^a-zA-Z0-9_-]/g, '').trim();
        const isSandbox = environment.toUpperCase() === 'SANDBOX';

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
                    source: 'checkout_v2',
                    environment: isSandbox ? 'sandbox' : 'production'
                }
            })
            .select('id')
            .single();

        if (orderError || !pendingOrder) {
            console.error('Failed to create pending order:', orderError);
            return res.status(500).json({ error: 'Failed to initialize order record' });
        }

        const internalRefId = pendingOrder.id; // UUID is safe for custom_id (36 chars)

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
        const { error: updateError } = await supabase
            .from('photo_orders')
            .update({ paypal_order_id: order.id })
            .eq('id', internalRefId);

        if (updateError) {
            console.error('Failed to link PayPal order ID to DB:', updateError);
            return res.status(500).json({ error: 'Failed to link order' });
        }

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

        // Diagnostic logging
        console.log('[Gallery Capture] Using Supabase key:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY
        });

        if (!SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Critical: SUPABASE_SERVICE_ROLE_KEY is missing');
            return res.status(500).json({ error: 'Server configuration error: Missing database keys' });
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
            const { data: ents, error: entsError } = await supabase
                .from('photo_entitlements')
                .select('*, photos(title, google_drive_file_id)')
                .eq('order_id', existingOrder.id);

            console.log(`[Capture-Idempotent] Order ${existingOrder.id} already completed.`);
            console.log(`[Capture-Idempotent] Entitlements found: ${ents?.length ?? 0}`);
            if (entsError) {
                console.error('[Capture-Idempotent] Error fetching entitlements:', entsError);
            }
            if (ents && ents.length > 0) {
                console.log('[Capture-Idempotent] First ent sample:', JSON.stringify(ents[0], null, 2));
            }

            // Default title since we removed the join
            let libraryTitle = 'GALLERY';

            return res.status(200).json({
                success: true,
                orderId: existingOrder.id,
                libraryTitle,
                entitlements: ents?.map(e => ({
                    photoId: e.photo_id,
                    token: e.token,
                    photoTitle: (e.photos as any)?.title,
                    thumbnailUrl: (e.photos as any)?.google_drive_file_id ? `/api/gallery/stream?fileId=${(e.photos as any).google_drive_file_id}&size=400` : null
                })) || []
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
        let captureData;
        const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        });

        if (!captureRes.ok) {
            const err = await captureRes.json().catch(() => ({}));
            console.warn('PayPal Capture returned error, checking status...', err);

            // Check if actually completed (handle idempotency or "Already Captured" error)
            const checkRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${access_token}` }
            });

            let recovered = false;
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.status === 'COMPLETED' || checkData.status === 'APPROVED') {
                    captureData = checkData;
                    recovered = true;
                    console.log('Order verified as COMPLETED/APPROVED despite capture error.');
                }
            }

            if (!recovered) {
                console.error('PayPal Capture Error (Fatal):', JSON.stringify(err, null, 2));
                return res.status(500).json({
                    error: 'Failed to capture payment',
                    details: err
                });
            }
        } else {
            captureData = await captureRes.json();
        }

        // 4. Update Database
        // First try updating by PayPal ID
        let { data: photoOrder, error: orderError } = await supabase
            .from('photo_orders')
            .update({ payment_status: 'completed' })
            .eq('paypal_order_id', orderId)
            .select()
            .single();

        // If not found, try to recover via custom_id (if we have it from PayPal data)
        const customId = captureData?.purchase_units?.[0]?.custom_id;
        if ((!photoOrder || orderError) && customId) {
            console.log('Recovering order via custom_id:', customId);
            const { data: recoveredOrder, error: recoverError } = await supabase
                .from('photo_orders')
                .update({
                    payment_status: 'completed',
                    paypal_order_id: orderId
                })
                .eq('id', customId)
                .select()
                .single();

            if (recoveredOrder) {
                photoOrder = recoveredOrder;
                orderError = null;
            } else if (recoverError) {
                console.error('Recovery failed:', recoverError);
            }
        }

        if (orderError || !photoOrder) {
            console.error('DB Update Error:', orderError);
            return res.status(500).json({ error: 'Order update failed' });
        }

        // 5. Ensure Entitlements Exist (Create if from new flow)
        let { data: ents, error: entsError } = await supabase
            .from('photo_entitlements')
            .select('*, photos(title, google_drive_file_id)')
            .eq('order_id', photoOrder.id);

        if (!ents || ents.length === 0) {
            // Check metadata for photoIds
            // Use type assertion to access metadata if it's typed as JSON
            const meta = photoOrder.metadata as any;
            if (meta && meta.photoIds && Array.isArray(meta.photoIds)) {
                console.log('Creating entitlements from metadata for order:', photoOrder.id);
                const newEntitlements = meta.photoIds.map((pid: string) => ({
                    order_id: photoOrder.id,
                    photo_id: pid,
                    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
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
                        .select('*, photos(title, google_drive_file_id)')
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
                htmlContent: generateTransactionalEmail(`
                    <h1 style="${EMAIL_STYLES.heading1}">ORDER CONFIRMED</h1>
                    <p style="${EMAIL_STYLES.paragraph}">
                        Thank you for your purchase. Your high-resolution photos are ready for download.
                    </p>
                    <div style="margin: 40px 0;">
                        <a href="${galleryUrl}" style="${EMAIL_STYLES.button}">DOWNLOAD PHOTOS</a>
                    </div>
                    <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                        <p style="${EMAIL_STYLES.muted}">
                            SECURE AUTOMATED DELIVERY SYSTEM<br/>
                            ORDER ID: ${photoOrder.id}<br/>
                            DESTINATION: ${photoOrder.email}
                        </p>
                    </div>
                `)
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
            })),
            librarySlug: photoOrder?.metadata?.librarySlug || 'gallery'
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

        // Diagnostic logging
        console.log('[Gallery Resend] Using Supabase key:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY
        });
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
                        <a href="${galleryUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">ACCESS GALLERY</a>
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

        // Diagnostic logging
        console.log('[Gallery Invite] Using Supabase key:', {
            hasUrl: !!SUPABASE_URL,
            hasSvcKey: !!SUPABASE_SERVICE_ROLE_KEY
        });
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

        const results = {
            succeeded: [] as string[],
            failed: [] as { email: string; error: string }[]
        };

        // Send to each email
        console.log(`[Gallery Invite] Starting invitation sequence for library: ${library.name} (${libraryId}). Target emails:`, emails);

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
                                <a href="${galleryUrl}" style="display: inline-block; padding: 14px 28px; background-color: #000; color: #fff; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">ENTER GALLERY</a>
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
                results.succeeded.push(email);
                console.log(`[Gallery Invite] Successfully sent invitation to ${email} for gallery: ${library.name}`);
            } catch (innerErr: any) {
                console.error(`Failed to send invite to ${email}:`, innerErr);
                results.failed.push({ email, error: innerErr.message || String(innerErr) });
            }
        }

        const hasFailures = results.failed.length > 0;
        // Return 207 Multi-Status if some failed, or 200 if all good (or 200 with stats)
        // Sticking to 200 to avoid breaking generic clients, but include details
        return res.status(200).json({
            success: !hasFailures,
            partial: hasFailures && results.succeeded.length > 0,
            results
        });
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
    if (html.includes(BANNER_URL) || html.includes('nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/')) {
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
    // First check for explicit account ID override
    const explicitAccountId = process.env.ZOHO_ACCOUNT_ID;
    if (explicitAccountId) {
        console.log('[Gallery Invite] Using explicit ZOHO_ACCOUNT_ID:', explicitAccountId);
        return { accountId: explicitAccountId, email: fallbackEmail };
    }

    try {
        const response = await fetch(ZOHO_ACCOUNTS_URL, {
            method: 'GET',
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
        })

        if (response.ok) {
            const json = await response.json()
            console.log('[Gallery Invite] Zoho accounts API response:', JSON.stringify(json, null, 2));
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
                    console.log('[Gallery Invite] Found account ID:', accountId, 'email:', accountEmail);
                    return { accountId: String(accountId), email: accountEmail }
                }
            }
        } else {
            console.warn('[Gallery Invite] Zoho accounts API failed:', response.status, await response.text());
        }
    } catch (error) {
        console.warn('[Gallery Invite] Zoho account lookup failed:', error)
    }

    // Last resort fallback - but this will likely fail
    console.error('[Gallery Invite] WARNING: Using fallback account ID from email prefix - this may not work!');
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


async function handleSync(req: VercelRequest, res: VercelResponse) {
    try {
        const { syncGalleryPhotos } = await import('../../lib/api-handlers/_photo-sync-utils');
        const { slug: querySlug } = req.query;
        const { libraryId, slug: bodySlug } = req.body || {};

        // Use supplied service key or fallback
        const SVC_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

        if (!SVC_KEY) {
            console.error('[Sync] SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
            return res.status(500).json({
                error: 'Server configuration error',
                details: 'Missing database credentials (SUPABASE_SERVICE_ROLE_KEY). Check .env file.'
            });
        }
        const supabase = createClient(SUPABASE_URL!, SVC_KEY);

        let targetSlug = (typeof querySlug === 'string' ? querySlug : null) || bodySlug;

        // If we only have libraryId, look up the slug
        if (!targetSlug && libraryId) {
            const { data: lib, error: lookupError } = await supabase
                .from('photo_libraries')
                .select('slug')
                .eq('id', libraryId)
                .single();

            if (lookupError || !lib) {
                return res.status(404).json({ error: 'Library not found by ID' });
            }
            targetSlug = lib.slug;
        }

        if (targetSlug) {
            const result = await syncGalleryPhotos(targetSlug);
            return res.json({ success: true, results: [result] });
        }

        // Sync all if no slug/id provided (only allow this for admins ideally, but acceptable for now)
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
