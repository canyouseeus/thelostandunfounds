/**
 * Standardized Email Template for THE LOST+UNFOUNDS
 * 
 * This template ensures all outgoing emails have consistent branding and formatting.
 * Use this for newsletters, transactional emails, notifications, etc.
 */

import { EMAIL_BUTTON_FILES } from './email-buttons.generated.js';

// Brand assets
export const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  logo: 'https://www.thelostandunfounds.com/brand/banner.png',
  website: 'https://www.thelostandunfounds.com',
  // THE BRAND IS A BLACK EMAIL. Black background, white type, under a black
  // banner PNG.
  //
  // This was flipped to white on 2026-08-13 and flipped back the same day, once
  // the email the owner pointed to as "the correct white one" was pulled out of
  // the Zoho Sent folder and turned out to be THIS palette, inverted by Gmail.
  // Gmail on iOS inverts whatever it is sent: a black email displays white, and
  // a white email displays dark. The owner reads his mail there, so the black
  // brand is what renders the way he wants.
  //
  // Do not flip this to white again on the strength of a screenshot.
  // See email-rendering RULE 1.
  colors: {
    background: '#000000',
    text: '#ffffff',
    textMuted: '#999999',
    border: '#1a1a1a',
    link: '#eeeeee',
  },
};

/**
 * Generate unsubscribe URL for a subscriber
 */
export function getUnsubscribeUrl(email: string): string {
  return `${BRAND.website}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
}

/**
 * Standard email wrapper with branding
 * Wraps any content in the standard THE LOST+UNFOUNDS email template
 */
export function wrapEmailContent(
  bodyContent: string,
  options: {
    subscriberEmail?: string;
    includeUnsubscribe?: boolean;
    includeFooter?: boolean;
  } = {}
): string {
  const {
    subscriberEmail = '',
    includeUnsubscribe = true,
    includeFooter = true,
  } = options;

  const currentYear = new Date().getFullYear();
  const unsubscribeUrl = subscriberEmail ? getUnsubscribeUrl(subscriberEmail) : '#';

  const footerHtml = includeFooter ? `
              <hr style="border: none; margin: 30px 0;">
              <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 0 0 10px 0; text-align: left;">
                © ${currentYear} ${BRAND.name}. All rights reserved.
              </p>
              ${includeUnsubscribe && subscriberEmail ? `
              <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 10px 0 0 0; text-align: left;">
                <a href="${unsubscribeUrl}" style="color: ${BRAND.colors.textMuted}; text-decoration: underline;">Unsubscribe from this newsletter</a>
              </p>
              ` : ''}
  ` : '';

  return `<!DOCTYPE html>
<html bgcolor="${BRAND.colors.background}" style="background-color:${BRAND.colors.background};">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    /* Brand styles */
    body {
      background-color: ${BRAND.colors.background} !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, Helvetica, sans-serif;
      color: ${BRAND.colors.text};
      width: 100% !important;
    }
    table {
      background-color: ${BRAND.colors.background} !important;
      border-collapse: collapse !important;
    }
    td {
      background-color: ${BRAND.colors.background} !important;
    }
    a {
      color: ${BRAND.colors.link};
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${BRAND.colors.text} !important;
      font-family: Arial, Helvetica, sans-serif;
      margin: 0 0 20px 0;
    }
    p {
      color: ${BRAND.colors.text} !important;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    ul, ol {
      color: ${BRAND.colors.text} !important;
      font-size: 16px;
      line-height: 1.8;
      margin: 0 0 20px 0;
      padding-left: 20px;
    }
  </style>
</head>
<body bgcolor="${BRAND.colors.background}" style="margin: 0; padding: 0; background-color: ${BRAND.colors.background}; color: ${BRAND.colors.text}; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important; height: 100% !important;">
  <!-- Hidden preheader: keeps email clients from showing title tag or injected text above the banner -->
  <div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;color:${BRAND.colors.background};line-height:1px;opacity:0;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <!-- Full wrapper table for background -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" height="100%" bgcolor="${BRAND.colors.background}" style="border-collapse: collapse; background-color: ${BRAND.colors.background}; background: ${BRAND.colors.background}; margin: 0; padding: 0; width: 100% !important; height: 100% !important;">
    <tr>
      <td align="center" bgcolor="${BRAND.colors.background}" style="padding: 0; background-color: ${BRAND.colors.background};">
        <!-- Center column wrapper -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${BRAND.colors.background}" style="max-width: 600px; width: 100%; background-color: ${BRAND.colors.background}; margin: 0 auto; border-collapse: collapse;">
          <!-- Responsive Banner -->
          <tr>
            <td align="left" bgcolor="${BRAND.colors.background}" style="padding: 0; background-color: ${BRAND.colors.background}; font-size: 0; line-height: 0;">
              <a href="${BRAND.website}" target="_blank" style="display: block; width: 100%;">
                <img src="${BRAND.logo}" alt="${BRAND.name}" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" border="0">
              </a>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td align="left" bgcolor="${BRAND.colors.background}" style="padding: 40px 20px; color: ${BRAND.colors.text}; background-color: ${BRAND.colors.background};">
              <!-- Force inner white text -->
              <div style="color: ${BRAND.colors.text}; font-size: 16px; line-height: 1.6; text-align: left;">
                ${bodyContent}
                ${footerHtml}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Process raw HTML content to ensure it follows brand guidelines
 * - Adds unsubscribe link if missing
 * - Ensures proper styling
 */
export function processEmailContent(
  rawHtml: string,
  subscriberEmail: string,
  options: { injectUnsubscribeIfMissing?: boolean } = {}
): string {
  // Callers that wrap the result in a footer which already carries an
  // unsubscribe link should pass false, otherwise the message ends up with two
  // of them: one in the body, one in the footer.
  const { injectUnsubscribeIfMissing = true } = options;

  let html = rawHtml || '';
  const unsubscribeUrl = getUnsubscribeUrl(subscriberEmail);

  // Replace unsubscribe placeholders
  html = html.replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl);
  html = html.replace(/href=["']\s*{{\s*unsubscribe_url\s*}}["']/gi, `href="${unsubscribeUrl}"`);

  // Check if unsubscribe link exists
  const hasUnsubscribeLink = /href=["'][^"']*unsubscribe/i.test(html) || />Unsubscribe<\/a>/i.test(html);

  // Add unsubscribe block if missing
  if (injectUnsubscribeIfMissing && !hasUnsubscribeLink) {
    const unsubBlock = `
      <p style="color: ${BRAND.colors.textMuted}; font-size: 12px; line-height: 1.5; margin: 20px 0 0 0; text-align: left;">
        <a href="${unsubscribeUrl}" style="color: ${BRAND.colors.textMuted}; text-decoration: underline;">Unsubscribe</a>
      </p>`;

    // Insert before <hr> if exists, otherwise append
    const hrIndex = html.indexOf('<hr');
    if (hrIndex >= 0) {
      html = html.slice(0, hrIndex) + unsubBlock + html.slice(hrIndex);
    } else {
      html = html + unsubBlock;
    }
  }

  return html;
}

/**
 * Generate a complete newsletter email
 * This is the main function to use for sending newsletters
 */
export function generateNewsletterEmail(
  bodyContent: string,
  subscriberEmail: string
): string {
  // wrapEmailContent below adds the footer unsubscribe link, so suppress the
  // body-level one here: otherwise every newsletter carries two.
  const processedContent = processEmailContent(bodyContent, subscriberEmail, {
    injectUnsubscribeIfMissing: false,
  });
  return wrapEmailContent(processedContent, {
    subscriberEmail,
    includeUnsubscribe: true,
    includeFooter: true,
  });
}

/**
 * Generate a transactional email (no unsubscribe link)
 * Use for welcome emails, password resets, notifications, etc.
 */
export function generateTransactionalEmail(
  bodyContent: string
): string {
  return wrapEmailContent(bodyContent, {
    includeUnsubscribe: false,
    includeFooter: true,
  });
}

/**
 * Render a call-to-action button.
 *
 * Buttons are centered. `EMAIL_STYLES.button` is an inline-block, so it cannot
 * centre itself: the centring has to come from a wrapper, and leaving that to
 * each caller is how buttons drift left one at a time. Use this instead of
 * hand-writing an anchor.
 *
 * A table is used rather than a div because Outlook ignores `text-align` on
 * block containers often enough to matter.
 */
export function renderButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin: 8px 0 24px 0;">
  <tr>
    <td align="center" style="text-align:center;">
      <a href="${href}" style="${EMAIL_STYLES.button}">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Default styles for inline use in email content
 */
export const EMAIL_STYLES = {
  heading1: `color: ${BRAND.colors.text} !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 0.1em;`,
  heading2: `color: ${BRAND.colors.text} !important; font-size: 24px; font-weight: bold; margin: 30px 0 20px 0; letter-spacing: 0.1em;`,
  heading3: `color: ${BRAND.colors.text} !important; font-size: 20px; font-weight: bold; margin: 25px 0 15px 0;`,
  paragraph: `color: ${BRAND.colors.text} !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;`,
  link: `color: ${BRAND.colors.link}; text-decoration: underline;`,
  // Solid white fill with black type. The button must never be filled with
  // the page colour and made visible by a border; that renders as an empty
  // outlined box. See brand-email-manager.
  button: `display: inline-block; padding: 14px 28px; background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background} !important; text-decoration: none; font-weight: bold; font-size: 16px;`,
  divider: `border: none; margin: 30px 0;`,
  muted: `color: ${BRAND.colors.textMuted}; font-size: 14px; line-height: 1.5;`,
};

/**
 * Render a call-to-action button as an IMAGE.
 *
 * Gmail's dark-mode conversion maps a white CSS fill to roughly #2b2b2b while
 * the banner PNG keeps its true #000000, because Gmail never repaints images.
 * A CSS button therefore never matches the banner sitting above it. As an
 * image, it does, in every client and every mode.
 *
 * Buttons are all one size (340x52) and centred. `name` is a key in
 * EMAIL_BUTTON_FILES; the filename carries a content hash because Vercel serves
 * /public as immutable for a year, so a changed button must be a new URL.
 *
 * If images are blocked the alt text shows in white on the black body and the
 * anchor still works, so the call to action survives.
 */
export function renderImageButton(href: string, name: string, alt: string): string {
  const file = EMAIL_BUTTON_FILES[name];
  if (!file) {
    throw new Error(
      `Unknown email button "${name}". Add it to BUTTONS in scripts/generate-email-buttons.py and re-run it.`
    );
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${BRAND.colors.background}" style="border-collapse:collapse;margin:8px 0 24px 0;background-color:${BRAND.colors.background};">
  <tr>
    <td align="center" bgcolor="${BRAND.colors.background}" style="text-align:center;background-color:${BRAND.colors.background};">
      <a href="${href}" style="display:inline-block;text-decoration:none;"><img src="${BRAND.website}/brand/${file}" alt="${alt}" width="340" height="52" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:340px;height:52px;max-width:100%;color:${BRAND.colors.text};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;" /></a>
    </td>
  </tr>
</table>`;
}
