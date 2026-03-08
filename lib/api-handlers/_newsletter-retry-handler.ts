import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { processEmailContent } from '../email-template.js'
import { delay, getZohoAuthContext, sendZohoEmail as sendZohoEmailUtil } from './_zoho-email-utils.js'

/**
 * Build recipient HTML with unsubscribe link
 * Uses centralized email template for consistency
 */
function buildRecipientHtml(rawHtml: string, email: string): string {
  return processEmailContent(rawHtml, email)
}

// Check if Resend is configured
function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

interface ResendEmailResult {
  success: boolean
  id?: string
  error?: string
}

// Send email via Resend API
async function sendResendEmail(
  to: string,
  subject: string,
  html: string
): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'THE LOST+UNFOUNDS <noreply@thelostandunfounds.com>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error?.message || `Resend error: ${response.status}`
      }
    }

    return { success: true, id: data.id }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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

    // Determine which email provider to use
    const useResend = isResendConfigured()
    console.log(`Retry using email provider: ${useResend ? 'Resend' : 'Zoho'}`)

    // Initialize Zoho if needed
    let zohoAuth: any = null

    if (!useResend) {
      try {
        zohoAuth = await getZohoAuthContext()
        console.log('Zoho auth context initialized:', {
          accountId: zohoAuth.accountId,
          fromEmail: zohoAuth.fromEmail
        })
      } catch (error: any) {
        throw new Error(`Failed to authenticate with Zoho: ${error.message}`)
      }
    }

    // Send emails
    let emailsSent = 0
    let emailsFailed = 0
    const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = []

    for (const email of emailsToRetry) {
      try {
        const recipientHtml = buildRecipientHtml(campaign.content_html, email)

        // Use Resend or Zoho based on configuration
        const result = useResend
          ? await sendResendEmail(email, campaign.subject, recipientHtml)
          : await sendZohoEmailUtil({
            auth: zohoAuth,
            to: email,
            subject: campaign.subject,
            htmlContent: recipientHtml
          })

        if (result.success) {
          emailsSent++
          results.push({ email, status: 'sent' })

          // Upsert log entry (insert if not exists, update if exists)
          if (isLegacyRetry) {
            await supabase
              .from('newsletter_send_logs')
              .insert({
                campaign_id: campaignId,
                subscriber_email: email,
                status: 'sent',
                error_message: null,
                sent_at: new Date().toISOString()
              })
          } else {
            await supabase
              .from('newsletter_send_logs')
              .update({
                status: 'sent',
                error_message: null,
                sent_at: new Date().toISOString()
              })
              .eq('campaign_id', campaignId)
              .eq('subscriber_email', email)
          }
        } else {
          emailsFailed++
          results.push({ email, status: 'failed', error: result.error })

          // Upsert log entry with error
          if (isLegacyRetry) {
            await supabase
              .from('newsletter_send_logs')
              .insert({
                campaign_id: campaignId,
                subscriber_email: email,
                status: 'failed',
                error_message: result.error,
                sent_at: null
              })
          } else {
            await supabase
              .from('newsletter_send_logs')
              .update({
                error_message: result.error
              })
              .eq('campaign_id', campaignId)
              .eq('subscriber_email', email)
          }
        }
      } catch (error: any) {
        emailsFailed++
        results.push({ email, status: 'failed', error: error.message })
      }

      // Rate limiting delay
      const throttleDelay = useResend ? 550 : 750
      if (emailsSent + emailsFailed < emailsToRetry.length) {
        await delay(throttleDelay)
      }
    }

    // Update campaign totals
    const { data: updatedCounts } = await supabase
      .from('newsletter_send_logs')
      .select('status')
      .eq('campaign_id', campaignId)

    const newSentCount = updatedCounts?.filter(l => l.status === 'sent').length || 0
    const newFailedCount = updatedCounts?.filter(l => l.status === 'failed').length || 0

    await supabase
      .from('newsletter_campaigns')
      .update({
        emails_sent: newSentCount,
        emails_failed: newFailedCount,
        status: newFailedCount === 0 ? 'sent' : 'sent'
      })
      .eq('id', campaignId)

    return res.status(200).json({
      success: true,
      message: `Retry completed: ${emailsSent} sent, ${emailsFailed} failed`,
      stats: {
        attempted: emailsToRetry.length,
        sent: emailsSent,
        failed: emailsFailed,
      },
      results
    })

  } catch (error: any) {
    console.error('Newsletter retry error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while retrying emails',
    })
  }
}
