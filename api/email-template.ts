/**
 * Re-export of lib/email-template.ts.
 *
 * This file used to be a SECOND, divergent copy of the email template, and the
 * divergence was not cosmetic. On 2026-08-13 the newsletter (built by lib) and
 * a client quote (built by this file) arrived in the same inbox as two
 * different colours: the newsletter inverted to a clean white panel, the quote
 * to a muted grey.
 *
 * The cause was structural, not a palette difference. Both declared the same
 * black, but lib carries `bgcolor` attributes on <html>, <body> and every
 * wrapper table (seven of them) while this copy had none and set the background
 * in CSS alone. Gmail's dark-mode conversion treats those two cases
 * differently, so identical colours produced different results.
 *
 * The two also once derived the button from `colors.background` / `colors.text`
 * in OPPOSITE orders, producing two different buttons from identical constant
 * names, and this copy carried a <title> tag that the brand rules ban because
 * clients render it as preheader text above the banner.
 *
 * Keeping two templates in sync by hand did not work. There is now one
 * template, and this path stays only so existing imports keep resolving.
 *
 * Do not reintroduce a second copy. Change lib/email-template.ts.
 */

export {
  BRAND,
  getUnsubscribeUrl,
  wrapEmailContent,
  processEmailContent,
  generateNewsletterEmail,
  generateTransactionalEmail,
  renderButton,
  renderImageButton,
  EMAIL_STYLES,
} from '../lib/email-template.js';
