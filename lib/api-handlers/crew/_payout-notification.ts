import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES } from '../../email-template.js';

/**
 * Tell the owner a contractor was paid.
 *
 * The point of the automatic payer is that nobody has to remember to send the
 * money, but that also means nobody sees it happen. Without this, the first
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

/**
 * Tell the contractor they were paid.
 *
 * The admin notification tells the owner the money moved; without this, the
 * person who actually did the work is the only one not told. They would find
 * out by opening Stripe, checking their bank, or happening to look at their
 * dashboard: which is the same "go and check somewhere else" problem the
 * automatic payer exists to remove, just pointed at them instead of the owner.
 *
 * Same best-effort contract as the admin notification: the transfer has already
 * succeeded by the time this runs, so a mail failure is logged, not raised.
 */
export async function sendContractorPayoutNotification(args: {
  to: string;
  contractorName: string;
  amount: number;
  description: string | null;
  transferId: string;
}): Promise<{ success: boolean; provider?: string; error?: string }> {
  const firstName = args.contractorName.trim().split(/\s+/)[0] || 'there';

  const content = `
    <h1 style="${EMAIL_STYLES.heading1}">YOU'VE BEEN PAID</h1>
    <p style="${EMAIL_STYLES.paragraph}">
      Hey ${firstName}: <strong>${money(args.amount)}</strong> is on its way to you for
      ${args.description || 'your recent shoot'}.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      The transfer has landed in your connected Stripe account. Stripe pays it out to your bank
      on their normal schedule, so give it a business day or two to show up there.
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      <a href="https://www.thelostandunfounds.com/photographer-dashboard" style="${EMAIL_STYLES.button}">VIEW YOUR PAYOUTS</a>
    </p>
    <p style="${EMAIL_STYLES.paragraph}">
      From there you can open your own Stripe dashboard to see your balance and when it lands in
      your bank. We link you through from the page rather than from this email, because Stripe's
      dashboard links are single-use and expire; one sent by email would be dead before you
      tapped it.
    </p>
    <p style="${EMAIL_STYLES.muted}">
      Reference: ${args.transferId}<br />
      Questions about this payment? Just reply to this email.
    </p>
  `;

  try {
    const result = await sendTransactionalEmail({
      to: args.to,
      cc: BUSINESS_RECORD_CC,
      subject: `You've been paid ${money(args.amount)}`,
      content,
    });
    return { success: result.success, provider: result.provider, error: result.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'notification failed' };
  }
}

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
      Stripe account. No action needed: this is the automatic job payout confirming it went out.
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
      subject: `Paid ${args.contractorName} ${money(args.amount)}; ${args.description || 'photography job'}`,
      content,
    });
    return { success: result.success, provider: result.provider, error: result.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'notification failed' };
  }
}
