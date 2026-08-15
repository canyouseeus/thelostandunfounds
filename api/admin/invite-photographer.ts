// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js';
import { GALLERY_AGENT_EMAIL } from '../../src/lib/gallery-agent.js';

// Load env vars if running locally
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

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

        // 3. Send Email using standard transactional email handler
        const inviteUrl = `https://www.thelostandunfounds.com/setup?token=${token}`;
        // Same token, second destination: the kit list. It is answerable in one
        // sitting with no account, which is why it ships in the first email
        // rather than waiting until after gallery setup.
        const gearUrl = `https://www.thelostandunfounds.com/gear?token=${token}`;

        // Gear leads, gallery follows. The kit list is the thing we actually
        // need back, it takes two minutes and it depends on nothing, whereas
        // gallery setup involves another service and is genuinely optional.
        // Leading with the optional half is what made this read like a chore.
        const button = (href: string, label: string) =>
            `<a href="${href}" style="background: #ffffff; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">${label}</a>`;
        const fallbackLink = (href: string) =>
            `<p style="color: #aaaaaa; font-size: 12px;">Or copy this link: <a href="${href}" style="color: #aaaaaa; text-decoration: underline;">${href}</a></p>`;

        const content = `
            <h1 style="color: #ffffff; margin-bottom: 20px;">You're on the roster</h1>
            <p style="color: #ffffff;">Hey ${name || 'there'},</p>
            <p style="color: #ffffff;">You're in. Two things and you're set.</p>

            <h2 style="color: #ffffff; margin-top: 36px; margin-bottom: 8px; font-size: 18px;">1. Your equipment</h2>
            <p style="color: #ffffff; margin-top: 0;">What you shoot on; bodies, lenses, lighting, audio, tripods, gimbals. Takes about two minutes, and it's how we know which jobs to send your way. Start here.</p>
            <p style="margin: 20px 0;">${button(gearUrl, 'List My Equipment')}</p>
            ${fallbackLink(gearUrl)}

            <h2 style="color: #ffffff; margin-top: 36px; margin-bottom: 8px; font-size: 18px;">2. Your gallery <span style="color: #aaaaaa; font-weight: normal; font-size: 14px;">(optional)</span></h2>
            <p style="color: #ffffff; margin-top: 0;">Host and sell your work on the site. We sync from one Google Drive folder you pick:</p>
            <ul style="color: #ffffff; padding-left: 20px; line-height: 1.7;">
                <li>In Google Drive, right-click your photo folder &rarr; <strong>Share</strong></li>
                <li>Paste in <span style="color: #aaaaaa; word-break: break-all;">${GALLERY_AGENT_EMAIL}</span></li>
                <li>Set it to <strong>Viewer</strong> &rarr; Send</li>
                <li>Copy the folder link, paste it into the setup page</li>
            </ul>
            <p style="color: #ffffff;">Nothing to install and nothing to set up on Google's end; it's the same as sharing a folder with a person.</p>
            <p style="margin: 20px 0;">${button(inviteUrl, 'Set Up Gallery')}</p>
            ${fallbackLink(inviteUrl)}

            <p style="color: #ffffff; margin-top: 36px;">&mdash; Joshua, THE LOST+UNFOUNDS</p>
        `;

        const emailResult = await sendTransactionalEmail({
            to: email,
            // Photographer coordination is business correspondence, so it
            // comes from the business address of record rather than the admin
            // account, and a reply lands there too. CC keeps the thread on
            // file even when someone replies to one person only.
            from: 'media@thelostandunfounds.com',
            cc: 'media@thelostandunfounds.com',
            subject: "You're on the roster: two quick things",
            content,
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
