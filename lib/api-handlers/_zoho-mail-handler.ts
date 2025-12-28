/**
 * Zoho Mail API Handler
 * Full webmail functionality: folders, messages, send, search, attachments
 *
 * IMPORTANT:
 * This file is fully self-contained to avoid Vercel / serverless bundler issues.
 * Do NOT add cross-file imports unless absolutely necessary.
 */

/* ============================================================================
   INLINED EMAIL TEMPLATE (NO EXTERNAL IMPORTS)
   ============================================================================ */

const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  website: 'https://thelostandunfounds.com',
  supportEmail: 'support@thelostandunfounds.com',
};

function wrapEmailContent(
  htmlContent: string,
  options?: {
    includeUnsubscribe?: boolean;
    includeFooter?: boolean;
  }
): string {
  const includeFooter = options?.includeFooter !== false;
  const includeUnsubscribe = options?.includeUnsubscribe !== false;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        background-color: #000;
        color: #fff;
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
      }
      a {
        color: #fff;
        text-decoration: underline;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 24px;
      }
      .footer {
        margin-top: 48px;
        font-size: 12px;
        opacity: 0.7;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      ${htmlContent}
      ${includeFooter
      ? `<div class="footer">© ${new Date().getFullYear()} ${BRAND.name}</div>`
      : ''
    }
    </div>
  </body>
</html>
`;
}

/* ============================================================================
   ZOHO CONSTANTS & HELPERS
   ============================================================================ */

const ZOHO_MAIL_API = 'https://mail.zoho.com/api/accounts';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts';

// Inline SVG banner to avoid remote image failures
const BANNER_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='50%25' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>";

// Rate limit helper (Zoho is sensitive)
let lastApiCall = 0;
async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const delta = now - lastApiCall;
  if (delta < 200) {
    await new Promise(r => setTimeout(r, 200 - delta));
  }
  lastApiCall = Date.now();
  return fetch(url, options);
}

/* ============================================================================
   AUTH (INLINED — NO SHARED IMPORTS)
   ============================================================================ */

export interface ZohoAuthContext {
  accessToken: string;
  accountId: string;
  fromEmail: string;
}

interface ZohoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

function getZohoEnv() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const fromEmail = process.env.ZOHO_FROM_EMAIL || process.env.ZOHO_EMAIL;

  if (!clientId || !clientSecret || !refreshToken || !fromEmail) {
    throw new Error('Zoho Mail environment variables are not configured');
  }

  return { clientId, clientSecret, refreshToken, fromEmail };
}

export function ensureBannerHtml(htmlContent: string): string {
  return wrapEmailContent(htmlContent, {
    includeUnsubscribe: false,
    includeFooter: false,
  });
}

async function getZohoAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getZohoEnv();

  const response = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Zoho token: ${await response.text()}`);
  }

  const data: ZohoTokenResponse = await response.json();
  return data.access_token;
}

async function getZohoAccountInfo(accessToken: string, fallbackEmail: string) {
  try {
    const response = await fetch(ZOHO_ACCOUNTS_URL, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (response.ok) {
      const json = await response.json();
      const account = json?.data?.[0] || json?.accounts?.[0];
      if (account?.accountId) {
        return {
          accountId: String(account.accountId),
          email: account.emailAddress || fallbackEmail,
        };
      }
    }
  } catch {
    // Silent fallback
  }

  return {
    accountId: fallbackEmail.split('@')[0],
    email: fallbackEmail,
  };
}

export async function getZohoAuthContext(): Promise<ZohoAuthContext> {
  const { fromEmail } = getZohoEnv();
  const accessToken = await getZohoAccessToken();
  const accountInfo = await getZohoAccountInfo(accessToken, fromEmail);

  return {
    accessToken,
    accountId: accountInfo.accountId,
    fromEmail: accountInfo.email,
  };
}

/* ============================================================================
   TYPES
   ============================================================================ */

export interface MailFolder {
  folderId: string;
  folderName: string;
  folderPath: string;
  unreadCount: number;
  messageCount: number;
  folderType: string;
}

export interface MailMessage {
  messageId: string;
  folderId: string;
  from: string;
  fromAddress: string;
  to: string;
  toAddress: string;
  subject: string;
  receivedTime: number;
  hasAttachment: boolean;
  isRead: boolean;
  isStarred: boolean;
  summary?: string;
}

/* ============================================================================
   NOTE
   ============================================================================
   If you later want to re-share email templates across handlers, we must move
   them into THIS file or a single explicitly bundled module.
   Do not reintroduce ../email-template imports.
   ============================================================================
*/
