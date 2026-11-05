import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { sendNewsletter } from '../../lib/api-handlers/_newsletter-send-handler.js'
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js'

/** Call a req/res handler directly and capture what it responds with. */
async function runInProcess(
    fn: (req: VercelRequest, res: VercelResponse) => unknown,
    body: Record<string, unknown>
): Promise<{ status: number; body: any }> {
    let status = 200
    let payload: any = null
    const res: any = {
        status(code: number) { status = code; return res },
        json(b: any) { payload = b; return res },
        setHeader() { return res },
        end() { return res },
    }
    await fn({ method: 'POST', headers: {}, body, query: {} } as any, res)
    return { status, body: payload }
}

/**
 * Cron job: Send scheduled newsletters
 * 
 * Runs hourly. Picks up campaigns with status='scheduled' where scheduled_for <= now,
 * then triggers the newsletter send handler for each one.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Vercel sends CRON_SECRET as a bearer token on every cron call.
    if (!isCronAuthorized(req)) {
        return res.status(401).json({ error: 'Unauthorized' })
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

        // Run the send in-process. The /api/newsletter/send route is admin-only,
        // and this cron is already authorised by CRON_SECRET.
        const sendResponse = await runInProcess(sendNewsletter, {
            subject: campaign.subject,
            content: campaign.content,
            contentHtml: campaign.content_html,
            campaignId: campaign.id,
        })

        const result = sendResponse.body
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
