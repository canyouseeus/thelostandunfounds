import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { generateNewsletterEmail, processEmailContent, BRAND } from '../email-template.js'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface ZohoEmailResult {
  success: boolean
  error?: string
}

interface ResendEmailResult {
  success: boolean
  id?: string
  error?: string
}

// Check if Resend is configured
function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
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
      console.error('Resend API error:', data)
      return { 
        success: false, 
        error: data.message || data.error?.message || `Resend error: ${response.status}` 
      }
    }

    return { success: true, id: data.id }
  } catch (error: any) {
    console.error('Resend send error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

const BANNER_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='50%25' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>"

function ensureBannerHtml(htmlContent: string): string {
  const bannerBlock = `
<div style="padding: 0 0 30px 0; background-color: #000000 !important; text-align: center;">
  <img src="${BANNER_URL}" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
</div>`

  const ensureShell = (html: string) => {
    if (/<html[\s>]/i.test(html)) return html
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0; padding:0; background-color:#000000; font-family: Arial, sans-serif;">${html}</body></html>`
  }

  const insertAfterBody = (html: string) => {
    const match = /<body[^>]*>/i.exec(html)
    if (!match) return null
    const idx = (match.index ?? 0) + match[0].length
    return html.slice(0, idx) + bannerBlock + html.slice(idx)
  }

  let html = htmlContent || ''
  if (html.includes(BANNER_URL)) {
    return ensureShell(html)
  }

  const withBodyInsert = insertAfterBody(html)
  if (withBodyInsert) {
    return ensureShell(withBodyInsert)
  }

  return ensureShell(bannerBlock + html)
}

function extractBodyContent(contentHtml: string): string {
  if (!contentHtml) {
    return ''
  }

  const bodyMatch = contentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim()
  }

  // If legacy templates wrapped content in a table, capture the first table block
  const tableMatch = contentHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i)
  if (tableMatch && tableMatch[0]) {
    return tableMatch[0].trim()
  }

  return contentHtml.trim()
}

function generateNewsletterEmailHtml(bodyHtml: string, subscriberEmail: string): string {
  const currentYear = new Date().getFullYear()
  const unsubscribeUrl = `https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(subscriberEmail)}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; font-family: Arial, sans-serif; }
    table { background-color: #000000 !important; border-collapse: collapse !important; }
    td { background-color: #000000 !important; }
    a { color: rgba(255, 255, 255, 0.9); }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important; font-family: Arial, sans-serif;">
  <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
        <table role="presentation" style="max-width: 600px !important; width: 100% !important; background-color: #000000 !important; margin: 0 auto !important;">
          <tr>
            <td align="left" style="padding: 0 0 30px 0 !important;">
              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 !important; color: #ffffff !important;">
              ${bodyHtml || '<p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;">Stay tuned for updates from THE LOST+UNFOUNDS.</p>'}
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left;">
                © ${currentYear} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                <a href="${unsubscribeUrl}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe from this newsletter</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
    console.log('Zoho accounts response:', JSON.stringify(accounts, null, 2))
    if (accounts.data && accounts.data.length > 0) {
      const account = accounts.data[0]
      // Match the exact format from newsletter-subscribe (which works)
      const accountId = account.accountId || account.account_id || account.accountId
      // Try to get the actual email from the account response - ensure it's a string
      let accountEmail = fallbackEmail
      if (account.emailAddress && typeof account.emailAddress === 'string') {
        accountEmail = account.emailAddress
      } else if (account.email && typeof account.email === 'string') {
        accountEmail = account.email
      } else if (account.accountName && typeof account.accountName === 'string') {
        accountEmail = account.accountName
      }
      
      if (accountId) {
        console.log('Using account ID:', accountId, 'email:', accountEmail)
        return { accountId, email: accountEmail }
      }
    } else {
      console.warn('No accounts found in Zoho response')
    }
  } else {
    const accountErrorText = await accountInfoResponse.text()
    console.error('Failed to get Zoho accounts:', {
      status: accountInfoResponse.status,
      error: accountErrorText
    })
  }

  // Fallback: extract account ID from email (this might not work for all Zoho setups)
  console.warn('Account ID not found from API, using email prefix as fallback')
  const emailParts = fallbackEmail.split('@')
  const fallbackAccountId = emailParts[0]
  console.log('Using fallback account ID:', fallbackAccountId, 'from email:', fallbackEmail)
  return { accountId: fallbackAccountId, email: fallbackEmail }
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
    console.error('Zoho email API error:', {
      status: emailResponse.status,
      statusText: emailResponse.statusText,
      error: errorText,
      accountId,
      fromEmail,
      toEmail,
      mailApiUrl
    })
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subject, content, contentHtml, campaignId, testEmail, scheduledFor } = req.body

  // Validate input
  if (!subject || !content || !contentHtml) {
    return res.status(400).json({ error: 'Subject, content, and contentHtml are required' })
  }

  const normalizedContentHtml = extractBodyContent(contentHtml)

  // If testEmail is provided, validate it
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return res.status(400).json({ error: 'Invalid testEmail format' })
  }

  // Validate scheduledFor if provided
  let scheduledDate: Date | null = null
  if (scheduledFor) {
    scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledFor date format' })
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' })
    }
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get subscriber count for campaign record
    const { count: subscriberCount, error: countError } = await supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true)

    if (countError) {
      throw countError
    }

    const totalSubscribers = testEmail ? 1 : (subscriberCount || 0)

    // If scheduling, create campaign and return early
    if (scheduledDate && !testEmail) {
      const campaignData: any = {
        subject,
        content,
        content_html: normalizedContentHtml,
        status: 'scheduled',
        scheduled_for: scheduledDate.toISOString(),
        total_subscribers: totalSubscribers,
      }

      let campaignRecord
      if (campaignId) {
        const { data, error } = await supabase
          .from('newsletter_campaigns')
          .update(campaignData)
          .eq('id', campaignId)
          .select()
          .single()
        if (error) throw error
        campaignRecord = data
      } else {
        const { data, error } = await supabase
          .from('newsletter_campaigns')
          .insert(campaignData)
          .select()
          .single()
        if (error) throw error
        campaignRecord = data
      }

      return res.status(200).json({
        success: true,
        message: `Newsletter scheduled for ${scheduledDate.toISOString()}`,
        campaignId: campaignRecord.id,
        scheduled: true,
        scheduledFor: scheduledDate.toISOString(),
        stats: {
          totalSubscribers,
          emailsSent: 0,
          emailsFailed: 0,
        },
      })
    }

    // If testEmail is provided, only send to that email
    let subscribers: { email: string }[]

    if (testEmail) {
      // Test mode: only send to the specified email
      subscribers = [{ email: testEmail }]
    } else {
      // Normal mode: get all verified subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('verified', true)

      if (subscribersError) {
        throw subscribersError
      }

      if (!subscribersData || subscribersData.length === 0) {
        return res.status(400).json({ error: 'No subscribers found' })
      }

      subscribers = subscribersData
    }

    // Check Zoho configuration
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    if (!fromEmail) {
      return res.status(500).json({ error: 'Zoho email not configured' })
    }

    // Create or update campaign record
    let campaignRecord
    if (campaignId) {
      // Update existing campaign
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .update({
          subject,
          content,
          content_html: normalizedContentHtml,
          status: 'sending',
          total_subscribers: totalSubscribers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single()

      if (error) throw error
      campaignRecord = data
    } else {
      // Create new campaign
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          subject,
          content,
          content_html: normalizedContentHtml,
          status: 'sending',
          total_subscribers: totalSubscribers,
        })
        .select()
        .single()

      if (error) throw error
      campaignRecord = data
    }

    // Determine which email provider to use
    const useResend = isResendConfigured()
    console.log(`Using email provider: ${useResend ? 'Resend' : 'Zoho'}`)

    // Initialize Zoho if needed (only when not using Resend)
    let accessToken: string = ''
    let accountId: string = ''
    let actualFromEmail: string = fromEmail

    if (!useResend) {
      try {
        accessToken = await getZohoAccessToken()
        const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
        accountId = accountInfo.accountId
        actualFromEmail = (accountInfo.email && typeof accountInfo.email === 'string' && accountInfo.email.includes('@')) 
          ? accountInfo.email 
          : fromEmail
        
        console.log('Zoho account info:', {
          accountId,
          configuredEmail: fromEmail,
          accountInfoEmail: accountInfo.email,
          actualEmail: actualFromEmail,
        })
      } catch (error: any) {
        await supabase
          .from('newsletter_campaigns')
          .update({ status: 'failed' })
          .eq('id', campaignRecord.id)

        throw new Error(`Failed to authenticate with Zoho: ${error.message}`)
      }
    }

    // Send emails to all subscribers
    let emailsSent = 0
    let emailsFailed = 0
    const errors: string[] = []

    // Per-recipient HTML: use centralized email template
    const buildRecipientHtml = (rawHtml: string, email: string) => {
      // Process content with standardized template
      return processEmailContent(rawHtml, email)
    }

    // Send emails in batches
    const batchSize = useResend ? 50 : 10  // Resend can handle larger batches
    const sendLogs: { subscriber_email: string; status: string; error_message: string | null; sent_at: string | null }[] = []
    
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const recipientHtml = buildRecipientHtml(contentHtml, subscriber.email)
            
            // Use Resend or Zoho based on configuration
            const result = useResend
              ? await sendResendEmail(subscriber.email, subject, recipientHtml)
              : await sendZohoEmail(accessToken, accountId, actualFromEmail, subscriber.email, subject, recipientHtml)

            if (result.success) {
              emailsSent++
              sendLogs.push({
                subscriber_email: subscriber.email,
                status: 'sent',
                error_message: null,
                sent_at: new Date().toISOString()
              })
            } else {
              emailsFailed++
              const errorMsg = result.error || 'Unknown error'
              errors.push(`${subscriber.email}: ${errorMsg}`)
              sendLogs.push({
                subscriber_email: subscriber.email,
                status: 'failed',
                error_message: errorMsg,
                sent_at: null
              })
            }
          } catch (error: any) {
            emailsFailed++
            const errorMsg = error.message || 'Unknown error'
            errors.push(`${subscriber.email}: ${errorMsg}`)
            sendLogs.push({
              subscriber_email: subscriber.email,
              status: 'failed',
              error_message: errorMsg,
              sent_at: null
            })
          }
        })
      )

      // Delay between batches (shorter for Resend)
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, useResend ? 200 : 1000))
      }
    }

    // Insert send logs into database
    if (sendLogs.length > 0) {
      const logsToInsert = sendLogs.map(log => ({
        campaign_id: campaignRecord.id,
        ...log
      }))
      await supabase
        .from('newsletter_send_logs')
        .insert(logsToInsert)
    }

    // Update campaign with results
    const finalStatus = emailsFailed === totalSubscribers ? 'failed' : 'sent'
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
      })
      .eq('id', campaignRecord.id)

    return res.status(200).json({
      success: true,
      message: `Newsletter sent to ${emailsSent} subscribers`,
      campaignId: campaignRecord.id,
      stats: {
        totalSubscribers,
        emailsSent,
        emailsFailed,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
    })

  } catch (error: any) {
    console.error('Newsletter send error:', error)
    return res.status(500).json({
      error: error.message || 'An error occurred while sending the newsletter',
    })
  }
}
