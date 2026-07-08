// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
// import { google } from 'googleapis'; // Moved to dynamic import to prevent cold start crashes
import dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';
import { getZohoAuthContext, sendZohoEmail, ensureBannerHtml } from '../../lib/api-handlers/_zoho-email-utils.js';
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

        if (route === 'resend-order') {
            return await handleResendOrder(req, res);
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

        if (route === 'drive-list') {
            return await handleDriveList(req, res);
        }

        if (route === 'downloads') {
            return await handleDownloads(req, res);
        }

        if (route === 'batch-tags') {
            return await handleBatchTags(req, res);
        }

        if (route === 'batch-location') {
            return await handleBatchLocation(req, res);
        }

        if (route === 'batch-move') {
            return await handleBatchMove(req, res);
        }

        if (route === 'batch-delete') {
            return await handleBatchDelete(req, res);
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
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(lh3Buffer);
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
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
                res.setHeader('Cache-Control', 'no-store');
                return res.send(saResult.buffer);
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

        const galleryUrl = `https://www.thelostandunfounds.com/gallery/${library.slug}`;
        const auth = await getZohoAuthContext();

        const results = {
            succeeded: [] as string[],
            failed: [] as { email: string; error: string }[]
        };

        // Send to each email
        console.log(`[Gallery Invite] Starting invitation sequence for library: ${library.name} (${libraryId}). Target emails:`, emails);

        for (const email of emails) {
            try {
                const result = await sendZohoEmail({
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
                if (result.success) {
                    results.succeeded.push(email);
                    console.log(`[Gallery Invite] Successfully sent invitation to ${email} for gallery: ${library.name}`);
                } else {
                    results.failed.push({ email, error: result.error || 'Unknown error' });
                    console.error(`[Gallery Invite] Zoho rejected invite to ${email}:`, result.error);
                }
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

async function handleSync(req: VercelRequest, res: VercelResponse) {
    try {
        const {
            syncGalleryPhotos,
            listLibrarySubfolders,
            syncSingleSubfolder,
            cleanupOrphanedPhotos,
        } = await import('../../lib/api-handlers/_photo-sync-utils.js');

        const querySlug = typeof req.query.slug === 'string' ? req.query.slug : null;
        const queryAction = typeof req.query.action === 'string' ? req.query.action : null;
        const body = (req.body && typeof req.body === 'object') ? req.body as Record<string, any> : {};
        const {
            libraryId,
            slug: bodySlug,
            action: bodyAction,
            subfolderId,
            subfolderName,
            seenFileIds,
            timeBudgetSeconds,
        } = body;

        const action: string | null = bodyAction || queryAction;

        const SVC_KEY = SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        if (!SVC_KEY) {
            console.error('[Sync] SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
            return res.status(500).json({
                error: 'Server configuration error',
                details: 'Missing database credentials (SUPABASE_SERVICE_ROLE_KEY). Check .env file.'
            });
        }
        const supabase = createClient(SUPABASE_URL!, SVC_KEY);

        let targetSlug: string | null = querySlug || bodySlug || null;

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

        // --- ACTION: list subfolders for batched sync ---
        if (action === 'list') {
            if (!targetSlug) return res.status(400).json({ error: 'slug or libraryId required for list action' });
            const info = await listLibrarySubfolders(targetSlug);
            return res.json({ success: true, ...info });
        }

        // --- ACTION: sync a single subfolder (or root) ---
        if (action === 'sync-folder') {
            if (!targetSlug) return res.status(400).json({ error: 'slug or libraryId required for sync-folder action' });
            const result = await syncSingleSubfolder({
                librarySlug: targetSlug,
                subfolderId,
                subfolderName,
                timeBudgetSeconds: typeof timeBudgetSeconds === 'number' ? timeBudgetSeconds : undefined,
            });
            return res.json({ success: true, ...result });
        }

        // --- ACTION: orphan cleanup, given the union of seen file IDs ---
        if (action === 'cleanup') {
            if (!targetSlug) return res.status(400).json({ error: 'slug or libraryId required for cleanup action' });
            if (!Array.isArray(seenFileIds)) return res.status(400).json({ error: 'seenFileIds (array) required for cleanup' });
            const deleted = await cleanupOrphanedPhotos(targetSlug, seenFileIds);
            return res.json({ success: true, deleted });
        }

        // --- DEFAULT: one-shot sync (back-compat). Time-budget bounded so it
        // can't crash Vercel even if it doesn't finish. ---
        if (targetSlug) {
            const result = await syncGalleryPhotos(targetSlug);
            return res.json({ success: true, results: [{ slug: targetSlug, ...result }] });
        }

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

async function handleDriveList(req: VercelRequest, res: VercelResponse) {
    try {
        const slug = typeof req.query.slug === 'string' ? req.query.slug : null;
        if (!slug) {
            return res.status(400).json({ error: 'slug is required' });
        }

        // Verify user JWT from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        let userEmail: string | null = null;
        let userId: string | null = null;

        if (token && ANON_KEY) {
            const anonClient = createClient(SUPABASE_URL!, ANON_KEY);
            const { data: { user } } = await anonClient.auth.getUser(token);
            userEmail = user?.email?.toLowerCase() || null;
            userId = user?.id || null;
        }

        // Fetch the library using service role to bypass RLS
        const svcKey = SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        if (!svcKey) return res.status(500).json({ error: 'Server configuration error' });
        const adminClient = createClient(SUPABASE_URL!, svcKey);

        const { data: library, error: libError } = await adminClient
            .from('photo_libraries')
            .select('id, name, slug, google_drive_folder_id, gdrive_folder_id, is_private, user_id, invited_emails')
            .eq('slug', slug)
            .eq('published', true)
            .single();

        if (libError || !library) {
            return res.status(404).json({ error: 'Gallery not found' });
        }

        // Enforce access for private galleries
        if (library.is_private) {
            const adminEmails = ['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com'];
            const invitedList = (library.invited_emails || '')
                .split(',')
                .map((e: string) => e.trim().toLowerCase())
                .filter(Boolean);

            const isOwner = userId && userId === library.user_id;
            const isAdmin = userEmail && adminEmails.includes(userEmail);
            const isInvited = userEmail && invitedList.includes(userEmail);

            if (!isOwner && !isAdmin && !isInvited) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const folderId = library.google_drive_folder_id || library.gdrive_folder_id;
        if (!folderId) {
            return res.status(404).json({ error: 'No Drive folder configured for this gallery' });
        }

        // List files from Google Drive using service account
        const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const saKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

        if (!saEmail || !saKey) {
            return res.status(500).json({ error: 'Drive credentials not configured' });
        }

        const { google } = await import('googleapis');
        const driveAuth = new google.auth.JWT({
            email: saEmail,
            key: saKey,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = google.drive({ version: 'v3', auth: driveAuth });

        const photos: any[] = [];
        let pageToken: string | undefined;

        do {
            const listRes: any = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, thumbnailLink, createdTime, imageMediaMetadata)',
                pageSize: 1000,
                pageToken,
            });

            for (const f of (listRes.data.files || [])) {
                if (!f.mimeType?.startsWith('image/') && f.mimeType !== 'video/quicktime') continue;
                if (!f.id) continue;

                const title = (f.name || '').replace(/\.[^.]+$/, '');
                const meta: Record<string, any> = { ...(f.imageMediaMetadata || {}) };

                // Parse EXIF capture time
                let createdAt = f.createdTime || new Date().toISOString();
                const rawTime = meta.time as string | undefined;
                if (rawTime) {
                    const std = new Date(rawTime);
                    if (!isNaN(std.getTime())) {
                        createdAt = std.toISOString();
                    } else {
                        const parts = rawTime.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
                        if (parts) {
                            const parsed = new Date(Date.UTC(
                                parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]),
                                parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]),
                            ));
                            if (!isNaN(parsed.getTime())) createdAt = parsed.toISOString();
                        }
                    }
                    meta.time = createdAt;
                    meta.date_taken = createdAt;
                }
                if (!meta.date_taken) meta.date_taken = createdAt;

                photos.push({
                    id: `drive-${f.id}`,
                    google_drive_file_id: f.id,
                    title,
                    thumbnail_url: f.thumbnailLink?.replace(/=s220$/, '=s1200') || null,
                    created_at: createdAt,
                    library_id: library.id,
                    metadata: meta,
                });
            }
            pageToken = listRes.data.nextPageToken;
        } while (pageToken);

        return res.status(200).json({ photos });
    } catch (err: any) {
        console.error('[drive-list] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

// --- Admin batch-editing routes (used by the fullscreen Gallery Management grid) ---

async function handleDownloads(req: VercelRequest, res: VercelResponse) {
    try {
        const { requireAdminUser, getDownloadsData } = await import('../../lib/api-handlers/_gallery-admin-ops.js');
        const admin = await requireAdminUser(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const data = await getDownloadsData(supabase as any);
        return res.status(200).json(data);
    } catch (err: any) {
        console.error('[downloads] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleBatchTags(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { requireAdminUser, batchAddTags, batchRemoveTags } = await import('../../lib/api-handlers/_gallery-admin-ops.js');
        const admin = await requireAdminUser(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        const { photoIds, tagIds, mode } = req.body || {};
        if (!Array.isArray(photoIds) || !photoIds.length || !Array.isArray(tagIds) || !tagIds.length) {
            return res.status(400).json({ error: 'photoIds and tagIds are required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const result = mode === 'remove'
            ? await batchRemoveTags(supabase as any, photoIds, tagIds)
            : await batchAddTags(supabase as any, photoIds, tagIds);
        return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        console.error('[batch-tags] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleBatchLocation(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { requireAdminUser, batchSetLocation } = await import('../../lib/api-handlers/_gallery-admin-ops.js');
        const admin = await requireAdminUser(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        const { photoIds, latitude, longitude, location_name } = req.body || {};
        if (!Array.isArray(photoIds) || !photoIds.length) {
            return res.status(400).json({ error: 'photoIds is required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const result = await batchSetLocation(supabase as any, photoIds, {
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            location_name: location_name ?? null,
        });
        return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        console.error('[batch-location] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleBatchMove(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { requireAdminUser, batchMovePhotos } = await import('../../lib/api-handlers/_gallery-admin-ops.js');
        const admin = await requireAdminUser(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        const { photoIds, targetLibraryId } = req.body || {};
        if (!Array.isArray(photoIds) || !photoIds.length || !targetLibraryId) {
            return res.status(400).json({ error: 'photoIds and targetLibraryId are required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const result = await batchMovePhotos(supabase as any, photoIds, targetLibraryId);
        return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        console.error('[batch-move] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleBatchDelete(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { requireAdminUser, batchDeletePhotos } = await import('../../lib/api-handlers/_gallery-admin-ops.js');
        const admin = await requireAdminUser(req);
        if (!admin) return res.status(403).json({ error: 'Forbidden' });

        const { photoIds } = req.body || {};
        if (!Array.isArray(photoIds) || !photoIds.length) {
            return res.status(400).json({ error: 'photoIds is required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const result = await batchDeletePhotos(supabase as any, photoIds);
        return res.status(200).json({ success: true, ...result });
    } catch (err: any) {
        console.error('[batch-delete] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
