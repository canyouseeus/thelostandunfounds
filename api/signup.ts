import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  try {
    // Get Zoho credentials from environment variables
    const clientId = process.env.ZOHO_CLIENT_ID
    const clientSecret = process.env.ZOHO_CLIENT_SECRET
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN
    const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
    const toEmail = process.env.ZOHO_TO_EMAIL || fromEmail // Where to send signup notifications

    if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
      console.error('Missing Zoho credentials:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRefreshToken: !!refreshToken,
        hasFromEmail: !!fromEmail,
      })
      return res.status(500).json({ 
        error: 'Email service not configured. Please contact support.' 
      })
    }

    // Step 1: Get access token using refresh token
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
      console.error('Zoho token error:', errorText)
      return res.status(500).json({ 
        error: 'Failed to authenticate with email service' 
      })
    }

    const tokenData: ZohoTokenResponse = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Step 2: Get account ID from Zoho Mail API
    // First, try to get the account information
    const accountInfoResponse = await fetch('https://mail.zoho.com/api/accounts', {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
      },
    })

    let accountId: string | null = null
    
    if (accountInfoResponse.ok) {
      const accounts = await accountInfoResponse.json()
      if (accounts.data && accounts.data.length > 0) {
        accountId = accounts.data[0].accountId || accounts.data[0].account_id
      }
    }

    // Fallback: extract account ID from email if API call fails
    if (!accountId) {
      // Try to extract from email (format: accountId@domain.com)
      const emailParts = fromEmail.split('@')
      accountId = emailParts[0]
    }

    if (!accountId) {
      console.error('Could not determine account ID')
      return res.status(500).json({ 
        error: 'Failed to determine account information' 
      })
    }

    // Step 3: Send notification email to admin
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
        subject: `New Email Signup: ${email}`,
        content: `
          <h2>New Email Signup</h2>
          <p>A new user has signed up for updates:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        `,
        mailFormat: 'html',
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Zoho mail error:', errorText)
      // Don't fail completely - still return success if notification fails
      // The signup was processed, just notification didn't send
    }

    // Step 4: Optionally send welcome email to user
    // (Uncomment if you want to send welcome emails)
    /*
    const welcomeResponse = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: email,
        subject: 'Welcome to THE LOST+UNFOUNDS',
        content: `
          <h2>Thanks for signing up!</h2>
          <p>We'll keep you updated on new tools and features.</p>
          <p>Stay tuned!</p>
        `,
        mailFormat: 'html',
      }),
    })
    */

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully signed up! We\'ll keep you updated.' 
    })

  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ 
      error: 'An error occurred. Please try again later.' 
    })
  }
}
