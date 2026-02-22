/**
 * Standardized Email Template for THE LOST+UNFOUNDS
 * 
 * This template ensures all outgoing emails have consistent branding and formatting.
 * Use this for newsletters, transactional emails, notifications, etc.
 */

// Brand assets
export const BRAND = {
  name: 'THE LOST+UNFOUNDS',
  logo: 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png',
  website: 'https://www.thelostandunfounds.com',
  colors: {
    background: '#000000',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    border: 'rgba(255, 255, 255, 0.1)',
    link: 'rgba(255, 255, 255, 0.9)',
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
              <hr style="border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;">
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
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.name}</title>
  <style>
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
<body style="margin: 0 !important; padding: 0 !important; background-color: ${BRAND.colors.background} !important; font-family: Arial, Helvetica, sans-serif;">
  <!-- Email wrapper table -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100% !important; border-collapse: collapse !important; background-color: ${BRAND.colors.background} !important; margin: 0 !important; padding: 0 !important;">
    <tr>
      <td align="left" style="padding: 40px 20px !important; background-color: ${BRAND.colors.background} !important;">
        <!-- Content container -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px !important; width: 100% !important; background-color: ${BRAND.colors.background} !important; margin: 0 !important;">
          <!-- Logo -->
          <tr>
            <td align="left" style="padding: 0 0 30px 0 !important;">
              <a href="${BRAND.website}" target="_blank">
                <img src="${BRAND.logo}" alt="${BRAND.name}" style="max-width: 100%; height: auto; display: block;">
              </a>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td style="padding: 0 !important; color: ${BRAND.colors.text} !important;">
              ${bodyContent}
              ${footerHtml}
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
  subscriberEmail: string
): string {
  let html = rawHtml || '';
  const unsubscribeUrl = getUnsubscribeUrl(subscriberEmail);

  // Replace unsubscribe placeholders
  html = html.replace(/{{\s*unsubscribe_url\s*}}/gi, unsubscribeUrl);
  html = html.replace(/href=["']\s*{{\s*unsubscribe_url\s*}}["']/gi, `href="${unsubscribeUrl}"`);

  // Check if unsubscribe link exists
  const hasUnsubscribeLink = /href=["'][^"']*unsubscribe/i.test(html) || />Unsubscribe<\/a>/i.test(html);

  // Add unsubscribe block if missing
  if (!hasUnsubscribeLink) {
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
  const processedContent = processEmailContent(bodyContent, subscriberEmail);
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
 * Default styles for inline use in email content
 */
export const EMAIL_STYLES = {
  heading1: `color: ${BRAND.colors.text} !important; font-size: 28px; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 0.1em;`,
  heading2: `color: ${BRAND.colors.text} !important; font-size: 24px; font-weight: bold; margin: 30px 0 20px 0; letter-spacing: 0.1em;`,
  heading3: `color: ${BRAND.colors.text} !important; font-size: 20px; font-weight: bold; margin: 25px 0 15px 0;`,
  paragraph: `color: ${BRAND.colors.text} !important; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: left;`,
  link: `color: ${BRAND.colors.link}; text-decoration: underline;`,
  button: `display: inline-block; padding: 14px 28px; background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background}; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid ${BRAND.colors.text};`,
  divider: `border: none; border-top: 1px solid ${BRAND.colors.border}; margin: 30px 0;`,
  muted: `color: ${BRAND.colors.textMuted}; font-size: 14px; line-height: 1.5;`,
};
