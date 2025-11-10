import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface RateLimitStore {
  [ip: string]: {
    count: number
    resetTime: number
  }
}

// In-memory rate limit store (for serverless, consider using Redis/Vercel KV for production)
const rateLimitStore: RateLimitStore = {}

// Rate limiting: 3 signups per hour per IP
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
    : req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown'
  return ip as string
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore[ip]

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore[ip] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    }
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    }
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - record.count,
    resetTime: record.resetTime
  }
}

async function verifyRecaptcha(token: string, secretKey: string): Promise<boolean> {
  if (!token || !secretKey) {
    return false
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data = await response.json()
    return data.success === true && data.score >= 0.5 // Score threshold for v3
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return false
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, recaptchaToken, honeypot } = req.body

  // 1. Honeypot check - if filled, it's definitely a bot
  if (honeypot && honeypot.trim() !== '') {
    console.warn('Bot detected via honeypot:', { email, ip: getClientIP(req) })
    // Return success to avoid revealing the honeypot
    return res.status(200).json({ 
      success: true, 
      message: 'Successfully signed up! We\'ll keep you updated.' 
    })
  }

  // 2. Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' })
  }

  // 3. Rate limiting
  const clientIP = getClientIP(req)
  const rateLimit = checkRateLimit(clientIP)
  
  if (!rateLimit.allowed) {
    const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000)
    return res.status(429).json({ 
      error: `Too many requests. Please try again in ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''}.` 
    })
  }

  // 4. reCAPTCHA verification (if token provided)
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
  if (recaptchaSecret && recaptchaToken) {
    const recaptchaValid = await verifyRecaptcha(recaptchaToken, recaptchaSecret)
    if (!recaptchaValid) {
      console.warn('reCAPTCHA verification failed:', { email, ip: clientIP })
      return res.status(400).json({ 
        error: 'Verification failed. Please try again.' 
      })
    }
  } else if (recaptchaSecret && !recaptchaToken) {
    // If reCAPTCHA is configured but no token provided, reject
    console.warn('Missing reCAPTCHA token:', { email, ip: clientIP })
    return res.status(400).json({ 
      error: 'Verification required. Please refresh and try again.' 
    })
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
          <p><strong>IP:</strong> ${clientIP}</p>
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
