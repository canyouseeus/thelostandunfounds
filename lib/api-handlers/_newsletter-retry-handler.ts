import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface ZohoEmailResult {
  success: boolean
  error?: string
}

/**
 * Get Zoho access token
 */
async function getZohoAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho credentials not configured')
  }

  const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Failed to refresh Zoho token: ${tokenResponse.status} ${errorText}`)
  }

  const tokenData: ZohoTokenResponse = await tokenResponse.json()
  return tokenData.access_token
}

/**
 * Get Zoho account ID and email
 */
async function getZohoAccountInfo(accessToken: string, fallbackEmail: string): Promise<{ accountId: string; email: string }> {
  const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
    method: 'GET',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
    },
  })

  if (accountInfoResponse.ok) {
    const accounts = await accountInfoResponse.json()
    if (accounts.data && accounts.data.length > 0) {
      const account = accounts.data[0]
      const accountId = account.accountId || account.account_id
      let accountEmail = fallbackEmail
      if (account.emailAddress && typeof account.emailAddress === 'string') {
        accountEmail = account.emailAddress
      } else if (account.email && typeof account.email === 'string') {
        accountEmail = account.email
      }
      if (accountId) {
        return { accountId, email: accountEmail }
      }
    }
  }

  const emailParts = fallbackEmail.split('@')
  return { accountId: emailParts[0], email: fallbackEmail }
}

/**
 * Send email via Zoho Mail API
 */
async function sendZohoEmail(
  accessToken: string,
  accountId: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<ZohoEmailResult> {
  const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`

  const emailResponse = await fetch(mailApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fromAddress: fromEmail,
      toAddress: toEmail,
      subject: subject,
      content: htmlContent,
      mailFormat: 'html',
    }),
  })

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text()
    let errorMessage = `Failed to send email: ${emailResponse.status}`
    try {
      const errorJson = JSON.parse(errorText)
      if (errorJson.data?.moreInfo) {
        errorMessage = `Zoho Error: ${errorJson.data.moreInfo}`
      } else if (errorJson.status?.description) {
        errorMessage = `Zoho Error: ${errorJson.status.description}`
      }
    } catch {
      errorMessage = `Failed to send email: ${emailResponse.status}. Details: ${errorText}`
    }
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

/**
 * Build recipient HTML with unsubscribe link
 */
function buildRecipientHtml(rawHtml: string, email: string): string {
  const unsubscribeUrl = `https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
  let html = rawHtml || ''
  html = html.replace(/several\s+integrations/gi, 'several iterations')
  html = html.replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl)
  html = html.replace(/href=["']\s*{{\s*unsubscribe_url\s*}}["']/gi, `href="${unsubscribeUrl}"`)
  const hasUnsubscribeLink = /href=["'][^"']*unsubscribe/i.test(html) || />Unsubscribe<\/a>/i.test(html)
  if (!hasUnsubscribeLink) {
    const unsubBlock = `<p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: left; background-color: #000000 !important;"><a href="${unsubscribeUrl}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe</a></p>`
    const hrIdx = html.indexOf('<hr')
    html = hrIdx >= 0 ? html.slice(0, hrIdx) + unsubBlock + html.slice(hrIdx) : html + unsubBlock
  }
  return html
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

    // Check Zoho configuration
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    if (!fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Get Zoho access token and account info
    const accessToken = await getZohoAccessToken()
    const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
    const accountId = accountInfo.accountId
    const actualFromEmail = (accountInfo.email && accountInfo.email.includes('@')) 
      ? accountInfo.email 
      : fromEmail

    // Send emails
    let emailsSent = 0
    let emailsFailed = 0
    const results: { email: string; status: 'sent' | 'failed'; error?: string }[] = []

    const batchSize = 10
    for (let i = 0; i < emailsToRetry.length; i += batchSize) {
      const batch = emailsToRetry.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (email) => {
          try {
            const recipientHtml = buildRecipientHtml(campaign.content_html, email)
            const result = await sendZohoEmail(
              accessToken,
              accountId,
              actualFromEmail,
              email,
              campaign.subject,
              recipientHtml
            )

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
        })
      )

      // Small delay between batches
      if (i + batchSize < emailsToRetry.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
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
