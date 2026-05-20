/**
 * One-off: send a draft response to Andrew Lowe's portrait booking inquiry
 * to the test inbox (thelostandunfounds@gmail.com) for review.
 *
 * Run locally where Zoho creds are present:
 *   npx tsx scripts/send-andrew-lowe-draft.ts
 *
 * To send to Andrew directly instead, change RECIPIENT below.
 */

import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { generateTransactionalEmail } from '../lib/email-template';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || 'noreply.mail@thelostandunfounds.com';

if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('Missing Zoho credentials in env');
    process.exit(1);
}

const RECIPIENT = 'thelostandunfounds@gmail.com';

const SUBJECT = '[DRAFT] Re: Your comedy headshots — TLAU';

const FIRST_NAME = 'Andrew';
const DATE_LINE = 'Sunday, May 24, 2026';
const TIME_LINE = '5:00 – 8:00 PM';
const LOCATION = 'Austin';

const BODY = `
    <h1 style="color:#fff !important;font-size:24px;font-weight:bold;margin:0 0 16px 0;letter-spacing:0.05em;">THANKS FOR REACHING OUT</h1>
    <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
        Hey ${FIRST_NAME} — got your request for comedy headshots on
        <b>${DATE_LINE}</b>, ${TIME_LINE} in ${LOCATION}. That window works on my end.
    </p>
    <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
        Since you're open to suggestions — here's the shape I'd pitch. Comedy
        headshots have to do a different job than corporate ones. Bookers, club
        managers, and festival programmers are scanning fast: the shot has to
        read your point of view in a second. So we lean on <b>character and
        expression</b>, not symmetry. Think Netflix special key art, club
        posters, Instagram grid — that family.
    </p>
    <p style="color:#fff !important;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
        My usual play for comics is two looks in about 90 minutes:
        a <b>clean signature shot</b> (something a venue can drop straight onto a
        poster or marquee) plus a <b>character/attitude set</b> — bigger reactions,
        a prop or location element if it fits the act, room for the punchline to
        live in your face. Golden hour starts around 7:45 PM so I'd kick off
        around 6:15 PM and ride the light down. You'll walk away with 8 to 12
        final retouched selects.
    </p>
    <p style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;margin:28px 0 8px 0;">A few quick questions</p>
    <ul style="color:#fff !important;font-size:15px;line-height:1.7;margin:0 0 20px 0;padding-left:20px;">
        <li>Where do these need to land first — club posters, festival submissions, IG/TikTok, agent/manager packet?</li>
        <li>How would you describe your stand-up persona in three words? That's what we're shooting toward.</li>
        <li>Anyone you'd point to as a reference look — a comic whose promo shots feel like the right neighborhood?</li>
        <li>Any prop, jacket, hat, or wardrobe piece that's part of your stage identity? Bring it.</li>
        <li>Got upcoming dates or specials we should pre-shoot graphics for? Happy to deliver a couple in poster-ready crops.</li>
    </ul>
    <p style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;margin:28px 0 8px 0;">The deposit</p>
    <p style="color:#fff !important;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
        A <b>50% non-refundable deposit</b> holds the date. Once we lock the
        scope, I'll send a short contract and a payment link. We take
        <b>Bitcoin (Strike)</b>, Apple Pay, Cashapp, and Venmo.
    </p>
    <p style="color:#fff !important;font-size:14px;line-height:1.6;margin:24px 0 8px 0;">
        Reply here with your thoughts and I'll get the contract over the same day.
    </p>
    <p style="color:#fff !important;font-size:14px;margin:32px 0 0 0;">— Joshua / TLAU</p>
`;

async function getAccessToken(): Promise<string> {
    const params = new URLSearchParams();
    params.append('refresh_token', ZOHO_REFRESH_TOKEN!);
    params.append('client_id', ZOHO_CLIENT_ID!);
    params.append('client_secret', ZOHO_CLIENT_SECRET!);
    params.append('grant_type', 'refresh_token');

    const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        body: params,
    });
    const data: any = await res.json();
    if (data.error) throw new Error(`Token error: ${JSON.stringify(data)}`);
    return data.access_token;
}

async function getAccountId(token: string): Promise<string> {
    const res = await fetch('https://mail.zoho.com/api/accounts', {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const data: any = await res.json();
    const account = data.data?.[0];
    if (!account?.accountId) throw new Error('No Zoho accountId found');
    return account.accountId;
}

async function main() {
    console.log(`Sending draft response → ${RECIPIENT}`);
    const token = await getAccessToken();
    const accountId = await getAccountId(token);

    const body = {
        fromAddress: ZOHO_FROM_EMAIL,
        toAddress: RECIPIENT,
        subject: SUBJECT,
        content: generateTransactionalEmail(BODY),
        mailFormat: 'html',
    };

    const sendRes = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!sendRes.ok) {
        console.error('Send failed:', await sendRes.text());
        process.exit(1);
    }
    console.log('Sent:', await sendRes.json());
}

main().catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
});
