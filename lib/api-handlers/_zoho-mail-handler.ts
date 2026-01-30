/**
 * Zoho Mail API Handler
 * Full webmail functionality: folders, messages, send, search, attachments
 * 
 * NOTE: Auth helpers are inlined to avoid Vercel bundler issues with cross-file imports
 */

// Branding and template helpers (inlined to avoid Vercel bundler issues)
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (e) { }

const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  logo: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png',
  website: 'https://www.thelostandunfounds.com',
  colors: {
    background: '#000000',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    link: 'rgba(255, 255, 255, 0.9)',
  },
};

function getUnsubscribeUrl(email: string): string {
  return `${BRAND.website}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
}

function wrapEmailContent(
  bodyContent: string,
  options: {
    subscriberEmail?: string;
    includeUnsubscribe?: boolean;
    includeFooter?: boolean;
  } = {}
): string {
  const {
    subscriberEmail = '',
    includeUnsubscribe = true,
    includeFooter = true,
  } = options;

  const currentYear = new Date().getFullYear();
  const unsubscribeUrl = subscriberEmail ? getUnsubscribeUrl(subscriberEmail) : '#';

  const footerHtml = includeFooter ? `
              <hr style="border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;">
              <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left;">
                © ${currentYear} ${BRAND.name}. All rights reserved.
              </p>
              ${includeUnsubscribe && subscriberEmail ? `
              <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                <a href="${unsubscribeUrl}" style="color: ${BRAND.colors.textMuted}; text-decoration: underline;">Unsubscribe from this newsletter</a>
              </p>
              ` : ''}
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.name}</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { background-color: ${BRAND.colors.background} !important; margin: 0 !important; padding: 0 !important; font-family: Arial, Helvetica, sans-serif; color: ${BRAND.colors.text}; }
    table { background-color: ${BRAND.colors.background} !important; border-collapse: collapse !important; }
    td { background-color: ${BRAND.colors.background} !important; }
    a { color: ${BRAND.colors.link}; }
    h1, h2, h3, h4, h5, h6 { color: ${BRAND.colors.text} !important; font-family: Arial, Helvetica, sans-serif; margin: 0 0 20px 0; }
    p { color: ${BRAND.colors.text} !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: ${BRAND.colors.background} !important; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100% !important; border-collapse: collapse !important; background-color: ${BRAND.colors.background} !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px !important; background-color: ${BRAND.colors.background} !important;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px !important; width: 100% !important; background-color: ${BRAND.colors.background} !important; margin: 0 auto !important;">
          <tr>
            <td align="left" style="padding: 0 0 30px 0 !important;">
              <a href="${BRAND.website}" target="_blank">
                <img src="${BRAND.logo}" alt="${BRAND.name}" style="max-width: 100%; height: auto; display: block;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 !important; color: ${BRAND.colors.text} !important;">
              ${bodyContent}
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


const ZOHO_MAIL_API = 'https://mail.zoho.com/api/accounts';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.com/api/accounts';

// Inline SVG banner to avoid remote fetch failures in email clients
const BANNER_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='400'><rect width='100%25' height='100%25' fill='%23000'/><text x='50%25' y='50%25' fill='%23fff' font-family='Arial, sans-serif' font-size='48' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>THE LOST+UNFOUNDS</text></svg>";

// Rate limit helper - 200ms delay between calls
let lastApiCall = 0;
async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastCall));
  }
  lastApiCall = Date.now();
  return fetch(url, options);
}

// ============================================================================
// INLINED AUTH HELPERS (from _zoho-email-utils.ts to avoid bundler issues)
// ============================================================================

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
  // Use centralized email template for consistency
  return wrapEmailContent(htmlContent, {
    includeUnsubscribe: false,
    includeFooter: false,
  });
}

// Cache token in memory to avoid hitting rate limits
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getZohoAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  const { clientId, clientSecret, refreshToken } = getZohoEnv();

  const response = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Zoho token: ${response.status} ${errorText}`);
  }

  const data: ZohoTokenResponse = await response.json();

  cachedAccessToken = data.access_token;
  // expires_in is in seconds. Convert to ms and subtract 60s buffer
  tokenExpiryTime = Date.now() + ((data.expires_in - 60) * 1000);

  return data.access_token;
}

async function getZohoAccountInfo(accessToken: string, fallbackEmail: string) {
  try {
    const response = await fetch(ZOHO_ACCOUNTS_URL, {
      method: 'GET',
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
    });

    if (response.ok) {
      const json = await response.json();
      const account = json?.data?.[0] || json?.accounts?.[0];

      if (account) {
        console.log('[Zoho Auth] Found Account:', account);
        const accountId =
          account.accountId ||
          account.account_id ||
          account.accountID ||
          account.accountid ||
          account.accountid_zuid ||
          account.accountName ||
          account.account_name;

        let accountEmail = fallbackEmail;
        if (typeof account.emailAddress === 'string') {
          accountEmail = account.emailAddress;
        } else if (typeof account.email === 'string') {
          accountEmail = account.email;
        } else if (typeof account.accountName === 'string') {
          accountEmail = account.accountName;
        }

        if (accountId) {
          return { accountId: String(accountId), email: accountEmail };
        }
      }
    }
  } catch (error) {
    console.warn('Zoho account lookup failed, falling back to derived account id', error);
  }

  const fallbackAccountId = fallbackEmail.split('@')[0];
  console.log(`[Zoho Auth] Using fallback Account ID: ${fallbackAccountId}`);
  return { accountId: fallbackAccountId, email: fallbackEmail };
}

export async function getZohoAuthContext(): Promise<ZohoAuthContext> {
  const { fromEmail } = getZohoEnv();
  const accessToken = await getZohoAccessToken();
  const accountInfo = await getZohoAccountInfo(accessToken, fromEmail);

  return {
    accessToken,
    accountId: accountInfo.accountId,
    fromEmail: accountInfo.email || fromEmail
  };
}

// ============================================================================
// MAIL TYPES
// ============================================================================

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
  cc?: string;
  bcc?: string;
  subject: string;
  receivedTime: number;
  sentDateInGMT?: number;
  hasAttachment: boolean;
  isRead: boolean;
  isStarred: boolean;
  summary?: string;
  size?: number;
}

export interface MailMessageFull extends MailMessage {
  content: string;
  htmlContent?: string;
  attachments?: MailAttachment[];
  headers?: Record<string, string>;
}

export interface MailAttachment {
  attachmentId: string;
  attachmentName: string;
  attachmentSize: number;
  contentType: string;
}

export interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  content: string;
  isHtml?: boolean;
  attachments?: Array<{
    name: string;
    content: string;
    contentType: string;
  }>;
  inReplyTo?: string;
}

export interface SearchParams {
  query: string;
  folderId?: string;
  limit?: number;
  start?: number;
}

// ============================================================================
// MAIL API FUNCTIONS
// ============================================================================

/**
 * Get all mail folders (Inbox, Sent, Drafts, Trash, etc.)
 */
export async function getFolders(): Promise<{ success: boolean; folders?: MailFolder[]; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/folders`;

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho folders API error:', response.status, errorText);
      return { success: false, error: `Failed to fetch folders: ${response.status}` };
    }

    const data = await response.json();
    const folders: MailFolder[] = (data.data || []).map((f: any) => ({
      folderId: f.folderId || f.folder_id,
      folderName: f.folderName || f.folder_name || f.name,
      folderPath: f.folderPath || f.folder_path || f.path || '',
      unreadCount: parseInt(f.unreadCount || f.unread_count || '0', 10),
      messageCount: parseInt(f.messageCount || f.message_count || '0', 10),
      folderType: f.folderType || f.folder_type || 'custom'
    }));

    return { success: true, folders };
  } catch (error: any) {
    console.error('Error fetching folders:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get messages from a folder with pagination
 */
export async function getMessages(
  folderId: string,
  limit: number = 50,
  start: number = 0
): Promise<{ success: boolean; messages?: MailMessage[]; total?: number; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/view?folderId=${folderId}&limit=${limit}&start=${start}`;

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho messages API error:', response.status, errorText);
      return { success: false, error: `Failed to fetch messages: ${response.status}` };
    }

    const data = await response.json();
    const messages: MailMessage[] = (data.data || []).map((m: any) => ({
      messageId: m.messageId || m.message_id,
      folderId: m.folderId || m.folder_id || folderId,
      from: m.fromAddress || m.from_address || m.sender || '',
      fromAddress: m.fromAddress || m.from_address || '',
      to: m.toAddress || m.to_address || '',
      toAddress: m.toAddress || m.to_address || '',
      cc: m.ccAddress || m.cc_address || '',
      bcc: m.bccAddress || m.bcc_address || '',
      subject: m.subject || '(No Subject)',
      receivedTime: parseInt(m.receivedTime || m.received_time || '0', 10),
      sentDateInGMT: m.sentDateInGMT ? parseInt(m.sentDateInGMT, 10) : undefined,
      hasAttachment: m.hasAttachment === true || m.has_attachment === true || m.hasAttachment === 'true',
      isRead: m.flagid === '0' || m.isRead === true || m.is_read === true,
      isStarred: m.flagid === '1' || m.isStarred === true || m.is_starred === true,
      summary: m.summary || m.snippet || '',
      size: parseInt(m.size || '0', 10)
    }));

    return {
      success: true,
      messages,
      total: data.data?.length || messages.length
    };
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get full message content including attachments
 */
export async function getMessage(
  messageId: string,
  folderId?: string
): Promise<{ success: boolean; message?: MailMessageFull; error?: string }> {
  try {
    const auth = await getZohoAuthContext();

    // Use folder-specific endpoint if available (more reliable for some accounts)
    let url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${encodeURIComponent(messageId)}/content`;
    if (folderId) {
      url = `${ZOHO_MAIL_API}/${auth.accountId}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/content`;
    }

    const logMsg = `[${new Date().toISOString()}] Fetching message content from: ${url} (AccountID: ${auth.accountId})\n`;
    console.log(logMsg);
    try {
      const fs = await import('fs');
      const logPath = path.join(process.cwd(), 'public', 'mail-debug.log');
      fs.appendFileSync(logPath, logMsg);
    } catch (e) { console.error('Failed to write log', e); }

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho message content API error:', response.status, errorText);
      return { success: false, error: `Failed to fetch message: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const m = data.data || data;

    const message: MailMessageFull = {
      messageId: m.messageId || m.message_id || messageId,
      folderId: m.folderId || m.folder_id || '',
      from: m.fromAddress || m.from_address || m.sender || '',
      fromAddress: m.fromAddress || m.from_address || '',
      to: m.toAddress || m.to_address || '',
      toAddress: m.toAddress || m.to_address || '',
      cc: m.ccAddress || m.cc_address || '',
      bcc: m.bccAddress || m.bcc_address || '',
      subject: m.subject || '(No Subject)',
      receivedTime: parseInt(m.receivedTime || m.received_time || '0', 10),
      sentDateInGMT: m.sentDateInGMT ? parseInt(m.sentDateInGMT, 10) : undefined,
      hasAttachment: m.hasAttachment === true || m.has_attachment === true,
      isRead: true,
      isStarred: m.isStarred === true || m.is_starred === true,
      content: m.content || '',
      htmlContent: m.htmlContent || m.html_content || m.content || '',
      attachments: (m.attachments || m.attachmentList || []).map((a: any) => ({
        attachmentId: a.attachmentId || a.attachment_id || a.id,
        attachmentName: a.attachmentName || a.attachment_name || a.name,
        attachmentSize: parseInt(a.attachmentSize || a.attachment_size || a.size || '0', 10),
        contentType: a.contentType || a.content_type || a.mimeType || 'application/octet-stream'
      }))
    };

    return { success: true, message };
  } catch (error: any) {
    console.error('Error fetching message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Send an email
 */
export async function sendMessage(
  params: SendEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages`;

    const body: any = {
      fromAddress: auth.fromEmail,
      toAddress: params.to,
      subject: params.subject,
      content: params.isHtml !== false ? ensureBannerHtml(params.content) : params.content,
      mailFormat: params.isHtml !== false ? 'html' : 'plaintext'
    };

    if (params.cc) body.ccAddress = params.cc;
    if (params.bcc) body.bccAddress = params.bcc;
    if (params.inReplyTo) body.inReplyTo = params.inReplyTo;

    if (params.attachments && params.attachments.length > 0) {
      body.attachments = params.attachments.map(a => ({
        attachmentName: a.name,
        attachmentData: a.content,
        mimeType: a.contentType
      }));
    }

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho send API error:', response.status, errorText);
      return { success: false, error: `Failed to send email: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.data?.messageId || data.messageId
    };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Move a message to a different folder
 */
export async function moveMessage(
  messageId: string,
  targetFolderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}/move`;

    const response = await rateLimitedFetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ destfolderId: targetFolderId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho move API error:', response.status, errorText);
      return { success: false, error: `Failed to move message: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error moving message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a message (move to trash or permanent delete)
 */
export async function deleteMessage(
  messageId: string,
  permanent: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getZohoAuthContext();

    if (permanent) {
      const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}`;
      const response = await rateLimitedFetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Zoho-oauthtoken ${auth.accessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Zoho delete API error:', response.status, errorText);
        return { success: false, error: `Failed to delete message: ${response.status}` };
      }
    } else {
      const foldersResult = await getFolders();
      if (!foldersResult.success || !foldersResult.folders) {
        return { success: false, error: 'Could not find trash folder' };
      }

      const trashFolder = foldersResult.folders.find(
        f => f.folderType === 'Trash' || f.folderName.toLowerCase() === 'trash'
      );

      if (!trashFolder) {
        return { success: false, error: 'Trash folder not found' };
      }

      return moveMessage(messageId, trashFolder.folderId);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Search messages
 */
export async function searchMessages(
  params: SearchParams
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const limit = params.limit || 50;
    const start = params.start || 0;

    let url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/search?searchKey=${encodeURIComponent(params.query)}&limit=${limit}&start=${start}`;

    if (params.folderId) {
      url += `&folderId=${params.folderId}`;
    }

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho search API error:', response.status, errorText);
      return { success: false, error: `Failed to search messages: ${response.status}` };
    }

    const data = await response.json();
    const messages: MailMessage[] = (data.data || []).map((m: any) => ({
      messageId: m.messageId || m.message_id,
      folderId: m.folderId || m.folder_id || '',
      from: m.fromAddress || m.from_address || m.sender || '',
      fromAddress: m.fromAddress || m.from_address || '',
      to: m.toAddress || m.to_address || '',
      toAddress: m.toAddress || m.to_address || '',
      cc: m.ccAddress || m.cc_address || '',
      subject: m.subject || '(No Subject)',
      receivedTime: parseInt(m.receivedTime || m.received_time || '0', 10),
      hasAttachment: m.hasAttachment === true || m.has_attachment === true,
      isRead: m.isRead === true || m.is_read === true,
      isStarred: m.isStarred === true || m.is_starred === true,
      summary: m.summary || m.snippet || ''
    }));

    return { success: true, messages };
  } catch (error: any) {
    console.error('Error searching messages:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Get attachment content
 */
export async function getAttachment(
  messageId: string,
  attachmentId: string
): Promise<{ success: boolean; content?: ArrayBuffer; contentType?: string; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}/attachments/${attachmentId}`;

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho attachment API error:', response.status, errorText);
      return { success: false, error: `Failed to get attachment: ${response.status}` };
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return { success: true, content, contentType };
  } catch (error: any) {
    console.error('Error fetching attachment:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Save a draft
 */
export async function saveDraft(
  params: Omit<SendEmailParams, 'attachments'>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages`;

    const body: any = {
      fromAddress: auth.fromEmail,
      toAddress: params.to || '',
      subject: params.subject || '',
      content: params.content || '',
      mailFormat: params.isHtml !== false ? 'html' : 'plaintext',
      mode: 'draft'
    };

    if (params.cc) body.ccAddress = params.cc;
    if (params.bcc) body.bccAddress = params.bcc;

    const response = await rateLimitedFetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho draft API error:', response.status, errorText);
      return { success: false, error: `Failed to save draft: ${response.status}` };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.data?.messageId || data.messageId
    };
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Mark message as read/unread
 */
export async function markAsRead(
  messageId: string,
  isRead: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}/markAs${isRead ? 'Read' : 'Unread'}`;

    const response = await rateLimitedFetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho mark read API error:', response.status, errorText);
      return { success: false, error: `Failed to mark message: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error marking message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Mark message as starred/unstarred
 */
export async function markAsStarred(
  messageId: string,
  isStarred: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}/markAs${isStarred ? 'Star' : 'UnStar'}`;

    const response = await rateLimitedFetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho star API error:', response.status, errorText);
      return { success: false, error: `Failed to star message: ${response.status}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error starring message:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
