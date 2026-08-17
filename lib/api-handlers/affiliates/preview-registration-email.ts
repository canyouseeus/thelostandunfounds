/**
 * Preview the admin "new affiliate registered" notification.
 *
 * POST { testEmail: string } → render the admin_new_affiliate template with
 * sample data and send one copy to that address.
 *
 * Mirrors the gate in stripe-reminders.ts: the affiliates router is ungated,
 * so the recipient is restricted to owner addresses unless CRON_SECRET is
 * supplied. An unauthenticated caller can, at most, mail the owner a copy of
 * our own template, never an arbitrary third party.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendAffiliateEmail } from './_emails.js';

const OWNER_ADDRESSES = new Set([
  'thelostandunfounds@gmail.com',
  'admin@thelostandunfounds.com',
  'media@thelostandunfounds.com',
]);

function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers['x-cron-secret'];
  return (
    authHeader === `Bearer ${expected}` ||
    headerSecret === expected ||
    req.query.secret === expected
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as Record<string, any>;
  const testEmail: string | undefined =
    typeof body.testEmail === 'string' ? body.testEmail : undefined;

  if (!testEmail) {
    return res.status(400).json({ error: 'testEmail is required' });
  }

  const isOwnerPreview = OWNER_ADDRESSES.has(testEmail.trim().toLowerCase());
  if (!isOwnerPreview && !isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sample = {
    code: 'SAMPLE01',
    firstName: 'Sample',
    lastName: 'Affiliate',
    email: 'sample.affiliate@example.com',
    phone: '+1 555 000 0000',
    referredByCode: '',
    signedUpAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
  };

  const result = await sendAffiliateEmail({
    type: 'admin_new_affiliate',
    // Preview only: no affiliate row is involved, and a unique reference_id
    // keeps this out of the dedup path for real registrations.
    affiliateId: null as any,
    referenceId: `preview_${Date.now()}`,
    to: testEmail,
    data: sample,
  });

  return res.status(result.sent ? 200 : 500).json({
    preview: true,
    to: testEmail,
    sent: result.sent,
    error: result.error,
  });
}
