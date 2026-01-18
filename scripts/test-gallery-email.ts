import 'dotenv/config';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts';

async function main() {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL;

    console.log('Zoho Config:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRefreshToken: !!refreshToken,
        fromEmail
    });

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
        console.error('Missing Zoho credentials!');
        process.exit(1);
    }

    // Get access token
    console.log('\n1. Getting access token...');
    const tokenRes = await fetch(ZOHO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
        })
    });
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
        console.error('Token refresh failed:', tokenData);
        process.exit(1);
    }
    console.log('   ✅ Got access token');

    // Get account ID
    console.log('\n2. Getting account ID...');
    const accRes = await fetch(ZOHO_ACCOUNTS_URL, {
        headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` }
    });
    const accData = await accRes.json();
    const accountId = accData?.data?.[0]?.accountId;

    if (!accountId) {
        console.error('Failed to get account ID:', accData);
        process.exit(1);
    }
    console.log('   ✅ Account ID:', accountId);

    // Send email
    console.log('\n3. Sending gallery invite email to thelostandunfounds@gmail.com...');

    const html = `
        <div style="background-color: #000; color: #fff; padding: 40px; font-family: monospace; text-align: left;">
            <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; margin-bottom: 30px; border-bottom: 2px solid #fff; padding-bottom: 10px; display: inline-block; color: #fff;">
                GALLERY OPENED
            </h1>
            <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 40px 0;">
                YOU HAVE BEEN INVITED TO ACCESS THE FOLLOWING SECURED ARCHIVE:
            </p>
            <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #fff;">KATTITUDE TATTOO STUDIO</h2>
            <div style="margin: 40px 0;">
                <a href="https://www.thelostandunfounds.com/photos/kattitude-tattoo" 
                   style="display: inline-block; padding: 14px 28px; background-color: #fff; color: #000; 
                          text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #fff;">
                    ENTER GALLERY
                </a>
            </div>
            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                <p style="color: #333; font-size: 9px; line-height: 1.6; text-transform: uppercase; letter-spacing: 1px;">
                    SECURE AUTOMATED DELIVERY SYSTEM<br/>
                    GALLERY: KATTITUDE TATTOO STUDIO<br/>
                    INVITEE: thelostandunfounds@gmail.com
                </p>
            </div>
        </div>
    `;

    const sendRes = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fromAddress: fromEmail,
            toAddress: 'thelostandunfounds@gmail.com',
            subject: 'ACCESS GRANTED: KATTITUDE TATTOO STUDIO | THE LOST+UNFOUNDS',
            content: html,
            mailFormat: 'html'
        })
    });

    const sendData = await sendRes.text();
    console.log('   Response status:', sendRes.status);
    console.log('   Response body:', sendData);

    if (sendRes.ok) {
        console.log('\n✅ Email sent successfully! Check your inbox.');
    } else {
        console.error('\n❌ Email failed to send');
    }
}

main().catch(console.error);
