/**
 * Email an invited client a sign-in link to their private gallery, from our
 * own mail (Zoho, Resend fallback) instead of Supabase's built-in mailer.
 *
 * Why: /gallery/:slug/access used supabase.auth.signInWithOtp, which sends
 * through Supabase's shared mailer (noreply@mail.app.supabase.io). That mailer
 * allows a few emails an hour for the whole project — two sign-in attempts at
 * 6:26 and 6:28pm CST on 2026-11-01 used it up, and the client's correct
 * address was refused with "429: email rate limit exceeded".
 *
 * Here the link is made with the admin API (generateLink, which sends nothing
 * and has no mail limit) and sent with sendTransactionalEmail in the branded
 * template.
 *
 * Only an address on the gallery's invite list is ever mailed. Everything
 * else gets the same answer as a real send, so this cannot be used to learn
 * who was invited, or to make us mail a stranger. The route also requires
 * Turnstile (TURNSTILE RULE).
 *
 * No CC to media@: the email carries a working sign-in link to the client's
 * account, so a copy would hand the business inbox their login.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendTransactionalEmail } from './_resend-email-handler.js';
import { EMAIL_STYLES, renderImageButton } from '../email-template.js';

const SITE = 'https://www.thelostandunfounds.com';

export const accessLinkDeps = {
    sendTransactionalEmail: (args: { to: string; subject: string; content: string }) => sendTransactionalEmail(args),
};

export type AccessLinkOutcome =
    | { sent: true; provider?: string }
    | { sent: false; reason: 'bad_email' | 'no_gallery' | 'not_invited' | 'link_failed' | 'send_failed'; detail?: string };

function invitedList(raw: string | null | undefined): string[] {
    return (raw || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

async function makeLink(supabase: SupabaseClient, email: string, redirectTo: string): Promise<string> {
    const attempt = () => supabase.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
    let { data, error } = await attempt();
    if (error && /not.*found|no user/i.test(error.message)) {
        // First visit: the invitee has no account yet. Make one (already
        // confirmed: this link is the confirmation), then ask again.
        const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
        if (created.error && !/already/i.test(created.error.message)) throw created.error;
        ({ data, error } = await attempt());
    }
    if (error) throw error;
    const link = data?.properties?.action_link;
    if (!link) throw new Error('Supabase returned no sign-in link.');
    return link;
}

export async function sendGalleryAccessLink(
    supabase: SupabaseClient,
    input: { slug: unknown; email: unknown },
): Promise<AccessLinkOutcome> {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { sent: false, reason: 'bad_email' };
    if (!slug) return { sent: false, reason: 'no_gallery' };

    const { data: library, error } = await supabase
        .from('photo_libraries')
        .select('name, slug, invited_emails')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
    if (error || !library) return { sent: false, reason: 'no_gallery' };
    if (!invitedList(library.invited_emails).includes(email)) return { sent: false, reason: 'not_invited' };

    let link: string;
    try {
        link = await makeLink(supabase, email, `${SITE}/gallery/${encodeURIComponent(library.slug)}`);
    } catch (err: any) {
        return { sent: false, reason: 'link_failed', detail: err?.message };
    }

    const name = escapeHtml(library.name || 'your gallery');
    const content = `
<h1 style="${EMAIL_STYLES.heading1}">OPEN YOUR GALLERY</h1>
<p style="${EMAIL_STYLES.paragraph}">Here is your link to <strong>${name}</strong>. Tap it on this device and the gallery opens. No password needed.</p>
${renderImageButton(link, 'btn-open-gallery', 'OPEN MY GALLERY')}
<p style="${EMAIL_STYLES.paragraph}">The link works once and expires within the hour. If it has, go back to the gallery's access page and ask for a new one.</p>
<p style="${EMAIL_STYLES.paragraph}">Didn't ask for this? You can ignore it.</p>`;

    const result = await accessLinkDeps.sendTransactionalEmail({
        to: email,
        subject: `Your link to ${library.name || 'your gallery'}`,
        content,
    });
    if (!result?.success) return { sent: false, reason: 'send_failed', detail: (result as any)?.error };
    return { sent: true, provider: (result as any)?.provider };
}

// --- Invite keys: the invite's own button opens the gallery --------------------
//
// Receiving the invite already proves the client reads that inbox, so the
// invite link carries a key for (gallery, email) and opening it signs them in
// and lands them in the gallery: no typing, no second email.
//
// The key is an HMAC of the gallery id and the address, so it opens one gallery
// for one address and nothing else. It is checked against the live invite list
// every time, so removing someone from the gallery revokes their link. It rides
// in the URL fragment (#k=), which browsers never send to a server, so it never
// lands in a request log. The secret is GALLERY_INVITE_SECRET, else derived from
// the service-role key (rotating that key retires every invite link; the
// email-entry form still works).
//
// Never CC an email that carries a key: whoever reads the copy could open the
// client's account. Record copies use inviteRecordUrl, which has no key.

function inviteSecret(): string {
    const base = process.env.GALLERY_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base) throw new Error('No secret for gallery invite keys.');
    return `gallery-invite-v1:${base}`;
}

function sign(libraryId: string, email: string): string {
    return createHmac('sha256', inviteSecret()).update(`${libraryId}|${email}`).digest('base64url');
}

export function inviteKey(libraryId: string, email: string): string {
    const normalized = email.trim().toLowerCase();
    return `${Buffer.from(normalized).toString('base64url')}.${sign(libraryId, normalized)}`;
}

/** The link an invite email carries: opens the gallery for this one address. */
export function inviteUrl(slug: string, libraryId: string, email: string): string {
    return `${SITE}/gallery/${encodeURIComponent(slug)}/access#k=${inviteKey(libraryId, email)}`;
}

/** For record copies (media@): the plain access page, no key. */
export function inviteRecordUrl(slug: string): string {
    return `${SITE}/gallery/${encodeURIComponent(slug)}/access`;
}

export type OpenOutcome = { ok: true; link: string } | { ok: false; reason: 'bad_key' | 'no_gallery' | 'not_invited' | 'link_failed'; detail?: string };

export async function openWithInviteKey(
    supabase: SupabaseClient,
    input: { slug: unknown; key: unknown },
): Promise<OpenOutcome> {
    const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
    const key = typeof input.key === 'string' ? input.key.trim() : '';
    const dot = key.indexOf('.');
    if (!slug || dot < 1 || key.length > 600) return { ok: false, reason: 'bad_key' };
    let email: string;
    try {
        email = Buffer.from(key.slice(0, dot), 'base64url').toString('utf8');
    } catch {
        return { ok: false, reason: 'bad_key' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'bad_key' };

    const { data: library, error } = await supabase
        .from('photo_libraries')
        .select('id, slug, invited_emails')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
    if (error || !library) return { ok: false, reason: 'no_gallery' };

    const expected = Buffer.from(sign(library.id, email));
    const given = Buffer.from(key.slice(dot + 1));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'bad_key' };
    if (!invitedList(library.invited_emails).includes(email)) return { ok: false, reason: 'not_invited' };

    try {
        return { ok: true, link: await makeLink(supabase, email, `${SITE}/gallery/${encodeURIComponent(library.slug)}`) };
    } catch (err: any) {
        return { ok: false, reason: 'link_failed', detail: err?.message };
    }
}
