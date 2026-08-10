import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES } from '../../email-template.js';

/**
 * Tell the owner a contractor was paid.
 *
 * The point of the automatic payer is that nobody has to remember to send the
 * money — but that also means nobody sees it happen. Without this, the first
 * sign that a payout went out (or that the balance moved) would be the Stripe
 * dashboard. Every transfer produces a line in the admin inbox instead.
 *
 * Failures are swallowed by the caller: a mail problem must never leave a
 * transfer that already succeeded looking like a failure, and must never stop
 * the ledger row being marked paid.
 */

const ADMIN_INBOX = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@thelostandunfounds.com';

// media@ is the business address of record for booking and photographer
// coordination, so the payout for a shoot stays on file there too.
const BUSINESS_RECORD_CC = 'media@thelostandunfounds.com';

const money = (value: number) =>
  `$${(Math.round(value * 100) / 100).toFixed(2)}`;

export async function sendCrewPayoutNotification(args: {
  contractorName: string;
  amount: number;
  description: string | null;
  transferId: string;
  destinationAccountId: string;
  remainingBalance: number;
}): Promise<{ success: boolean; provider?: string; error?: string }> {
  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">CONTRACTOR PAID</h1>
    <p style="${EMAIL_STYLES.paragraph}">
      ${money(args.amount)} was transferred to <strong>${args.contractorName}</strong>'s connected
      Stripe account. No action needed — this is the automatic job payout confirming it went out.
    </p>
    <hr style="${EMAIL_STYLES.divider}" />
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>Job:</strong> ${args.description || 'Photography job'}<br />
      <strong>Amount:</strong> ${money(args.amount)}<br />
      <strong>Destination:</strong> ${args.destinationAccountId}<br />
      <strong>Transfer:</strong> ${args.transferId}
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      <strong>Stripe balance remaining:</strong> ${money(args.remainingBalance)}
    </p>
    <p style="${EMAIL_STYLES.muted}">
      Funds move from the platform balance to the contractor's Stripe account immediately; Stripe
      then pays out to their bank on their own schedule.
    </p>
  `;

  try {
    const result = await sendTransactionalEmail({
      to: ADMIN_INBOX,
      cc: BUSINESS_RECORD_CC,
      subject: `Paid ${args.contractorName} ${money(args.amount)} — ${args.description || 'photography job'}`,
      content,
    });
    return { success: result.success, provider: result.provider, error: result.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'notification failed' };
  }
}
