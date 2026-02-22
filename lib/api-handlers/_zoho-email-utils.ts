/**
 * Shared Zoho Mail helpers for serverless handlers.
 *
 * NOTE: This utility intentionally mirrors the logic that already exists
 * inside other handlers (token exchange + account lookup), but centralises
 * it so new admin endpoints don't need to duplicate ~100 lines of code.
 */

export interface ZohoAuthContext {
  accessToken: string
  accountId: string
  fromEmail: string
}

export interface ZohoSendEmailParams {
  auth: ZohoAuthContext
  to: string
  subject: string
  htmlContent: string
}

interface ZohoTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts'
// Inline SVG banner to avoid remote fetch failures in email clients
const BANNER_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='20' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='start' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>"

function getZohoEnv() {
  const clientId = process.env.ZOHO_CLIENT_ID
  const clientSecret = process.env.ZOHO_CLIENT_SECRET
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN
  const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL

  if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
    throw new Error('Zoho Mail environment variables are not configured')
  }

  return { clientId, clientSecret, refreshToken, fromEmail }
}

/**
 * Ensure every outgoing email contains the banner and a minimal HTML shell.
 * This keeps headers consistent across all handlers.
 */
export function ensureBannerHtml(htmlContent: string): string {
  const bannerBlock = `
<div style="padding: 0 0 30px 0; background-color: #000000 !important; text-align: left;">
  <a href="https://www.thelostandunfounds.com" style="text-decoration: none;">
    <img src="${BANNER_URL}" alt="THE LOST+UNFOUNDS" style="max-width: 100%; height: auto; display: block; margin: 0;" />
  </a>
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

  // Try to insert after <body>; fallback to prepend.
  const withBodyInsert = insertAfterBody(html)
  if (withBodyInsert) {
    return ensureShell(withBodyInsert)
  }

  return ensureShell(bannerBlock + html)
}

async function getZohoAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getZohoEnv()

  const response = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh Zoho token: ${response.status} ${errorText}`)
  }

  const data: ZohoTokenResponse = await response.json()
  return data.access_token
}

async function getZohoAccountInfo(accessToken: string, fallbackEmail: string) {
  // Check for explicit account ID first
  const envAccountId = process.env.ZOHO_ACCOUNT_ID
  if (envAccountId) {
    console.log('[Zoho] Using explicit ZOHO_ACCOUNT_ID:', envAccountId)
    return { accountId: envAccountId, email: fallbackEmail }
  }

  try {
    const response = await fetch(ZOHO_ACCOUNTS_URL, {
      method: 'GET',
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
    })

    console.log('[Zoho] Accounts API response status:', response.status)

    if (response.ok) {
      const json = await response.json()
      console.log('[Zoho] Accounts API full response:', JSON.stringify(json, null, 2))
      const account = json?.data?.[0] || json?.accounts?.[0]

      if (account) {
        const accountId =
          account.accountId ||
          account.account_id ||
          account.accountID ||
          account.accountid ||
          account.accountid_zuid ||
          account.primaryEmailAddress

        let accountEmail = fallbackEmail
        if (typeof account.emailAddress === 'string') {
          accountEmail = account.emailAddress
        } else if (typeof account.email === 'string') {
          accountEmail = account.email
        } else if (typeof account.primaryEmailAddress === 'string') {
          accountEmail = account.primaryEmailAddress
        } else if (typeof account.accountName === 'string') {
          accountEmail = account.accountName
        }

        if (accountId) {
          console.log('[Zoho] Found account ID:', accountId, 'email:', accountEmail)
          return { accountId: String(accountId), email: accountEmail }
        } else {
          console.warn('[Zoho] Account object exists but no accountId found. Available keys:', Object.keys(account))
        }
      }
    } else {
      const errorText = await response.text()
      console.error('[Zoho] Accounts API error:', response.status, errorText)
    }
  } catch (error) {
    console.warn('[Zoho] Account lookup failed, falling back to derived account id', error)
  }

  // Fallback - this likely won't work
  const fallbackAccountId = fallbackEmail.split('@')[0]
  console.warn('[Zoho] WARN: Using fallback account ID (likely invalid):', fallbackAccountId)
  return { accountId: fallbackAccountId, email: fallbackEmail }
}

export async function getZohoAuthContext(): Promise<ZohoAuthContext> {
  const { fromEmail } = getZohoEnv()
  const accessToken = await getZohoAccessToken()
  const accountInfo = await getZohoAccountInfo(accessToken, fromEmail)

  return {
    accessToken,
    accountId: accountInfo.accountId,
    fromEmail: accountInfo.email || fromEmail
  }
}

export async function sendZohoEmail({
  auth,
  to,
  subject,
  htmlContent
}: ZohoSendEmailParams): Promise<{ success: boolean; error?: string }> {
  const finalHtml = ensureBannerHtml(htmlContent)
  const mailApiUrl = `https://mail.zoho.com/api/accounts/${auth.accountId}/messages`

  const response = await fetch(mailApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${auth.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromAddress: auth.fromEmail,
      toAddress: to,
      subject,
      content: finalHtml,
      mailFormat: 'html'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Zoho email API error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    return { success: false, error: `Failed to send email: ${response.status}` }
  }

  return { success: true }
}
