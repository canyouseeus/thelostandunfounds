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
