import { EMAIL_STYLES, renderImageButton } from '../email-template.js';

/**
 * Newsletter, October 2026: what shipped since the last issue (Sep 24).
 *
 * Kept in the repo so the copy is reviewed in a PR and sent by the
 * `send_newsletter` admin job exactly as reviewed. Every number below was read
 * from production on 2026-10-29; re-check them if this goes out much later.
 */

const SITE = 'https://www.thelostandunfounds.com';
const P = EMAIL_STYLES.paragraph;
const H1 = EMAIL_STYLES.heading1;
const H2 = EMAIL_STYLES.heading2;
const LINK = EMAIL_STYLES.link;

const item = (title: string, body: string) =>
  `<p style="${P}"><strong>${title}</strong><br />${body}</p>`;

const contentHtml = `
<h1 style="${H1}">WHAT'S NEW</h1>
<p style="${P}">
  Five weeks since the last one. In that time we shipped <strong>49 updates</strong> to the site.
  Most of them you'll never see. These are the ones you will.
</p>

<h2 style="${H2}">MILESTONES</h2>
${item('16,000+ PHOTOS', `<strong>THE GALLERY</strong> now holds more than 16,000 photos across 12 galleries.`)}
${item('THE CREW GETS PAID ON ITS OWN', 'Photographers who shoot for us are now paid automatically, straight to their bank, once the client’s payment clears. The first payouts have already landed. Nobody presses a button.')}
${item('LOCKED DOWN', 'Every public form on the site now has a bot check, and every admin tool needs a verified login. Less spam for you, less risk for everyone.')}

<h2 style="${H2}">NEW</h2>
${item('LIVE EVENT GALLERIES', 'At our events, photos now land in the gallery while the night is still going. Scan the QR code at the event, and watch it fill up from your phone.')}
${item('<strong>THE AFFILIATE PROGRAM</strong>, REBUILT', `Your share is now <strong>42% of the profit</strong> on everything you refer, and jobs booked by phone or email count too, not just website checkouts. The <strong>KING MIDAS</strong> pot pays out every day, and <strong>SECRET SANTA</strong> pays by points. The signup page now shows how much has been paid out and how many affiliates are in.`)}
${item('GET HELP', `Something not working? Open a ticket at <a href="${SITE}/support" style="${LINK}">thelostandunfounds.com/support</a>. We reply by email, and the whole conversation stays on one private page you can come back to.`)}
${item('WALKTHROUGHS', 'Your dashboard now shows you around. A WELCOME tour runs on your first visit, and the <strong>?</strong> button in the bottom left replays any of them. New features announce themselves with a walkthrough of their own.')}
${item('SCREEN PRINTING, IN-HOUSE', 'We built our own film generator for screen printing: any photo in <strong>THE GALLERY</strong> becomes a print-ready halftone film. It’s how the next run of merch gets made.')}

<h2 style="${H2}">SMALLER THINGS</h2>
<p style="${P}">
  Paid invoices now come back as receipts, marked PAID IN FULL. Our logo finally shows up in Google
  results. The homepage banner scrolls away instead of following you. Photographers can now upload
  straight from their camera roll.
</p>

${renderImageButton(`${SITE}/gallery`, 'btn-see-gallery', 'SEE THE GALLERY')}
${renderImageButton(`${SITE}/become-affiliate`, 'btn-affiliate', 'JOIN THE AFFILIATE PROGRAM')}

<p style="${P}">More soon.<br /><strong>THE LOST+UNFOUNDS</strong></p>
`;

/** Plain-text version, stored on the campaign row alongside the HTML. */
const content = contentHtml
  .replace(/\s*\n\s*/g, ' ')
  .replace(/<br\s*\/?>/g, '\n')
  .replace(/<\/(p|h1|h2)>/g, '\n\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n\s*/g, '\n\n')
  .trim();

export const ISSUE = {
  subject: "49 updates in five weeks: what's new",
  content,
  contentHtml,
};
