
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { wrapEmailContent } from '../lib/email-template';
import { ensureBannerHtml } from '../lib/api-handlers/_zoho-email-utils';

// Load .env.local
dotenv.config({ path: '.env.local' });

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts';

async function main() {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'THE LOST+UNFOUNDS <noreply@thelostandunfounds.com>';

    if (!resendKey) {
        console.error('Missing RESEND_API_KEY in .env.local!');
        process.exit(1);
    }

    // Prepare content
    console.log('1. Preparing email content...');
    const innerContent = `
        <h1 style="color: #fff; font-size: 24px;">LAYOUT VERIFICATION (RESEND FALLBACK)</h1>
        <p style="color: #ccc; font-size: 16px; line-height: 1.5;">
            This email is a test of the new left-aligned email template. 
            The banner above and this content should all be left-aligned.
            The logo should be clickable and lead to the website.
        </p>
        <div style="margin-top: 30px;">
            <a href="https://www.thelostandunfounds.com" style="display: inline-block; padding: 12px 24px; background-color: #fff; color: #000; text-decoration: none; font-weight: bold; border-radius: 4px;">VERIFY LINK</a>
        </div>
    `;

    // Wrap with centralized template
    let html = wrapEmailContent(innerContent, {
        includeUnsubscribe: false,
        includeFooter: true
    });

    // Send email via Resend
    console.log('2. Sending test email via Resend to thelostandunfounds@gmail.com...');
    const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: fromEmail,
            to: 'thelostandunfounds@gmail.com',
            subject: 'TEMPLATE TEST: LEFT-ALIGNED (RESEND) | THE LOST+UNFOUNDS',
            html: html
        })
    });

    const sendData: any = await sendRes.json();
    if (sendRes.ok) {
        console.log('✅ Email sent successfully! ID:', sendData.id);
    } else {
        console.error('❌ Email failed to send:', sendData);
    }
}

main().catch(console.error);
