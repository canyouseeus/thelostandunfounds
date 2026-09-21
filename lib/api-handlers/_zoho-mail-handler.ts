/**
 * Zoho Mail API Handler
 * Full webmail functionality: folders, messages, send, search, attachments
 */

import { getZohoAuthContext, ensureBannerHtml } from './_zoho-email-utils.js';

export type { ZohoAuthContext } from './_zoho-email-utils.js';
export { getZohoAuthContext } from './_zoho-email-utils.js';

const ZOHO_MAIL_API = 'https://mail.zoho.com/api/accounts';

// Outbound mail sends as media@ — the business address of record, and the
// address correspondence is CC'd to. The Zoho OAuth account is still admin@
// (that's what auth.accountId resolves), but the visible From is media@ so a
// recipient replying to a booking, quote or inquiry lands in the media inbox
// rather than the admin one. Matches the booking flow, which has sent as
// media@ since it was written — see FROM_EMAIL in _booking-payment-utils.ts.
const MEDIA_FROM_EMAIL = 'media@thelostandunfounds.com';

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
  /** Override the sender. Defaults to MEDIA_FROM_EMAIL — see the constant. */
  from?: string;
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
      return { success: false, error: `Failed to fetch folders: ${response.status} - ${errorText.slice(0, 200)}` };
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

    let url = `${ZOHO_MAIL_API}/${auth.accountId}/messages/${encodeURIComponent(messageId)}/content`;
    if (folderId) {
      url = `${ZOHO_MAIL_API}/${auth.accountId}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/content`;
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
      console.error('Zoho message content API error:', response.status, errorText);
      return { success: false, error: `Failed to fetch message: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const m = data.data || data;

    const message: MailMessageFull = {
      // Prefer the requested IDs (exact strings) over Zoho's response fields —
      // Zoho returns these as unquoted JSON numbers, and IDs this large
      // (e.g. 1783136480784158500) exceed Number.MAX_SAFE_INTEGER and get
      // silently rounded by JSON.parse.
      messageId: messageId || m.messageId || m.message_id,
      folderId: folderId || m.folderId || m.folder_id || '',
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
      fromAddress: params.from || MEDIA_FROM_EMAIL,
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
  attachmentId: string,
  folderId?: string
): Promise<{ success: boolean; content?: ArrayBuffer; contentType?: string; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    // Inline images (cid: references in the body) are not reachable on the
    // flat /messages/:id/attachments/:attId form — that 404s. Zoho only serves
    // them from the folder-scoped path, so use it whenever we know the folder.
    const url = folderId
      ? `${ZOHO_MAIL_API}/${auth.accountId}/folders/${folderId}/messages/${messageId}/attachments/${attachmentId}`
      : `${ZOHO_MAIL_API}/${auth.accountId}/messages/${messageId}/attachments/${attachmentId}`;

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
 * List every part Zoho holds for a message, including inline images that never
 * appear in the message's `attachments` array. This is what makes a cid: image
 * in the body downloadable — the body only gives you the cid, this gives you
 * the attachmentId to fetch it with.
 */
export async function getAttachmentInfo(
  messageId: string,
  folderId: string
): Promise<{ success: boolean; attachments?: MailAttachment[]; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const url = `${ZOHO_MAIL_API}/${auth.accountId}/folders/${folderId}/messages/${messageId}/attachmentinfo`;

    const response = await rateLimitedFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${auth.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho attachmentinfo API error:', response.status, errorText);
      return { success: false, error: `Failed to get attachment info: ${response.status}` };
    }

    const json = await response.json();
    const raw = json?.data?.attachments || json?.data || [];
    const list = Array.isArray(raw) ? raw : [];

    const attachments: MailAttachment[] = list.map((a: any) => ({
      attachmentId: String(a.attachmentId || a.attachment_id || a.id || a.index || ''),
      attachmentName: a.attachmentName || a.attachment_name || a.name || '',
      attachmentSize: parseInt(a.attachmentSize || a.attachment_size || a.size || '0', 10),
      contentType: a.contentType || a.content_type || a.type || 'application/octet-stream'
    }));

    return { success: true, attachments };
  } catch (error: any) {
    console.error('Error fetching attachment info:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Fetch the raw source of a message, so an inline (cid:) image can be pulled
 * out of the MIME tree directly.
 *
 * Zoho's path for this is not consistent across accounts — the folder-scoped
 * `originalmessage` 404s on this one — so try the known variants in order and
 * report which answered. `probe` returns the per-candidate status instead of
 * the body, which is what makes this diagnosable without a deploy per guess.
 */
export async function getOriginalMessage(
  messageId: string,
  folderId: string,
  probe = false
): Promise<{ success: boolean; raw?: string; via?: string; probes?: any[]; error?: string }> {
  try {
    const auth = await getZohoAuthContext();
    const base = `${ZOHO_MAIL_API}/${auth.accountId}`;

    const candidates = [
      `${base}/folders/${folderId}/messages/${messageId}/originalmessage`,
      `${base}/messages/${messageId}/originalmessage`,
      `${base}/folders/${folderId}/messages/${messageId}/originalMessage`,
      `${base}/messages/${messageId}/originalMessage`,
      `${base}/folders/${folderId}/messages/${messageId}/attachmentinfo`,
      `${base}/messages/${messageId}/attachmentinfo`,
      `${base}/folders/${folderId}/messages/${messageId}/content?includeInlineImage=true`,
      `${base}/messages/${messageId}/message/attachments?inline=true`
    ];

    const probes: any[] = [];

    for (const url of candidates) {
      const response = await rateLimitedFetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Zoho-oauthtoken ${auth.accessToken}` }
      });

      const text = response.ok ? await response.text() : await response.text().catch(() => '');

      probes.push({
        url: url.replace(base, ''),
        status: response.status,
        bytes: text.length,
        preview: text.slice(0, 180)
      });

      if (response.ok && text.length > 0) {
        if (probe) continue;

        let raw = text;
        try {
          const json = JSON.parse(text);
          raw = json?.data?.content || json?.data?.originalMessage || json?.data || text;
          if (typeof raw !== 'string') raw = JSON.stringify(json);
        } catch {
          // bare MIME, use as-is
        }
        return { success: true, raw, via: url.replace(base, '') };
      }
    }

    if (probe) return { success: true, probes };

    return { success: false, error: 'No original-message endpoint answered', probes };
  } catch (error: any) {
    console.error('Error fetching original message:', error);
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
      fromAddress: MEDIA_FROM_EMAIL,
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
