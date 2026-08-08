import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { SITE } from '../../../src/config/site'

type AffiliateEmailType =
  | 'welcome'
  | 'commission_earned'
  | 'payout_sent'
  | 'payout_failed'
  | 'weekly_summary'
  | 'stripe_reminder'
  | 'admin_new_affiliate';

export interface AffiliateEmailParams {
  type: AffiliateEmailType;
  affiliateId: string;
  to: string;
  /**
   * Optional id used to deduplicate sends (e.g. commission_id, transfer_id).
   * If a row already exists for (affiliate_id, type, reference_id), the send
   * is skipped.
   */
  referenceId?: string;
  data: Record<string, any>;
}

const SITE_URL = (process.env.SITE_URL || SITE.origin).replace(/\/$/, '');

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

function escapeHtml(s: any): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Render an affiliate email's subject and inner body without sending it.
 * Exported so previews use the exact markup a real send would — never a
 * hand-copied duplicate that can drift.
 */
export function renderAffiliateEmail(
  type: AffiliateEmailType,
  data: Record<string, any>
): { subject: string; content: string } {
  return buildContent(type, data);
}

function buildContent(type: AffiliateEmailType, data: Record<string, any>): { subject: string; content: string } {
  switch (type) {
    case 'welcome': {
      const code = escapeHtml(data.code || '');
      const refUrl = `${SITE_URL}?ref=${code}`;
      const onboardingBtn = data.onboardingUrl
        ? `<p style="margin:24px 0 0 0;">
             <a href="${escapeHtml(data.onboardingUrl)}"
                style="display:inline-block;padding:14px 28px;background:#fff;color:#000;font-weight:bold;font-size:14px;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">
               Complete Stripe Setup →
             </a>
           </p>
           <p style="color:#666;font-size:11px;margin:10px 0 0 0;">Required to receive payouts — takes about 5 minutes.</p>`
        : '';
      return {
        subject: `You're in — THE AFFILIATE PROGRAM`,
        content: `
          <h1 style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:0.05em;margin:0 0 8px 0;text-transform:uppercase;white-space:nowrap;">W3 COM3 TO 3AT YOUR BRAIN!!!</h1>
          <p style="color:#aaa;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 28px 0;">Affiliate Code: ${code}</p>

          <p style="color:#fff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
            You're officially part of <b style="text-transform:uppercase;letter-spacing:0.05em;">THE AFFILIATE PROGRAM</b> at THE LOST+UNFOUNDS. Every time someone uses your link to buy — merch, photo galleries, anything — you keep <b>42% of the profit</b>. Plus MLM bonuses when people you recruit make sales.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Your link</span><br>
                <a href="${refUrl}" style="color:#fff;font-size:13px;word-break:break-all;text-decoration:underline;">${refUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Commission rate</span><br>
                <span style="color:#fff;font-size:13px;">42% of profit per sale</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Dashboard</span><br>
                <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;font-size:13px;text-decoration:underline;">${SITE_URL}/affiliate-dashboard</a>
              </td>
            </tr>
          </table>

          ${onboardingBtn}
        `,
      };
    }
    case 'admin_new_affiliate': {
      // Internal notification — goes to the admin address, never to the affiliate.
      const code = escapeHtml(data.code || '');
      const name = escapeHtml([data.firstName, data.lastName].filter(Boolean).join(' ')) || '—';
      const email = escapeHtml(data.email || '—');
      const phone = escapeHtml(data.phone || '—');
      const referredBy = escapeHtml(data.referredByCode || '') || 'Direct signup';
      const signedUpAt = escapeHtml(data.signedUpAt || '');
      const row = (label: string, value: string, last = false) => `
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;${last ? 'border-bottom:1px solid #1a1a1a;' : ''}">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">${label}</span><br>
                <span style="color:#fff;font-size:13px;word-break:break-word;">${value}</span>
              </td>
            </tr>`;
      return {
        subject: `New affiliate registration — ${code}`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 8px 0;text-transform:uppercase;">NEW AFFILIATE REGISTERED</h1>
          <p style="color:#aaa;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 28px 0;">Affiliate Code: ${code}</p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">
            ${row('Name', name)}
            ${row('Email', email)}
            ${row('Phone', phone)}
            ${row('Referred by', referredBy)}
            ${row('Signed up', signedUpAt || '—', true)}
          </table>

          <p style="margin:0;">
            <a href="${SITE_URL}/admin/affiliates"
               style="display:inline-block;padding:14px 28px;background:#fff;color:#000;font-weight:bold;font-size:14px;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">
              Open Affiliates Admin →
            </a>
          </p>
        `,
      };
    }
    case 'stripe_reminder': {
      const code = escapeHtml(data.code || '');
      const firstName = escapeHtml(data.firstName || '');
      const resumeUrl = escapeHtml(data.resumeUrl || `${SITE_URL}/affiliate-dashboard`);
      const pending = Number(data.pendingEarnings || 0);
      const greeting = firstName ? `${firstName} — you're` : `You're`;
      const pendingLine =
        pending > 0
          ? `<p style="color:#fff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
               You already have <b>${fmtUsd(pending)}</b> in commissions sitting in your balance. It stays
               there until Stripe is connected — we have nowhere to send it.
             </p>`
          : '';
      return {
        subject: `For payment, are you ready to start earning?`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 8px 0;text-transform:uppercase;">YOU READY TO START EARNING?</h1>
          <p style="color:#aaa;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 28px 0;">Affiliate Code: ${code}</p>

          <p style="color:#fff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
            ${greeting} signed up as an affiliate at THE LOST+UNFOUNDS, but you haven't connected your
            Stripe account yet — and <b>you can't get paid until you do</b>. Your link still works and
            your commissions still count; they just can't leave the account without somewhere to land.
          </p>

          ${pendingLine}

          <p style="margin:0 0 32px 0;">
            <a href="${resumeUrl}"
               style="display:inline-block;padding:14px 28px;background:#fff;color:#000;font-weight:bold;font-size:14px;letter-spacing:0.08em;text-decoration:none;text-transform:uppercase;">
              Connect Stripe →
            </a>
          </p>
          <p style="color:#666;font-size:11px;margin:-20px 0 32px 0;">
            One tap — no dashboard, no login. Takes about 5 minutes.
          </p>

          <h2 style="color:#fff;font-size:15px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 12px 0;">So what is Stripe?</h2>
          <p style="color:#fff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
            Stripe is the payment company that moves the money. It's how nearly every modern business
            online gets paid — <b>Amazon, Shopify, Lyft, DoorDash, Instacart, Slack, Zoom, Substack
            and Kickstarter</b> all run payments through Stripe. It handles hundreds of billions of
            dollars a year and is one of the most heavily regulated, audited payment processors there is.
          </p>
          <p style="color:#fff;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
            You're not signing up for anything new or paying anything. Connecting just tells Stripe
            which bank account to deposit <i>your</i> commissions into. Stripe asks for your legal name,
            address, date of birth and bank details — that's the same identity check any employer or
            bank does before sending you money, and it's required by US law before a payout can be made.
          </p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 28px 0;">
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">Your details go to</span><br>
                <span style="color:#fff;font-size:13px;">Stripe — not us. We never see your bank info or SSN.</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">What it costs you</span><br>
                <span style="color:#fff;font-size:13px;">Nothing. No fees, no subscription.</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-top:1px solid #1a1a1a;border-bottom:1px solid #1a1a1a;">
                <span style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;">You earn</span><br>
                <span style="color:#fff;font-size:13px;">42% of profit per sale, for the lifetime of every customer you bring in.</span>
              </td>
            </tr>
          </table>

          <p style="color:#999;font-size:12px;line-height:1.6;margin:0;">
            Rather do it from your dashboard?
            <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">${SITE_URL}/affiliate-dashboard</a>
          </p>
        `,
      };
    }
    case 'commission_earned': {
      const amount = fmtUsd(Number(data.amount || 0));
      const gross = fmtUsd(Number(data.grossAmount || 0));
      const source = escapeHtml(data.source || 'order');
      return {
        subject: `Commission earned — ${amount}`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 16px 0;">YOU EARNED ${amount}</h1>
          <p style="color:#fff;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            One of your referrals just placed a ${source} for <b>${gross}</b>. Your share is <b>${amount}</b> (42%).
            It enters a 30-day holding period before becoming payable, then you can request a payout from the dashboard.
          </p>
          <p style="color:#999;font-size:12px;margin:24px 0 0 0;">
            <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">View in dashboard →</a>
          </p>
        `,
      };
    }
    case 'payout_sent': {
      const amount = fmtUsd(Number(data.amount || 0));
      const transferId = escapeHtml(data.transferId || '');
      return {
        subject: `Payout sent — ${amount}`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 16px 0;">${amount} ON ITS WAY</h1>
          <p style="color:#fff;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            ${amount} has been transferred to your connected Stripe account. Funds typically land within
            <b>1–2 business days</b> depending on your bank.
          </p>
          ${transferId ? `<p style="color:#999;font-size:12px;margin:0;">Transfer id: <code style="color:#888;">${transferId}</code></p>` : ''}
          <p style="color:#999;font-size:12px;margin:24px 0 0 0;">
            <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">View payouts →</a>
          </p>
        `,
      };
    }
    case 'payout_failed': {
      const amount = fmtUsd(Number(data.amount || 0));
      const reason = escapeHtml(data.reason || 'Unknown error');
      return {
        subject: `Payout failed — please re-check your details`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 16px 0;">PAYOUT FAILED</h1>
          <p style="color:#fff;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            We tried to send you ${amount} but Stripe rejected the transfer. Reason: <b>${reason}</b>.
            Your commissions are still in your balance — please review your Stripe Connect status and try again.
          </p>
          <p style="color:#999;font-size:12px;margin:24px 0 0 0;">
            <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">Open dashboard →</a>
          </p>
        `,
      };
    }
    case 'weekly_summary': {
      const earnings = fmtUsd(Number(data.weekEarnings || 0));
      const conversions = Number(data.weekConversions || 0);
      const clicks = Number(data.weekClicks || 0);
      const balance = fmtUsd(Number(data.availableBalance || 0));
      return {
        subject: `Weekly summary — ${earnings} earned`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 16px 0;">YOUR WEEK</h1>
          <table style="width:100%;border-collapse:collapse;margin:16px 0 24px 0;">
            <tr><td style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;padding:8px 16px 8px 0;">Earnings</td><td style="color:#fff;font-size:14px;padding:8px 0;">${earnings}</td></tr>
            <tr><td style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;padding:8px 16px 8px 0;">Conversions</td><td style="color:#fff;font-size:14px;padding:8px 0;">${conversions}</td></tr>
            <tr><td style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;padding:8px 16px 8px 0;">Clicks</td><td style="color:#fff;font-size:14px;padding:8px 0;">${clicks}</td></tr>
            <tr><td style="color:#999;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;padding:8px 16px 8px 0;">Balance</td><td style="color:#fff;font-size:14px;padding:8px 0;">${balance}</td></tr>
          </table>
          <p style="color:#999;font-size:12px;margin:24px 0 0 0;">
            <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">Open dashboard →</a>
          </p>
        `,
      };
    }
    default:
      return { subject: 'TLAU Affiliate Update', content: '<p>—</p>' };
  }
}

/**
 * Send a templated affiliate email and log the send (deduped by referenceId).
 */
export async function sendAffiliateEmail(params: AffiliateEmailParams): Promise<{
  sent: boolean;
  skipped?: boolean;
  error?: string;
  resendId?: string;
}> {
  const supabase = getSupabase();
  const { type, affiliateId, to, referenceId, data } = params;

  if (!to) return { sent: false, error: 'no recipient' };

  // Dedup: check email log
  if (supabase && referenceId) {
    const { data: existing } = await supabase
      .from('affiliate_email_log')
      .select('id')
      .eq('affiliate_id', affiliateId)
      .eq('email_type', type)
      .eq('reference_id', referenceId)
      .maybeSingle();
    if (existing) return { sent: false, skipped: true };
  }

  const { subject, content } = buildContent(type, data);
  const result = await sendTransactionalEmail({ to, subject, content });

  if (supabase) {
    try {
      await supabase.from('affiliate_email_log').insert({
        affiliate_id: affiliateId,
        email_type: type,
        reference_id: referenceId || null,
        resend_id: result.id || null,
        status: result.success ? 'sent' : 'failed',
        error_message: result.success ? null : result.error || null,
      });
    } catch (logErr: any) {
      console.warn('[affiliate-email] log insert failed:', logErr?.message);
    }
  }

  return result.success
    ? { sent: true, resendId: result.id }
    : { sent: false, error: result.error || 'send failed' };
}
