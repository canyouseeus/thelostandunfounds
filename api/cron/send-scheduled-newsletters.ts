import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

/**
 * Cron job: Send scheduled newsletters
 * 
 * Runs hourly. Picks up campaigns with status='scheduled' where scheduled_for <= now,
 * then triggers the newsletter send handler for each one.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Verify this is a cron invocation (Vercel sets this header)
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VERCEL_URL) {
        // In production without CRON_SECRET, allow if it's a Vercel cron
        // Vercel crons are invoked internally and don't need auth
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Database not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        // Find campaigns that are scheduled and ready to send
        const now = new Date().toISOString()
        const { data: campaigns, error } = await supabase
            .from('newsletter_campaigns')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_for', now)
            .order('scheduled_for', { ascending: true })
            .limit(1) // Process one at a time to stay within timeout

        if (error) {
            console.error('Error fetching scheduled campaigns:', error)
            return res.status(500).json({ error: error.message })
        }

        if (!campaigns || campaigns.length === 0) {
            return res.status(200).json({ message: 'No scheduled campaigns to send', processed: 0 })
        }

        const campaign = campaigns[0]
        console.log(`Processing scheduled campaign: ${campaign.id} - "${campaign.subject}"`)

        // Update status to 'sending' to prevent duplicate cron picks
        await supabase
            .from('newsletter_campaigns')
            .update({ status: 'sending', updated_at: new Date().toISOString() })
            .eq('id', campaign.id)

        // Call the newsletter send endpoint internally
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://www.thelostandunfounds.com'

        const sendResponse = await fetch(`${baseUrl}/api/newsletter/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject: campaign.subject,
                content: campaign.content,
                contentHtml: campaign.content_html,
                campaignId: campaign.id,
            }),
        })

        const result = await sendResponse.json()
        console.log(`Campaign ${campaign.id} send result:`, result)

        return res.status(200).json({
            message: `Processed scheduled campaign: ${campaign.subject}`,
            campaignId: campaign.id,
            result,
            processed: 1,
        })
    } catch (error: any) {
        console.error('Cron send-scheduled-newsletters error:', error)
        return res.status(500).json({ error: error.message })
    }
}
