import crypto from 'crypto';

/**
 * Signed, expiring tokens for the one-click "finish your Stripe setup" link we
 * put in reminder emails.
 *
 * Stripe Account Links themselves expire in minutes, so an email can't carry
 * one. Instead the email carries this token; /api/affiliates/stripe-resume
 * verifies it and mints a fresh Account Link server-side, then redirects.
 *
 * The token authorises exactly one thing; starting Stripe onboarding for one
 * affiliate id. It grants no session and reads no data.
 */

const DEFAULT_TTL_DAYS = 30;

function getSecret(): string {
  const secret =
    process.env.AFFILIATE_LINK_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No signing secret configured');
  return secret;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload: string): string {
  return b64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());
}

export function createOnboardingToken(
  affiliateId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): string {
  const body = {
    v: 1,
    a: affiliateId,
    e: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
  };
  const payload = b64url(Buffer.from(JSON.stringify(body)));
  return `${payload}.${sign(payload)}`;
}

export interface TokenVerdict {
  ok: boolean;
  affiliateId?: string;
  reason?: string;
}

export function verifyOnboardingToken(token: unknown): TokenVerdict {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const idx = token.lastIndexOf('.');
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return { ok: false, reason: 'not configured' };
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad signature' };
  }

  let body: any;
  try {
    body = JSON.parse(fromB64url(payload).toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!body?.a || typeof body.a !== 'string') return { ok: false, reason: 'malformed' };
  if (typeof body.e !== 'number' || body.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, affiliateId: body.a };
}

/** Absolute URL an affiliate can click straight from an email. */
export function buildOnboardingResumeUrl(siteUrl: string, affiliateId: string): string {
  const token = createOnboardingToken(affiliateId);
  return `${siteUrl.replace(/\/$/, '')}/api/affiliates/stripe-resume?token=${encodeURIComponent(token)}`;
}
