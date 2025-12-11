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

  const { subject, content, contentHtml, campaignId, testEmail } = req.body

  // Validate input
  if (!subject || !content || !contentHtml) {
    return res.status(400).json({ error: 'Subject, content, and contentHtml are required' })
  }

  const normalizedContentHtml = extractBodyContent(contentHtml)

  // If testEmail is provided, validate it
  if (testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return res.status(400).json({ error: 'Invalid testEmail format' })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Database service not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // If testEmail is provided, only send to that email
    let subscribers: { email: string }[]
    let totalSubscribers: number

    if (testEmail) {
      // Test mode: only send to the specified email
      subscribers = [{ email: testEmail }]
      totalSubscribers = 1
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
      totalSubscribers = subscribersData.length
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

    // Get Zoho access token and account info
    let accessToken: string
    let accountId: string
    let actualFromEmail: string

    try {
      accessToken = await getZohoAccessToken()
      const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)
      accountId = accountInfo.accountId
      // Use the email from account info, but fallback to configured email if it's invalid
      actualFromEmail = (accountInfo.email && typeof accountInfo.email === 'string' && accountInfo.email.includes('@')) 
        ? accountInfo.email 
        : fromEmail
      
      // Log the email being used for debugging
      console.log('Zoho account info:', {
        accountId,
        configuredEmail: fromEmail,
        accountInfoEmail: accountInfo.email,
        actualEmail: actualFromEmail,
        usingActualEmail: actualFromEmail !== fromEmail
      })
    } catch (error: any) {
      // Update campaign status to failed
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignRecord.id)

      throw new Error(`Failed to authenticate with Zoho: ${error.message}`)
    }

    // Send emails to all subscribers
    let emailsSent = 0
    let emailsFailed = 0
    const errors: string[] = []

    // Per-recipient HTML: inject unsubscribe link (skip banner - content already has one)
    const buildRecipientHtml = (rawHtml: string, email: string) => {
      const unsubscribeUrl = `https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
      let html = rawHtml || ''
      // Copy hygiene: fix wording
      html = html.replace(/several\s+integrations/gi, 'several iterations')
      // Replace placeholders in both text and href (no escaped backslashes so regex matches)
      html = html.replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl)
      html = html.replace(/href=["']\s*{{\s*unsubscribe_url\s*}}["']/gi, `href="${unsubscribeUrl}"`)
      // Only add unsubscribe if content has NO unsubscribe link at all
      // Check for both the word "unsubscribe" in an href AND as link text
      const hasUnsubscribeLink = /href=["'][^"']*unsubscribe/i.test(html) || />Unsubscribe<\/a>/i.test(html)
      if (!hasUnsubscribeLink) {
        const unsubBlock = `<p style="color: rgba(255, 255, 255, 0.6); font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: left; background-color: #000000 !important;"><a href="${unsubscribeUrl}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">Unsubscribe</a></p>`
        const hrIdx = html.indexOf('<hr')
        html = hrIdx >= 0 ? html.slice(0, hrIdx) + unsubBlock + html.slice(hrIdx) : html + unsubBlock
      }
      // Don't add banner - content from NewsletterManagement already has proper banner
      return html
    }

    // Send emails in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const recipientHtml = buildRecipientHtml(contentHtml, subscriber.email)
            const result = await sendZohoEmail(
              accessToken,
              accountId,
              actualFromEmail,
              subscriber.email,
              subject,
              recipientHtml
            )

            if (result.success) {
              emailsSent++
            } else {
              emailsFailed++
              errors.push(`${subscriber.email}: ${result.error || 'Unknown error'} (accountId: ${accountId}, fromEmail: ${actualFromEmail})`)
            }
          } catch (error: any) {
            emailsFailed++
            errors.push(`${subscriber.email}: ${error.message || 'Unknown error'}`)
          }
        })
      )

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
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
