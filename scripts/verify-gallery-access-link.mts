/**
 * Harness for lib/api-handlers/_gallery-access-link.ts: a gallery sign-in
 * link goes only to an address on that gallery's invite list, from our own
 * mail, with a working link and no CC; everyone else gets no email at all.
 * Run: npx tsx scripts/verify-gallery-access-link.mts
 */
import { sendGalleryAccessLink, accessLinkDeps } from '../lib/api-handlers/_gallery-access-link.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
    if (!ok) failures++;
};

const galleries: Record<string, any> = {
    'mikey-and-bandit': { name: 'THE ADVENTURES OF MIKEY AND BANDIT', slug: 'mikey-and-bandit', invited_emails: 'media@thelostandunfounds.com, Michael@Yahoo.com,banditmanvaz21@icloud.com', published: true },
    'draft-gallery': { name: 'Draft', slug: 'draft-gallery', invited_emails: 'banditmanvaz21@icloud.com', published: false },
};
const users = new Set<string>(['michael@yahoo.com']);
const created: string[] = [];
let linkFails = false;
const supabase: any = {
    from: () => {
        const f: any = { slug: '', published: undefined };
        const q: any = {
            select: () => q,
            eq: (c: string, v: any) => { f[c] = v; return q; },
            maybeSingle: async () => {
                const g = galleries[f.slug];
                return { data: g && (f.published === undefined || g.published === f.published) ? g : null, error: null };
            },
        };
        return q;
    },
    auth: { admin: {
        generateLink: async ({ email, options }: any) => {
            if (linkFails) return { data: null, error: { message: 'boom' } };
            if (!users.has(email)) return { data: null, error: { message: 'User not found' } };
            return { data: { properties: { action_link: `https://x.supabase.co/auth/v1/verify?token=T-${email}&type=magiclink&redirect_to=${options.redirectTo}` } }, error: null };
        },
        createUser: async ({ email, email_confirm }: any) => { created.push(`${email}:${email_confirm}`); users.add(email); return { data: {}, error: null }; },
    } },
};

let sent: any[] = [];
let sendOk = true;
accessLinkDeps.sendTransactionalEmail = async (args: any) => { sent.push(args); return sendOk ? { success: true, provider: 'zoho' } : { success: false, error: 'Zoho down' } as any; };

// 1. An invited address that already has an account.
sent = [];
let r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: '  MICHAEL@yahoo.com ' });
check('an invited address gets the email (case and spaces ignored)', r.sent === true && sent.length === 1 && sent[0].to === 'michael@yahoo.com', JSON.stringify(r));
check('…with its own working sign-in link in it', /token=T-michael@yahoo.com/.test(sent[0]?.content) && /redirect_to=https:\/\/www.thelostandunfounds.com\/gallery\/mikey-and-bandit/.test(sent[0]?.content));
check('…in the branded button, from our mail, no CC', /btn-open-gallery/.test(sent[0]?.content) && !('cc' in sent[0]) && !/supabase\.io/.test(JSON.stringify(sent[0])));

// 2. First visit: the invitee has no account yet.
sent = [];
r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: 'banditmanvaz21@icloud.com' });
check('a first-time invitee gets an account made, then the email', r.sent === true && created.includes('banditmanvaz21@icloud.com:true') && sent.length === 1, JSON.stringify(r));

// 3. Not on the list: nothing is sent, nothing is created.
sent = []; const before = created.length;
r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: 'banditmanvaz21@gmail.com' });
check('an address not on the invite list gets no email', r.sent === false && r.reason === 'not_invited' && sent.length === 0 && created.length === before, JSON.stringify(r));

// 4. Unknown or unpublished gallery.
sent = [];
r = await sendGalleryAccessLink(supabase, { slug: 'no-such-gallery', email: 'banditmanvaz21@icloud.com' });
check('an unknown gallery sends nothing', r.sent === false && r.reason === 'no_gallery' && sent.length === 0);
r = await sendGalleryAccessLink(supabase, { slug: 'draft-gallery', email: 'banditmanvaz21@icloud.com' });
check('an unpublished gallery sends nothing', r.sent === false && r.reason === 'no_gallery' && sent.length === 0);

// 5. Junk input.
r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: 'not an email' });
check('a malformed address is refused', r.sent === false && r.reason === 'bad_email' && sent.length === 0);

// 6. Failures are reported, not swallowed as success.
linkFails = true;
r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: 'michael@yahoo.com' });
check('a link failure is reported', r.sent === false && r.reason === 'link_failed');
linkFails = false; sendOk = false;
r = await sendGalleryAccessLink(supabase, { slug: 'mikey-and-bandit', email: 'michael@yahoo.com' });
check('a send failure is reported', r.sent === false && r.reason === 'send_failed' && r.detail === 'Zoho down');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
