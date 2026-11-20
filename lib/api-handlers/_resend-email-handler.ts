/**
 * Email delivery handler.
 *
 * Policy: Zoho is the primary transactional provider; Resend is the automatic
 * fallback used when Zoho throws, is unconfigured, or returns a non-2xx. The
 * filename predates the policy (originally Resend-only).
 *
 * Every Resend send goes through sendViaResend (./_email-quota.ts), which keeps
 * today's count against Resend's daily quota. Newsletters stop using Resend
 * before the last RESEND_TRANSACTIONAL_RESERVE sends of the day so these
 * transactional fallbacks still have room; see _newsletter-delivery.ts.
 */

import {
  wrapEmailContent,
  generateNewsletterEmail,
  generateTransactionalEmail,
  processEmailContent
} from '../email-template.js';
import { getZohoAuthContext, sendZohoEmail } from './_zoho-email-utils.js';
import { noteZohoSent, resendHasRoom, sendViaResend } from './_email-quota.js';

interface ResendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send a single email via Resend (counted against the daily quota).
 */
export async function sendEmail(params: ResendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const result = await sendViaResend({
    from: params.from || process.env.RESEND_FROM_EMAIL || 'noreply@thelostandunfounds.com',
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
    cc: params.cc,
    bcc: params.bcc,
  });
  if (!result.success) console.error('Resend API error:', result.status, result.error);
  return { success: result.success, id: result.id, error: result.error };
}

/**
 * Send batch emails via Resend (up to 100 per request)
 */
export async function sendBatchEmails(
  emails: Array<{ to: string; subject: string; html: string }>
): Promise<{ success: boolean; results: Array<{ to: string; success: boolean; id?: string; error?: string }> }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      results: emails.map(e => ({ to: e.to, success: false, error: 'Resend API key not configured' }))
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thelostandunfounds.com';
  const results: Array<{ to: string; success: boolean; id?: string; error?: string }> = [];

  // Resend batch API supports up to 100 emails per request
  const batchSize = 100;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map(email => ({
            from: fromEmail,
            to: email.to,
            subject: email.subject,
            html: email.html,
          }))
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        // Batch failed, mark all as failed
        batch.forEach(email => {
          results.push({
            to: email.to,
            success: false,
            error: data.error?.message || `Batch error: ${response.status}`,
          });
        });
      } else {
        // Batch succeeded
        const batchResults = data.data || [];
        batch.forEach((email, index) => {
          const result = batchResults[index];
          if (result?.id) {
            results.push({ to: email.to, success: true, id: result.id });
          } else {
            results.push({ to: email.to, success: false, error: 'No ID returned' });
          }
        });
      }
    } catch (error: any) {
      // Network error, mark batch as failed
      batch.forEach(email => {
        results.push({
          to: email.to,
          success: false,
          error: error.message || 'Network error',
        });
      });
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send a newsletter email with standardized template
 * Automatically wraps content with THE LOST+UNFOUNDS branding
 */
export async function sendNewsletterEmail(params: {
  to: string;
  subject: string;
  content: string;
  from?: string;
  replyTo?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = generateNewsletterEmail(params.content, params.to);
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html,
    from: params.from,
    replyTo: params.replyTo,
  });
}

/**
 * Send a transactional email with standardized template
 * (e.g., welcome emails, notifications - no unsubscribe link).
 *
 * Tries Zoho first; falls back to Resend on any Zoho failure. Multi-recipient
 * or replyTo sends skip Zoho directly (sendZohoEmail doesn't support them).
 */
export async function sendTransactionalEmail(params: {
  to: string | string[];
  subject: string;
  content: string;
  from?: string;
  replyTo?: string;
  // CC is the business record: client and booking correspondence copies
  // media@thelostandunfounds.com so the thread stays on file. Both providers
  // accept it (Zoho ccAddress, Resend cc) and it was simply never plumbed
  // through here, so callers that passed one had it silently dropped.
  cc?: string | string[];
}): Promise<{ success: boolean; id?: string; error?: string; provider?: 'zoho' | 'resend' }> {
  const html = generateTransactionalEmail(params.content);

  const ccList = params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : [];

  const zohoEligible = typeof params.to === 'string' && !params.replyTo;
  if (zohoEligible) {
    try {
      const auth = await getZohoAuthContext();
      const zoho = await sendZohoEmail({
        auth,
        to: params.to as string,
        cc: ccList.length ? ccList.join(',') : undefined,
        // Honour the caller's sender on the Zoho path too. It was previously
        // read only on the Resend fallback, so a caller asking to send as
        // media@ got admin@ whenever Zoho — the primary — did the sending.
        from: params.from,
        subject: params.subject,
        htmlContent: html,
      });
      if (zoho.success) {
        noteZohoSent();
        return { success: true, provider: 'zoho' };
      }
      console.warn('[email-delivery] Zoho returned failure, falling back to Resend:', zoho.error);
    } catch (err: any) {
      console.warn('[email-delivery] Zoho threw, falling back to Resend:', err?.message);
    }
  }

  // Resend is the last resort here, so it may use the whole day's quota,
  // including the reserve newsletters leave untouched.
  const recipientCount =
    (Array.isArray(params.to) ? params.to.length : 1) + ccList.length;
  if (!(await resendHasRoom(recipientCount, 0))) {
    if (!zohoEligible) {
      // These normally skip Zoho (several To addresses, or a Reply-To that
      // Zoho's API can't set). With Resend out for the day, sending through
      // Zoho without the Reply-To beats not sending at all.
      try {
        const auth = await getZohoAuthContext();
        const toList = Array.isArray(params.to) ? params.to : [params.to];
        const zoho = await sendZohoEmail({
          auth,
          to: toList.join(','),
          cc: ccList.length ? ccList.join(',') : undefined,
          from: params.from,
          subject: params.subject,
          htmlContent: html,
        });
        if (zoho.success) {
          noteZohoSent();
          if (params.replyTo) {
            console.warn('[email-delivery] Resend quota used up; sent via Zoho without Reply-To', params.replyTo);
          }
          return { success: true, provider: 'zoho' };
        }
        console.error('[email-delivery] Resend quota used up and Zoho failed:', zoho.error);
      } catch (err: any) {
        console.error('[email-delivery] Resend quota used up and Zoho threw:', err?.message);
      }
    }
    console.error('[email-delivery] No provider could send:', params.subject);
    return {
      success: false,
      error: "Zoho could not send it and Resend's daily limit is used up",
      provider: 'resend',
    };
  }

  const resend = await sendEmail({
    to: params.to,
    subject: params.subject,
    html,
    from: params.from,
    replyTo: params.replyTo,
    cc: ccList.length ? ccList : undefined,
  });
  return { ...resend, provider: 'resend' };
}

/**
 * Send batch newsletter emails with standardized template
 */
export async function sendBatchNewsletterEmails(
  emails: Array<{ to: string; subject: string; content: string }>
): Promise<{ success: boolean; results: Array<{ to: string; success: boolean; id?: string; error?: string }> }> {
  const formattedEmails = emails.map(email => ({
    to: email.to,
    subject: email.subject,
    html: generateNewsletterEmail(email.content, email.to),
  }));
  return sendBatchEmails(formattedEmails);
}
