/**
 * Daily read of the owner's Strike USD balance, emailed to his Gmail.
 *
 * Why: client money paid by ACH lands in Strike, not Stripe, and can take days
 * (owner, 2026-11-12: "should just run a daily check on the payout").
 *
 * Read only. The one Strike call is GET /v1/balances (scope
 * partner.balances.read). Nothing is paid, moved, converted or changed.
 * The API key is never logged or returned.
 *
 * Why a daily balance rather than "only on a new deposit": Strike's API has no
 * documented endpoint that lists an incoming third-party ACH transfer, so the
 * balance is the only signal, and spotting a change needs yesterday's value
 * stored somewhere. This sends today's numbers instead; a stored-balance diff
 * can be added later if the owner wants fewer emails.
 */

import { generateTransactionalEmail } from '../email-template.js';

export const OWNER_GMAIL = 'thelostandunfounds@gmail.com';
const STRIKE_BALANCES_URL = 'https://api.strike.me/v1/balances';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface StrikeBalanceRow {
  currency: string;
  current?: string;
  pending?: string;
  available?: string;
  total?: string;
}

export interface StrikeUsdBalance {
  current: number;
  pending: number;
  available: number;
  total: number;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function senderAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL || '';
  const m = configured.match(/<([^>]+)>/) || configured.match(/([^\s<>]+@[^\s<>]+)/);
  return (m && m[1]) || 'noreply@thelostandunfounds.com';
}

export async function readStrikeUsdBalance(): Promise<StrikeUsdBalance> {
  const key = process.env.STRIKE_API_KEY;
  if (!key) throw new Error('STRIKE_API_KEY is not set');

  const res = await fetch(STRIKE_BALANCES_URL, {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    // 401/403 here usually means the key lacks partner.balances.read.
    const text = await res.text().catch(() => '');
    throw new Error(`Strike balances ${res.status}: ${text.slice(0, 200)}`);
  }
  const rows = (await res.json()) as StrikeBalanceRow[];
  const row = (Array.isArray(rows) ? rows : []).find(
    (r) => String(r.currency).toUpperCase() === 'USD'
  );
  return {
    current: num(row?.current),
    pending: num(row?.pending),
    available: num(row?.available),
    total: num(row?.total),
  };
}

/** YYYY-MM-DD in Central time. */
function centralDate(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

export async function runStrikeBalanceCheck(opts: { dryRun?: boolean } = {}) {
  const balance = await readStrikeUsdBalance();
  const day = centralDate();
  const subject =
    balance.pending > 0
      ? `[Strike] Deposit pending: ${usd(balance.pending)} on the way, ${usd(balance.available)} available`
      : `[Strike] Daily balance: ${usd(balance.available)} available`;

  if (opts.dryRun) return { day, balance, subject, sent: false };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const body = [
    `<p style="margin:0 0 12px 0;">Your Strike USD balance this morning (${day}, Central):</p>`,
    `<p style="margin:0 0 6px 0;"><strong>Available:</strong> ${usd(balance.available)}</p>`,
    `<p style="margin:0 0 6px 0;"><strong>Pending:</strong> ${usd(balance.pending)}</p>`,
    `<p style="margin:0 0 6px 0;"><strong>Current:</strong> ${usd(balance.current)}</p>`,
    `<p style="margin:12px 0 0 0;">Read-only check from the site. Nothing was moved.</p>`,
  ].join('');

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // One email per Central day, even if the cron fires twice.
      'Idempotency-Key': `strike-balance-check/${day}`,
    },
    body: JSON.stringify({
      from: `Strike check <${senderAddress()}>`,
      to: [OWNER_GMAIL],
      subject,
      html: generateTransactionalEmail(body),
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  const alreadySent = res.status === 409 && data?.name === 'invalid_idempotent_request';
  if (!res.ok && !alreadySent) {
    throw new Error(`Resend ${res.status}: ${data?.message || data?.name || 'unknown error'}`);
  }
  return { day, balance, subject, sent: res.ok, resendId: data?.id };
}
