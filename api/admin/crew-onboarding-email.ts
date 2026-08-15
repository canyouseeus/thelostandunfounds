import handler from '../../lib/api-handlers/crew/onboarding-email.js';

/**
 * Roster catch-up email — see the handler for the auth model.
 *
 * Deliberately not on a cron: it is a one-off announcement with no send log, so
 * running it twice mails everybody twice.
 */
export default handler;
