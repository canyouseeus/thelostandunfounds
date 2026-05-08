import { createClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';

type AffiliateEmailType =
  | 'welcome'
  | 'commission_earned'
  | 'payout_sent'
  | 'payout_failed'
  | 'weekly_summary';

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

const SITE_URL = (process.env.SITE_URL || 'https://www.thelostandunfounds.com').replace(/\/$/, '');

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

function buildContent(type: AffiliateEmailType, data: Record<string, any>): { subject: string; content: string } {
  switch (type) {
    case 'welcome': {
      const code = escapeHtml(data.code || '');
      const onboarding = data.onboardingUrl
        ? `<p style="color:#fff;font-size:14px;line-height:1.6;margin:16px 0;">
             To get paid, finish your Stripe onboarding here:
             <br><a href="${escapeHtml(data.onboardingUrl)}" style="color:#fff;text-decoration:underline;">Complete Stripe setup →</a>
           </p>`
        : '';
      return {
        subject: `You're in — TLAU Affiliate ${code}`,
        content: `
          <h1 style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:0.05em;margin:0 0 16px 0;">WELCOME, AFFILIATE</h1>
          <p style="color:#fff;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            Your affiliate code is <b>${code}</b>. Share <code style="color:#fff;">${SITE_URL}?ref=${code}</code> — you earn <b>42%</b> of every sale your referrals make, plus MLM bonuses on referrals you bring into the program.
          </p>
          ${onboarding}
          <p style="color:#999;font-size:12px;margin:24px 0 0 0;">Track your stats: <a href="${SITE_URL}/affiliate-dashboard" style="color:#fff;text-decoration:underline;">${SITE_URL}/affiliate-dashboard</a></p>
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
