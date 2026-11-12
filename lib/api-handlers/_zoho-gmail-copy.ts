/**
 * Copy mail from chosen senders out of the Zoho mailbox into the owner's Gmail.
 *
 * Why: the owner's unattended routines can read Gmail but not Zoho, and Zoho's
 * own forwarding filters are on a paid plan only (owner, 2026-11-12). The site
 * already holds a Zoho token that can read the mailbox, so it does the copying.
 *
 * Read-only on Zoho: nothing is moved, marked, tagged or deleted there. The
 * copies go to OWNER_GMAIL and nowhere else.
 *
 * No-repeat guarantee without a table: every copy is sent through Resend with
 * `Idempotency-Key: zoho-gmail-copy/<zoho message id>`. Resend remembers a key
 * for 24 hours and refuses to send it twice in that time. The job only looks at
 * mail received in the last WINDOW_HOURS (< 24), so by the time Resend forgets a
 * key the message is already outside the window and is never picked up again.
 * A run that is late or skipped is covered by the next one, because the window
 * is far wider than the 30-minute schedule.
 *
 * Resend only, deliberately not sendTransactionalEmail: the Zoho path has no
 * idempotency key (so a retry could double-send), and every copy would also
 * land in the Zoho Sent folder next to the owner's real replies.
 */

import { getZohoAuthContext } from './_zoho-email-utils.js';
import { generateTransactionalEmail } from '../email-template.js';

/** Sender domains whose mail is copied. Add more here. */
export const COPY_SENDER_DOMAINS: readonly string[] = ['capitolcrew.com'];

/** Where the copies go: the owner's own Gmail. */
export const OWNER_GMAIL = 'thelostandunfounds@gmail.com';

/** Look-back window. Must stay under Resend's 24h idempotency memory. */
export const WINDOW_HOURS = 20;

const ZOHO_MAIL_API = 'https://mail.zoho.com/api/accounts';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface ZohoListedMessage {
  messageId: string;
  folderId: string;
  fromAddress: string;
  sender: string;
  toAddress: string;
  ccAddress: string;
  subject: string;
  receivedTime: number;
}

export interface CopyResult {
  messageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  outcome: 'copied' | 'already_copied' | 'would_copy' | 'failed';
  resendId?: string;
  error?: string;
}

/**
 * Zoho returns message and folder ids as bare JSON numbers that exceed
 * Number.MAX_SAFE_INTEGER, so JSON.parse rounds them and the rounded id points
 * at nothing. Quote every long run of digits on an id field before parsing.
 */
function parseZohoJson(text: string): any {
  const quoted = text.replace(
    /"(messageId|folderId|threadId|message_id|folder_id)"\s*:\s*(\d{15,})/g,
    '"$1":"$2"'
  );
  return JSON.parse(quoted);
}

function domainOf(address: string): string {
  const m = (address || '').toLowerCase().match(/@([a-z0-9.-]+)/);
  return m ? m[1] : '';
}

export function isCopiedSender(address: string): boolean {
  const d = domainOf(address);
  return COPY_SENDER_DOMAINS.some((want) => d === want || d.endsWith(`.${want}`));
}

function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toListed(m: any, fallbackFolderId = ''): ZohoListedMessage {
  return {
    messageId: String(m.messageId ?? m.message_id ?? ''),
    folderId: String(m.folderId ?? m.folder_id ?? fallbackFolderId ?? ''),
    fromAddress: decodeEntities(String(m.fromAddress ?? m.from_address ?? '')),
    sender: decodeEntities(String(m.sender ?? '')),
    toAddress: decodeEntities(String(m.toAddress ?? m.to_address ?? '')),
    ccAddress: decodeEntities(String(m.ccAddress ?? m.cc_address ?? '')),
    subject: decodeEntities(String(m.subject ?? '(No Subject)')),
    receivedTime: parseInt(String(m.receivedTime ?? m.received_time ?? '0'), 10),
  };
}

async function zohoGet(url: string, accessToken: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Zoho ${res.status} on ${url.replace(/\?.*/, '')}: ${text.slice(0, 200)}`);
  }
  return parseZohoJson(text);
}

/** Recent mail from each copied domain, found two ways and merged by id. */
async function findCandidates(
  accountId: string,
  accessToken: string,
  sinceMs: number
): Promise<ZohoListedMessage[]> {
  const byId = new Map<string, ZohoListedMessage>();
  const errors: string[] = [];

  // 1. Search per domain. Covers every folder (a filter could file it away).
  for (const domain of COPY_SENDER_DOMAINS) {
    try {
      const url = `${ZOHO_MAIL_API}/${accountId}/messages/search?searchKey=${encodeURIComponent(
        `sender:${domain}`
      )}&limit=50&start=1`;
      const data = await zohoGet(url, accessToken);
      for (const raw of data.data || []) {
        const m = toListed(raw);
        if (m.messageId) byId.set(m.messageId, m);
      }
    } catch (err: any) {
      errors.push(`search ${domain}: ${err?.message}`);
    }
  }

  // 2. The newest Inbox page, in case search indexing lags behind delivery.
  try {
    const folders = await zohoGet(`${ZOHO_MAIL_API}/${accountId}/folders`, accessToken);
    const inbox = (folders.data || []).find(
      (f: any) => String(f.folderType || f.folder_type || '').toLowerCase() === 'inbox'
    );
    if (inbox) {
      const folderId = String(inbox.folderId ?? inbox.folder_id);
      const data = await zohoGet(
        `${ZOHO_MAIL_API}/${accountId}/messages/view?folderId=${folderId}&limit=50&start=1`,
        accessToken
      );
      for (const raw of data.data || []) {
        const m = toListed(raw, folderId);
        if (m.messageId && !byId.has(m.messageId)) byId.set(m.messageId, m);
      }
    }
  } catch (err: any) {
    errors.push(`inbox: ${err?.message}`);
  }

  if (byId.size === 0 && errors.length > 0) {
    throw new Error(errors.join(' | '));
  }
  if (errors.length > 0) console.warn('[zoho-gmail-copy] partial read:', errors.join(' | '));

  return [...byId.values()]
    .filter((m) => isCopiedSender(m.fromAddress || m.sender))
    .filter((m) => m.receivedTime >= sinceMs)
    .sort((a, b) => a.receivedTime - b.receivedTime);
}

async function getBody(
  accountId: string,
  accessToken: string,
  m: ZohoListedMessage
): Promise<string> {
  const url = m.folderId
    ? `${ZOHO_MAIL_API}/${accountId}/folders/${m.folderId}/messages/${m.messageId}/content`
    : `${ZOHO_MAIL_API}/${accountId}/messages/${m.messageId}/content`;
  const data = await zohoGet(url, accessToken);
  return String((data.data || data).content || '');
}

/** Keep the sender's markup but drop the document wrapper and anything executable. */
function cleanBody(html: string): string {
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(html|body)[^>]*>/gi, '')
    .trim();
}

function formatCentral(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    // dateStyle/timeStyle can't be combined with timeZoneName (throws
    // "Invalid option : option"), so spell the fields out.
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function buildCopyHtml(m: ZohoListedMessage, bodyHtml: string): string {
  const row = (label: string, value: string) =>
    value
      ? `<p style="margin:0 0 6px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
      : '';
  const header = [
    `<p style="margin:0 0 12px 0;">Copied from the Zoho mailbox. Reply from Zoho webmail so the reply comes from admin@.</p>`,
    row('From', m.fromAddress || m.sender),
    row('To', m.toAddress),
    row('Cc', m.ccAddress),
    row('Date', formatCentral(m.receivedTime)),
    row('Subject', m.subject),
  ].join('');
  const body = `<div style="background:#ffffff;color:#000000;padding:16px;margin-top:16px;">${
    cleanBody(bodyHtml) || '<p>(No body)</p>'
  }</div>`;
  return generateTransactionalEmail(`${header}${body}`);
}

function senderAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL || '';
  const m = configured.match(/<([^>]+)>/) || configured.match(/([^\s<>]+@[^\s<>]+)/);
  return (m && m[1]) || 'noreply@thelostandunfounds.com';
}

function displayName(m: ZohoListedMessage): string {
  const raw = (m.sender || m.fromAddress || 'Zoho').replace(/[<>"@]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${raw.slice(0, 60)} via Zoho`;
}

async function sendCopy(
  m: ZohoListedMessage,
  html: string
): Promise<{ outcome: 'copied' | 'already_copied'; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `zoho-gmail-copy/${m.messageId}`,
    },
    body: JSON.stringify({
      from: `${displayName(m)} <${senderAddress()}>`,
      to: [OWNER_GMAIL],
      subject: `[Zoho] ${m.subject}`.slice(0, 900),
      html,
    }),
  });
  const data: any = await res.json().catch(() => ({}));

  if (res.ok) return { outcome: 'copied', id: data?.id };
  // Same key, different payload: this message was already sent under its key.
  if (res.status === 409 && data?.name === 'invalid_idempotent_request') {
    return { outcome: 'already_copied' };
  }
  throw new Error(`Resend ${res.status}: ${data?.message || data?.name || 'unknown error'}`);
}

export async function runZohoGmailCopy(opts: { dryRun?: boolean } = {}): Promise<{
  windowHours: number;
  domains: readonly string[];
  results: CopyResult[];
}> {
  const auth = await getZohoAuthContext();
  const sinceMs = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const candidates = await findCandidates(auth.accountId, auth.accessToken, sinceMs);
  const results: CopyResult[] = [];

  for (const m of candidates) {
    const base = {
      messageId: m.messageId,
      from: m.fromAddress || m.sender,
      subject: m.subject,
      receivedAt: new Date(m.receivedTime).toISOString(),
    };
    if (opts.dryRun) {
      results.push({ ...base, outcome: 'would_copy' });
      continue;
    }
    try {
      const body = await getBody(auth.accountId, auth.accessToken, m);
      const sent = await sendCopy(m, buildCopyHtml(m, body));
      results.push({ ...base, outcome: sent.outcome, resendId: sent.id });
    } catch (err: any) {
      console.error('[zoho-gmail-copy] failed', m.messageId, err?.message);
      results.push({ ...base, outcome: 'failed', error: err?.message || 'unknown error' });
    }
  }

  return { windowHours: WINDOW_HOURS, domains: COPY_SENDER_DOMAINS, results };
}
