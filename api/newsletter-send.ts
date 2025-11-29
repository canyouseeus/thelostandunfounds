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
      // Try to get the actual email from the account response
      const accountEmail = account.emailAddress || account.email || account.accountName || fallbackEmail
      
      if (accountId) {
        return { accountId, email: accountEmail }
      }
    }
  }

  // Fallback: extract account ID from email
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
          content_html: contentHtml,
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
          content_html: contentHtml,
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
      actualFromEmail = accountInfo.email
      
      // Log the email being used for debugging
      console.log('Zoho account info:', {
        accountId,
        configuredEmail: fromEmail,
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

    // Send emails in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const result = await sendZohoEmail(
              accessToken,
              accountId,
              actualFromEmail,
              subscriber.email,
              subject,
              contentHtml
            )

            if (result.success) {
              emailsSent++
            } else {
              emailsFailed++
              errors.push(`${subscriber.email}: ${result.error || 'Unknown error'}`)
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
