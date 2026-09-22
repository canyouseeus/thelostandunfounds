/**
 * Branded magic sign-in link.
 *
 * The client used to call supabase.auth.signInWithOtp() directly, which meant
 * Supabase's own SMTP sent its stock "Your sign-in link" email — from "Supabase
 * Auth", on a white background, with none of our branding. The first thing an
 * invited client saw of us was another company's transactional template.
 *
 * This endpoint keeps Supabase as the issuer of the token and takes the email
 * away from it: the service role mints the link with admin.generateLink(), and
 * we send it ourselves through the normal transactional path, so it arrives
 * from our domain in the black brand shell like every other email we send.
 *
 * It answers identically whether or not the address has an account — the reply
 * is always "if that address can sign in, a link is on its way". Anything else
 * turns this into an account-existence oracle.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../../lib/api-handlers/_supabase-admin-client.js';
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js';
import { EMAIL_STYLES } from '../../lib/email-template.js';

const SITE_ORIGIN = 'https://www.thelostandunfounds.com';

/**
 * The redirect is carried inside the magic link, so an unchecked value would
 * hand the sign-in token to whatever host an attacker put in the request body.
 * Only our own origins may be redirected to; anything else falls back to the
 * site root rather than being honoured.
 */
function safeRedirect(raw: unknown): string {
    if (typeof raw !== 'string' || !raw) return SITE_ORIGIN;
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return SITE_ORIGIN;
    }
    const host = url.hostname.toLowerCase();
    const allowed =
        host === 'thelostandunfounds.com' ||
        host === 'www.thelostandunfounds.com' ||
        host === 'localhost' ||
        host === '127.0.0.1';
    if (!allowed) return SITE_ORIGIN;
    if (url.protocol !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') return SITE_ORIGIN;
    return url.toString();
}

/**
 * Best-effort per-address throttle so this can't be used to flood someone's
 * inbox. It is per lambda instance and therefore not a guarantee — it raises
 * the cost of the obvious abuse without pretending to be a rate limiter.
 */
const RESEND_WINDOW_MS = 60_000;
const lastSent = new Map<string, number>();

function throttled(email: string): boolean {
    const now = Date.now();
    for (const [key, at] of lastSent) {
        if (now - at > RESEND_WINDOW_MS) lastSent.delete(key);
    }
    const previous = lastSent.get(email);
    if (previous && now - previous < RESEND_WINDOW_MS) return true;
    lastSent.set(email, now);
    return false;
}

function emailBody(link: string, email: string): string {
    return `
        <h1 style="${EMAIL_STYLES.heading1}">YOUR SIGN-IN LINK</h1>

        <p style="${EMAIL_STYLES.paragraph}">
          Use the link below to sign in as <strong style="color: #ffffff;">${email}</strong>.
          There's no password to remember — the link is the whole of it.
        </p>

        <div style="margin: 40px 0;">
          <a href="${link}" style="${EMAIL_STYLES.button}">SIGN IN</a>
        </div>

        <p style="${EMAIL_STYLES.paragraph}">
          It works once and expires shortly. If it's already expired, ask for a new one —
          they cost nothing.
        </p>

        <hr style="${EMAIL_STYLES.divider}">

        <p style="${EMAIL_STYLES.muted}">
          If you didn't ask to sign in, nothing has happened to your account and you can
          ignore this email. Questions? Reply here or reach us at media@thelostandunfounds.com.
        </p>
    `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const rawEmail = (req.body || {}).email;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    if (!email || !email.includes('@') || email.length > 320) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    const redirectTo = safeRedirect((req.body || {}).redirectTo);

    // Uniform reply, whatever happens below.
    const ok = () => res.status(200).json({ sent: true });

    if (throttled(email)) {
        console.log(`[magic-link] Throttled repeat request for ${email}`);
        return ok();
    }

    try {
        const supabase = createServiceSupabaseClient();

        let generated = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: { redirectTo },
        });

        // generateLink('magiclink') fails for an address with no account. An
        // invited client normally has none yet, so create one and retry —
        // this matches the shouldCreateUser: true the client used to pass.
        if (generated.error) {
            const created = await supabase.auth.admin.createUser({
                email,
                email_confirm: true,
            });
            if (created.error) {
                console.error(`[magic-link] Could not create user for ${email}:`, created.error.message);
                return ok();
            }
            generated = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email,
                options: { redirectTo },
            });
        }

        const link = generated.data?.properties?.action_link;
        if (generated.error || !link) {
            console.error(`[magic-link] No action link for ${email}:`, generated.error?.message);
            return ok();
        }

        const result = await sendTransactionalEmail({
            to: email,
            subject: 'YOUR SIGN-IN LINK | THE LOST+UNFOUNDS',
            content: emailBody(link, email),
        });

        if (!result.success) {
            // The link exists but never reached them — worth a loud log, but the
            // caller still gets the same answer as every other outcome.
            console.error(`[magic-link] Send failed for ${email}:`, result.error);
        } else {
            console.log(`[magic-link] Sent to ${email} via ${result.provider}`);
        }

        return ok();
    } catch (err: any) {
        console.error('[magic-link] Handler error:', err?.message || err);
        return ok();
    }
}
