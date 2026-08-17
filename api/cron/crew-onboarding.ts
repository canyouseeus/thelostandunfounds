import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../lib/api-handlers/crew/onboarding-email.js';
import { isCronAuthorized } from '../../lib/api-handlers/crew/_shared.js';

/**
 * Welcome anybody on the roster who has not been welcomed yet.
 *
 * This exists because the send was unrunnable in practice. It was gated on
 * `CRON_SECRET`, which meant the only way to trigger it was to already be
 * holding a secret — so the owner asking for the emails to go out had no path
 * that ended in them going out. The credential lives in Vercel precisely so
 * the platform can act on its own behalf, and Vercel's scheduler is the thing
 * that already carries it.
 *
 * A sweep rather than a one-shot, which is the better shape anyway. Somebody
 * added to the roster next month gets welcomed on the next pass without anyone
 * remembering to do it, and the send that has been waiting all evening goes out
 * on the first one.
 *
 * Safe to run on a schedule only because of `crew_email_log`: the unique index
 * on (photographer, campaign) means everyone already mailed is filtered out
 * before a single message is composed. A sweep with nothing to do sends
 * nothing, which is the normal case and costs one query.
 *
 * The underlying handler takes POST with a body; the scheduler issues a bare
 * GET. This translates between them, and does its own cron check first so the
 * translation cannot become an unauthenticated way in.
 */
export default async function cron(req: VercelRequest, res: VercelResponse) {
  if (!isCronAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Hand the handler what it expects: an authorised POST that has confirmed.
  // The confirm exists to stop a mistyped manual call; a scheduled sweep that
  // has already filtered out everyone previously mailed is not that.
  (req as any).method = 'POST';
  (req as any).body = { confirm: true };

  return handler(req, res);
}
