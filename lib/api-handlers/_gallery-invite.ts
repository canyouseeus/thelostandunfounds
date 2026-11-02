/**
 * The gallery invite email ("YOUR GALLERY IS OPEN"), sent to each address.
 * One implementation for both callers: POST /api/gallery/invite (the admin
 * panel's invite / Resend) and the gallery_invite admin job.
 *
 * Each invite's button carries that person's own key (#k=), so tapping it
 * signs them in and opens the gallery — see _gallery-access-link.ts. No CC:
 * the client's copy carries their key; media@ gets a separate record copy with
 * the plain access link (EMAIL SENDING RULE's business record).
 *
 * `test`: send to the given address(es) only, marked [TEST], no record copy.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js';
import { EMAIL_STYLES, generateTransactionalEmail } from '../email-template.js';
import { inviteUrl, inviteRecordUrl } from './_gallery-access-link.js';

export interface InviteResults {
    succeeded: string[];
    failed: { email: string; error: string }[];
}

export async function sendGalleryInvites(
    supabase: SupabaseClient,
    libraryId: string,
    emails: string[],
    opts: { test?: boolean } = {},
): Promise<{ library: { id: string; name: string; slug: string } | null; results: InviteResults }> {
    const results: InviteResults = { succeeded: [], failed: [] };
    const { data: library, error: libError } = await supabase
        .from('photo_libraries')
        .select('id, name, slug')
        .eq('id', libraryId)
        .single();
    if (libError || !library) {
        console.error('Library fetch error:', libError);
        return { library: null, results };
    }

    const auth = await getZohoAuthContext();
    console.log(`[Gallery Invite] Starting invitation sequence for library: ${library.name} (${libraryId}). Target emails:`, emails, opts.test ? '(TEST)' : '');

    for (const email of emails) {
        try {
            const inviteBody = (galleryUrl: string) => `
                <h1 style="${EMAIL_STYLES.heading1}">YOUR GALLERY IS OPEN</h1>

                <p style="${EMAIL_STYLES.paragraph}">
                  Your photos from <strong style="color: #ffffff;">${library.name}</strong> are ready to view and download.
                </p>

                <p style="${EMAIL_STYLES.paragraph}">
                  Tap the button below and the gallery opens. There's no password to create.
                </p>

                <div style="margin: 40px 0;">
                  <a href="${galleryUrl}" style="${EMAIL_STYLES.button}">OPEN MY GALLERY</a>
                </div>

                <p style="${EMAIL_STYLES.paragraph}">
                  The gallery stays available — come back and pull anything you need, whenever you need it. There's no expiry on it.
                </p>

                <hr style="${EMAIL_STYLES.divider}">

                <p style="${EMAIL_STYLES.muted}">
                  GALLERY: ${library.name}<br>
                  INVITED: ${email}<br>
                  Questions? Reply to this email or reach us at media@thelostandunfounds.com.
                </p>
            `;

            const subject = `${opts.test ? '[TEST] ' : ''}YOUR GALLERY IS OPEN: ${library.name} | THE LOST+UNFOUNDS`;
            // No CC: the client's copy carries their personal key, and a CC
            // would let whoever reads it open their account.
            const result = await sendZohoEmail({
                auth,
                to: email,
                subject,
                htmlContent: generateTransactionalEmail(inviteBody(inviteUrl(library.slug, library.id, email)))
            });
            // Business record (EMAIL SENDING RULE): media@ gets its own copy,
            // with the plain access link instead of the key.
            if (result.success && !opts.test && email !== 'media@thelostandunfounds.com') {
                const record = await sendZohoEmail({
                    auth,
                    to: 'media@thelostandunfounds.com',
                    subject: `${subject} (copy — sent to ${email})`,
                    htmlContent: generateTransactionalEmail(inviteBody(inviteRecordUrl(library.slug)))
                });
                if (!record.success) console.error(`[Gallery Invite] Record copy to media@ failed for ${email}:`, record.error);
            }
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


    return { library, results };
}
