import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = 'thelostunfounds@gmail.com'; // Admin email to receive submission notifications

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { eventId, action } = req.body;

        if (!eventId || !action) {
            return res.status(400).json({ error: 'Missing requirements' });
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // Fetch event details
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventError || !event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Fetch user email
        let userEmail = '';
        if (event.owner_id) {
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(event.owner_id);
            if (!userError && user?.email) {
                userEmail = user.email;
            }
        }

        let subject = '';
        let content = '';
        let to = '';

        if (action === 'submitted') {
            to = ADMIN_EMAIL;
            subject = `New Event Submission: ${event.title}`;
            content = `
                <h2 style="color: #ffffff; text-transform: uppercase;">New Event Submission</h2>
                <p style="color: #ffffff;">A new event has been submitted for review.</p>
                <p style="color: #ffffff;"><strong>Title:</strong> ${event.title}</p>
                <p style="color: #ffffff;"><strong>Date:</strong> ${new Date(event.event_date).toLocaleString()}</p>
                <p style="color: #ffffff;"><strong>Location:</strong> ${event.location}</p>
                <p style="color: #ffffff;"><strong>Submitted by:</strong> ${userEmail || 'Unknown user'}</p>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
                <a href="https://www.thelostandunfounds.com/admin" style="display: inline-block; padding: 10px 20px; background-color: #000000; color: #ffffff; border: 2px solid #ffffff; text-decoration: none; font-weight: bold; text-transform: uppercase;">Review in Admin Panel</a>
            `;
        } else if (action === 'approved') {
            if (!userEmail) return res.status(400).json({ error: 'Owner email not found' });
            to = userEmail;
            subject = `Your Event Has Been Approved: ${event.title}`;
            content = `
                <h2 style="color: #ffffff; text-transform: uppercase;">Event Approved!</h2>
                <p style="color: #ffffff;">Great news! Your event <strong>${event.title}</strong> has been approved and is now live on THE LOST+UNFOUNDS.</p>
                <p style="color: #ffffff;"><strong>Date:</strong> ${new Date(event.event_date).toLocaleString()}</p>
                <p style="color: #ffffff;"><strong>Location:</strong> ${event.location}</p>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
                <a href="https://www.thelostandunfounds.com/events" style="display: inline-block; padding: 10px 20px; background-color: #000000; color: #ffffff; border: 2px solid #ffffff; text-decoration: none; font-weight: bold; text-transform: uppercase;">View Events</a>
            `;
        } else if (action === 'rejected') {
            if (!userEmail) return res.status(400).json({ error: 'Owner email not found' });
            to = userEmail;
            subject = `Update on Your Event Submission: ${event.title}`;
            content = `
                <h2 style="color: #ffffff; text-transform: uppercase;">Event Submission Update</h2>
                <p style="color: #ffffff;">Thank you for submitting your event <strong>${event.title}</strong>.</p>
                <p style="color: #ffffff;">Unfortunately, we are unable to approve and publish this event at this time. If you have any questions, please reply to this email.</p>
            `;
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const sendResult = await sendTransactionalEmail({ to, subject, content });

        if (!sendResult.success) {
            throw new Error(sendResult.error || 'Failed to send email');
        }

        return res.status(200).json({ success: true, message: 'Notification sent successfully' });
    } catch (err: any) {
        console.error('Event notification error:', err);
        return res.status(500).json({ error: err.message });
    }
}
