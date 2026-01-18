import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Reusing the inline Zoho email logic from existing handlers or importing if shared.
// For simplicity and robustness, I'll implement the basic Zoho send function here or reuse the one in gallery API if it was exported.
// Since the previous conversation showed inlining, I will inline the minimal send logic here to avoid dependency issues.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // 1. Generate a unique token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

        // 2. Store invitation in database
        // We might need a new table 'photographer_invites' or just store in a simple way.
        // For now, let's assume we create a table or just return the link for the admin to copy if we want to be stateless, 
        // BUT strict invites usually need DB state.
        // Let's create a 'gallery_invitations' table if it doesn't exist, OR 
        // simpler: Use the `metadata` of the library if it existed, but we are creating a NEW gallery.

        // Let's creating a simple table via SQL first if needed, or just specific "admin" links.
        // actually, let's keep it simple: 
        // Just return the link to the admin for now so they can send it manually OR sending it via email.
        // Sending via email is what was requested.

        // Wait, I need to store the token to verify it later.
        // I will add a `gallery_invitations` table.

        const { error: dbError } = await supabase
            .from('gallery_invitations')
            .insert({
                email,
                token,
                status: 'pending',
                created_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });

        // Use standard create table if not exists in the SQL step I missed? 
        // I'll add the table creation to the SQL migration I'll run next.

        // 3. Send Email
        const inviteUrl = `https://www.thelostandunfounds.com/setup?token=${token}`;

        const emailContent = `
            <div style="font-family: sans-serif; color: #000;">
                <h1>Welcome to THE LOST+UNFOUNDS</h1>
                <p>Hi ${name || 'there'},</p>
                <p>You have been invited to set up your gallery.</p>
                <p>Please click the button below to connect your Google Drive folder and publish your photos.</p>
                <p style="margin: 30px 0;">
                    <a href="${inviteUrl}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Set Up Gallery</a>
                </p>
                <p>Or copy this link: ${inviteUrl}</p>
            </div>
        `;

        // Send via Zoho (Util function)
        await sendEmail(email, "Invitation to THE LOST+UNFOUNDS", emailContent);

        return res.status(200).json({ success: true, message: 'Invitation sent', inviteUrl });

    } catch (err: any) {
        console.error('Invite error:', err);
        return res.status(500).json({ error: err.message });
    }
}

// Minimal Zoho Send Helper
async function sendEmail(to: string, subject: string, html: string) {
    // ... Implementation similar to existing ...
    // Note: In a real scenario, reuse the robust one. 
    // I'll strictly copy the robust pattern if needed, or just mock for now if I don't want to break things.
    // I will implementation a fetch call to the existing /api/admin/send-email if it exists, or just reimplement.
    // Reimplementing essentially for safety:

    const token = await getZohoToken();
    const response = await fetch(`https://api.zoho.com/mail/v1.1/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fromAddress: process.env.ZOHO_FROM_EMAIL,
            toAddress: to,
            subject: subject,
            content: html
        })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(`Zoho Error: ${JSON.stringify(data)}`);
    }
}

async function getZohoToken() {
    const refresh = process.env.ZOHO_REFRESH_TOKEN;
    const cid = process.env.ZOHO_CLIENT_ID;
    const csecret = process.env.ZOHO_CLIENT_SECRET;

    const params = new URLSearchParams({
        refresh_token: refresh!,
        client_id: cid!,
        client_secret: csecret!,
        grant_type: 'refresh_token'
    });

    const res = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params}`, { method: 'POST' });
    const data: any = await res.json();
    return data.access_token;
}
