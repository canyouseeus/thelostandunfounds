/**
 * One-time script to send welcome emails to newsletter subscribers
 * who never received one (welcome_email_sent_at IS NULL).
 * 
 * Usage: npx tsx scripts/send-missing-welcome-emails.ts
 * 
 * Flow:
 * - Attempts to send via Zoho Mail (1 per 1000ms delay)
 * - If Zoho fails (e.g. rate limit / unusual activity), falls back to Resend API
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN
const ZOHO_FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'THE LOST+UNFOUNDS <noreply@thelostandunfounds.com>'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Zoho helpers ──

async function getZohoAccessToken(): Promise<string> {
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Missing Zoho credentials')
  }
  const resp = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!resp.ok) throw new Error(`Zoho token refresh failed: ${resp.status} ${await resp.text()}`)
  const data = await resp.json()
  return data.access_token
}

async function getZohoAccountInfo(accessToken: string) {
  const resp = await fetch('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  })
  if (!resp.ok) throw new Error(`Failed to get Zoho accounts: ${resp.status}`)
  const data = await resp.json()
  if (!data.data?.[0]) throw new Error('No Zoho mail accounts found')
  const account = data.data[0]
  const accountId = account.accountId || account.account_id

  let email = ZOHO_FROM_EMAIL!
  if (typeof account.emailAddress === 'string' && account.emailAddress.includes('@')) {
    email = account.emailAddress
  } else if (typeof account.email === 'string' && account.email.includes('@')) {
    email = account.email
  }
  return { accountId, email }
}

async function sendZohoEmail(
  accessToken: string,
  accountId: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  const resp = await fetch(`https://mail.zoho.com/api/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fromAddress: fromEmail,
      toAddress: toEmail,
      subject,
      content: html,
      mailFormat: 'html',
    }),
  })

  if (!resp.ok) {
    const errorText = await resp.text()
    let msg = `Zoho send failed: ${resp.status}`
    try {
      const j = JSON.parse(errorText)
      msg = j.data?.moreInfo || j.status?.description || msg
    } catch { }
    return { success: false, error: msg }
  }
  return { success: true }
}

// ── Resend helpers ──

async function sendResendEmail(
  toEmail: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'Resend API key missing' }
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: toEmail,
      subject: subject,
      html: html,
    }),
  })

  const data = await resp.json()

  if (!resp.ok) {
    return {
      success: false,
      error: data.message || data.error?.message || `Resend error: ${resp.status}`
    }
  }

  return { success: true }
}

// ── Welcome email HTML ──

function generateWelcomeHtml(email: string): string {
  const currentYear = new Date().getFullYear()
  const unsubscribeUrl = `https://www.thelostandunfounds.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background-color: #000000 !important; margin: 0 !important; padding: 0 !important; }
    table { background-color: #000000 !important; }
    td { background-color: #000000 !important; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #000000 !important; font-family: Arial, sans-serif;">
  <table role="presentation" style="width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important; background-color: #000000 !important;">
        <table role="presentation" style="max-width: 600px !important; width: 100% !important; border-collapse: collapse !important; background-color: #000000 !important; margin: 0 auto !important;">
          <!-- Branding Header -->
          <tr>
            <td align="left" style="padding: 0 0 30px 0; background-color: #000000 !important;">
              <img src="https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block;">
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 !important; color: #ffffff !important; background-color: #000000 !important;">
              <h1 style="color: #ffffff !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; text-align: center; letter-spacing: 0.1em; background-color: #000000 !important;">
                CAN YOU SEE US?
              </h1>
              <h2 style="color: #ffffff !important; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center; background-color: #000000 !important;">
                Thanks for subscribing!
              </h2>
              <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: center; background-color: #000000 !important;">
                We're excited to have you join THE LOST+UNFOUNDS community.
              </p>
              <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0; text-align: center; background-color: #000000 !important;">
                You'll receive updates about:
              </p>
              <ul style="color: #ffffff !important; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 0; list-style: none; text-align: center; background-color: #000000 !important;">
                <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">New tools and features</li>
                <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">Platform updates</li>
                <li style="margin: 10px 0; color: #ffffff !important; background-color: #000000 !important;">Special announcements</li>
              </ul>
              <p style="color: #ffffff !important; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center; background-color: #000000 !important;">
                Stay tuned for what's coming next!
              </p>
              <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0; background-color: #000000 !important;">
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 0; text-align: center; background-color: #000000 !important;">
                If you didn't sign up for this newsletter, you can safely ignore this email.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 20px 0 10px 0; text-align: center; background-color: #000000 !important;">
                © ${currentYear} THE LOST+UNFOUNDS. All rights reserved.
              </p>
              <p style="color: rgba(255, 255, 255, 0.6) !important; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: center; background-color: #000000 !important;">
                <a href="${unsubscribeUrl}" style="color: rgba(255, 255, 255, 0.6) !important; text-decoration: underline;">Unsubscribe from this newsletter</a>
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

// ── Main ──

async function main() {
  console.log('=== Send Missing Welcome Emails (with Fallback) ===\n')

  // 1. Get subscribers missing welcome emails
  const { data: missing, error } = await supabase
    .from('newsletter_subscribers')
    .select('id, email, subscribed_at')
    .eq('verified', true)
    .is('welcome_email_sent_at', null)
    .order('subscribed_at', { ascending: true })

  if (error) {
    console.error('Failed to query subscribers:', error.message)
    process.exit(1)
  }

  if (!missing || missing.length === 0) {
    console.log('✅ All verified subscribers have received welcome emails!')
    return
  }

  console.log(`Found ${missing.length} subscribers missing welcome emails.\n`)

  let zohoAccessToken = null
  let zohoAccountId = null
  let zohoFromEmail = null

  try {
    console.log('Authenticating with Zoho...')
    zohoAccessToken = await getZohoAccessToken()
    const info = await getZohoAccountInfo(zohoAccessToken)
    zohoAccountId = info.accountId
    zohoFromEmail = info.email
    console.log(`Zoho integrated: ${zohoAccountId} (${zohoFromEmail})\n`)
  } catch (e: any) {
    console.warn(`Zoho auth failed: ${e.message}. Will use Resend only. \n`)
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Fallback will not work.\n')
  }

  let sent = 0
  let failed = 0
  const failures: { email: string; error: string }[] = []

  for (let i = 0; i < missing.length; i++) {
    const sub = missing[i]
    const progress = `[${i + 1}/${missing.length}]`
    const html = generateWelcomeHtml(sub.email)
    const subject = 'Welcome to THE LOST+UNFOUNDS'

    let success = false
    let errorMsg = ''

    // 1. Try Zoho if available
    if (zohoAccessToken && zohoAccountId && zohoFromEmail) {
      try {
        const zResult = await sendZohoEmail(zohoAccessToken, zohoAccountId, zohoFromEmail, sub.email, subject, html)
        if (zResult.success) {
          success = true
          console.log(`${progress} ✅ [Zoho] ${sub.email}`)
        } else {
          errorMsg = zResult.error || 'Zoho generic error'
          console.log(`${progress} ⚠️ [Zoho] Failed for ${sub.email}: ${errorMsg}. Falling back to Resend...`)
        }
      } catch (err: any) {
        errorMsg = err.message
        console.log(`${progress} ⚠️ [Zoho] Err for ${sub.email}: ${err.message}. Falling back to Resend...`)
      }
    }

    // 2. Try Resend if Zoho failed or wasn't available
    if (!success && RESEND_API_KEY) {
      try {
        const rResult = await sendResendEmail(sub.email, subject, html)
        if (rResult.success) {
          success = true
          console.log(`${progress} ✅ [Resend] ${sub.email}`)
        } else {
          errorMsg = rResult.error || 'Resend generic error'
        }
      } catch (err: any) {
        errorMsg = err.message
      }
    }

    if (success) {
      // Mark as sent in DB
      await supabase
        .from('newsletter_subscribers')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', sub.id)
      sent++
    } else {
      failed++
      failures.push({ email: sub.email, error: errorMsg || 'All providers failed' })
      console.log(`${progress} ❌ ${sub.email}: ${errorMsg || 'All providers failed'}`)
    }

    // Rate limit: 1200ms delay to help avoid aggressive limits
    if (i < missing.length - 1) {
      await new Promise(r => setTimeout(r, 1200))
    }
  }

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Sent: ${sent}`)
  console.log(`Failed: ${failed}`)
  if (failures.length > 0) {
    console.log('\nFailed emails:')
    failures.forEach(f => console.log(`  - ${f.email}: ${f.error}`))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
