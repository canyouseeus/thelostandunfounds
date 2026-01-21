import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getZohoAuthContext, sendZohoEmail } from '../../lib/api-handlers/_zoho-email-utils';

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
        const { error: dbError } = await supabase
            .from('gallery_invitations')
            .insert({
                email,
                token,
                status: 'pending',
                created_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });

        if (dbError) {
            console.error('Database error storing invitation:', dbError);
            throw new Error(`Failed to store invitation: ${dbError.message}`);
        }

        // 3. Send Email using shared Zoho utilities
        const inviteUrl = `https://www.thelostandunfounds.com/setup?token=${token}`;

        const emailContent = `
            <div style="font-family: sans-serif; color: #fff; background: #000; padding: 40px;">
                <h1 style="color: #fff; margin-bottom: 20px;">Welcome to THE LOST+UNFOUNDS</h1>
                <p style="color: #ccc;">Hi ${name || 'there'},</p>
                <p style="color: #ccc;">You have been invited to set up your gallery.</p>
                <p style="color: #ccc;">Please click the button below to connect your Google Drive folder and publish your photos.</p>
                <p style="margin: 30px 0;">
                    <a href="${inviteUrl}" style="background: #fff; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; text-transform: uppercase; display: inline-block;">Set Up Gallery</a>
                </p>
                <p style="color: #666; font-size: 12px;">Or copy this link: ${inviteUrl}</p>
            </div>
        `;

        // Get Zoho auth and send email
        const auth = await getZohoAuthContext();
        const emailResult = await sendZohoEmail({
            auth,
            to: email,
            subject: "Invitation to THE LOST+UNFOUNDS",
            htmlContent: emailContent
        });

        if (!emailResult.success) {
            console.error('Failed to send invitation email:', emailResult.error);
            // Still return success since the invitation is stored - admin can share the link manually
            return res.status(200).json({
                success: true,
                message: 'Invitation created but email delivery failed. Share this link manually:',
                inviteUrl,
                emailError: emailResult.error
            });
        }

        console.log(`Invitation email sent successfully to ${email}`);
        return res.status(200).json({ success: true, message: 'Invitation sent', inviteUrl });

    } catch (err: any) {
        console.error('Invite error:', err);
        return res.status(500).json({ error: err.message });
    }
}
