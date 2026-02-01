
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import { generateTransactionalEmail, EMAIL_STYLES } from '../lib/email-template';

// Load envs
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Zoho Config
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
// Explicitly use the working email if env is missing
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL || 'noreply.mail@thelostandunfounds.com';

if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    console.error('Missing Zoho Credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts';

async function getAccessToken() {
    console.log('Fetching Zoho Access Token...');
    const params = new URLSearchParams();
    params.append('refresh_token', ZOHO_REFRESH_TOKEN!);
    params.append('client_id', ZOHO_CLIENT_ID!);
    params.append('client_secret', ZOHO_CLIENT_SECRET!);
    params.append('grant_type', 'refresh_token');

    const res = await fetch(ZOHO_TOKEN_URL, {
        method: 'POST',
        body: params
    });

    const data: any = await res.json();
    if (data.error) throw new Error(`Token Error: ${JSON.stringify(data)}`);
    return data.access_token;
}

async function getAccountId(token: string) {
    console.log('Fetching Zoho Account ID...');
    const res = await fetch(ZOHO_ACCOUNTS_URL, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    const data: any = await res.json();
    console.log('Account Info:', JSON.stringify(data, null, 2));
    const account = data.data?.[0];
    return account.accountId;
}

async function sendEmail() {
    try {
        const orderId = '86f3bf98-73ba-409b-9f96-761a3c4fba57'; // The logic order ID form db

        // 1. Get Order
        const { data: order } = await supabase.from('photo_orders').select('*').eq('id', orderId).single();
        if (!order) throw new Error('Order not found');
        console.log('Found Order:', order.email);

        // 2. Auth Zoho
        const token = await getAccessToken();
        const accountId = await getAccountId(token);

        // 3. Send
        const mailUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`;

        const body = {
            fromAddress: ZOHO_FROM_EMAIL,
            toAddress: order.email,
            subject: 'ORDER CONFIRMED | THE LOST+UNFOUNDS',
            content: generateTransactionalEmail(`
                <h1 style="${EMAIL_STYLES.heading1}">ORDER CONFIRMED</h1>
                <p style="${EMAIL_STYLES.paragraph}">
                    Thank you for your purchase. Your high-resolution photos are ready for download.
                </p>
                <div style="margin: 40px 0;">
                    <a href="https://www.thelostandunfounds.com/photos/success?token=${orderId}" style="${EMAIL_STYLES.button}">DOWNLOAD PHOTOS</a>
                </div>
                <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #1a1a1a;">
                    <p style="${EMAIL_STYLES.muted}">
                        SECURE AUTOMATED DELIVERY SYSTEM<br/>
                        ORDER ID: ${orderId}<br/>
                        DESTINATION: ${order.email}
                    </p>
                </div>
            `),
            mailFormat: 'html'
        };

        console.log('Sending email...');
        const sendRes = await fetch(mailUrl, {
            method: 'POST',
            headers: {
                Authorization: `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!sendRes.ok) {
            console.error('Send Failed:', await sendRes.text());
        } else {
            console.log('Email Sent Successfully:', await sendRes.json());
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

sendEmail();
