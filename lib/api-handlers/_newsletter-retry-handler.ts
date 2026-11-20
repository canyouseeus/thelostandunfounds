import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { processEmailContent } from '../email-template.js'
import { createNewsletterSender } from './_newsletter-delivery.js'

/**
 * Build recipient HTML with unsubscribe link
 * Uses centralized email template for consistency
 */
function buildRecipientHtml(rawHtml: string, email: string): string {
  return processEmailContent(rawHtml, email)
}

// Stop with this much of the function's 300s limit left so logs get written.
const TIME_BUDGET_MS = 250_000

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startedAt = Date.now()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { campaignId, emails } = req.body

  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId is required' })
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    // Get failed emails to retry
    let emailsToRetry: string[]
    let isLegacyRetry = false

    if (emails && Array.isArray(emails) && emails.length > 0) {
      // Retry specific emails
      emailsToRetry = emails
    } else {
      // Retry all failed emails for this campaign
      const { data: failedLogs, error: logsError } = await supabase
        .from('newsletter_send_logs')
        .select('subscriber_email')
        .eq('campaign_id', campaignId)
        .eq('status', 'failed')

      if (logsError) {
        throw logsError
      }

      emailsToRetry = failedLogs?.map(log => log.subscriber_email) || []

      // If no logs exist but campaign shows failed emails, this is a legacy campaign
      // Get all current verified subscribers and retry sending to all of them
      if (emailsToRetry.length === 0 && campaign.emails_failed > 0) {
        isLegacyRetry = true

        // Get successfully sent emails from logs (if any exist)
        const { data: sentLogs } = await supabase
          .from('newsletter_send_logs')
          .select('subscriber_email')
          .eq('campaign_id', campaignId)
          .eq('status', 'sent')

        const sentEmails = new Set(sentLogs?.map(log => log.subscriber_email) || [])

        // Get all current verified subscribers
        const { data: allSubscribers, error: subsError } = await supabase
          .from('newsletter_subscribers')
          .select('email')
          .eq('verified', true)

        if (subsError) {
          throw subsError
        }

        // Filter out those who already received the email
        emailsToRetry = (allSubscribers || [])
          .map(s => s.email)
          .filter(email => !sentEmails.has(email))
      }
    }

    if (emailsToRetry.length === 0) {
      return res.status(400).json({ error: 'No failed emails to retry. All subscribers may have already received this newsletter.' })
    }

    // Resend first, Zoho when Resend is out of room or refuses, held when
    // neither has room. See _newsletter-delivery.ts.
    const sender = await createNewsletterSender(supabase, {
      allowZoho: !!(process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL),
    })

    let emailsSent = 0
    let emailsFailed = 0
    let emailsHeld = 0
    let holdReason = ''
    let providerColumn = true
    const results: { email: string; status: 'sent' | 'failed' | 'pending'; provider?: string; error?: string }[] = []

    const writeLog = async (email: string, fields: Record<string, any>) => {
      const run = (f: Record<string, any>) =>
        isLegacyRetry
          ? supabase.from('newsletter_send_logs').insert({ campaign_id: campaignId, subscriber_email: email, ...f })
          : supabase.from('newsletter_send_logs').update(f).eq('campaign_id', campaignId).eq('subscriber_email', email)
      const strip = (f: Record<string, any>) => {
        const { provider: _provider, ...rest } = f
        return rest
      }
      let { error } = await run(providerColumn ? fields : strip(fields))
      if (error && providerColumn && 'provider' in fields && /provider/i.test(error.message || '')) {
        // Migration not applied yet: log without the provider.
        providerColumn = false
        ;({ error } = await run(strip(fields)))
      }
      if (error) console.error(`[newsletter-retry] could not log ${email}:`, error.message)
    }

    const holdRest = async (from: number, reason: string) => {
      holdReason = reason
      for (const rest of emailsToRetry.slice(from)) {
        emailsHeld++
        results.push({ email: rest, status: 'pending', error: reason })
        await writeLog(rest, { status: 'pending', error_message: reason, sent_at: null })
      }
    }

    for (let i = 0; i < emailsToRetry.length; i++) {
      const email = emailsToRetry[i]

      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        await holdRest(i, 'Held: the retry ran out of time and resumes automatically')
        break
      }

      let outcome
      try {
        outcome = await sender.send(email, campaign.subject, buildRecipientHtml(campaign.content_html, email))
      } catch (error: any) {
        outcome = { status: 'failed' as const, provider: undefined, error: error?.message || 'Unknown error' }
      }

      if (outcome.status === 'sent') {
        emailsSent++
        results.push({ email, status: 'sent', provider: outcome.provider })
        await writeLog(email, {
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString(),
          provider: outcome.provider,
        })
      } else if (outcome.status === 'failed') {
        emailsFailed++
        results.push({ email, status: 'failed', provider: outcome.provider, error: outcome.error })
        await writeLog(
          email,
          isLegacyRetry
            ? { status: 'failed', error_message: outcome.error, sent_at: null, provider: outcome.provider ?? null }
            : { status: 'failed', error_message: outcome.error, provider: outcome.provider ?? null }
        )
      } else {
        await holdRest(i, outcome.reason)
        break
      }
    }

    // Update campaign totals
    const { data: updatedCounts } = await supabase
      .from('newsletter_send_logs')
      .select('status')
      .eq('campaign_id', campaignId)

    const newSentCount = updatedCounts?.filter(l => l.status === 'sent').length || 0
    const newFailedCount = updatedCounts?.filter(l => l.status === 'failed').length || 0
    const newPendingCount = updatedCounts?.filter(l => l.status === 'pending').length || 0

    // Held recipients finish automatically: the hourly scheduled-newsletter
    // cron resumes a 'scheduled' campaign's pending recipients.
    let resumeAt: Date | null = null
    if (newPendingCount > 0) {
      resumeAt = emailsHeld > 0 && holdReason.includes('ran out of time')
        ? new Date(Date.now() + 60_000)
        : sender.resumeAt()
      if (!Number.isFinite(resumeAt.getTime())) resumeAt = null
    }

    await supabase
      .from('newsletter_campaigns')
      .update({
        emails_sent: newSentCount,
        emails_failed: newFailedCount,
        status: newPendingCount > 0 ? (resumeAt ? 'scheduled' : 'sending') : 'sent',
        ...(resumeAt ? { scheduled_for: resumeAt.toISOString() } : {}),
      })
      .eq('id', campaignId)

    const parts = [`Retry completed: ${emailsSent} sent, ${emailsFailed} failed`]
    if (emailsHeld > 0) {
      parts.push(resumeAt
        ? `${emailsHeld} waiting to send automatically after ${resumeAt.toISOString()}`
        : `${emailsHeld} waiting: ${holdReason}`)
    }

    return res.status(200).json({
      success: true,
      message: parts.join(', '),
      stats: {
        attempted: emailsToRetry.length,
        sent: emailsSent,
        failed: emailsFailed,
        held: emailsHeld,
        sentByResend: sender.sentBy.resend,
        sentByZoho: sender.sentBy.zoho,
      },
      resumeAt: resumeAt ? resumeAt.toISOString() : undefined,
      results
    })

  } catch (error: any) {
    console.error('Newsletter retry error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while retrying emails',
    })
  }
}
