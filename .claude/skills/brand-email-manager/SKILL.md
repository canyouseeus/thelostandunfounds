---
name: brand-email-manager
description: Ensures all outgoing emails follow branding guidelines using the standardized template. Use when sending emails, creating email templates, or modifying email content. Use when user mentions "email template", "branded email", or "email styling".
---

# Brand Email Manager Skill

This skill ensures that every email sent by the application (transactional, newsletters, notifications) adheres to the official THE LOST+UNFOUNDS brand identity.

## Core Principles
1. **Never Hardcode HTML**: Do not write raw HTML for email bodies in handlers or servers.
2. **Use the Standard Template**: Always import and use `wrapEmailContent`, `generateNewsletterEmail`, or `generateTransactionalEmail` from `lib/email-template.ts`.
3. **Mandatory Banner**: Every email must start with the official full-width black banner image — injected automatically by the template.
4. **Consistent Typography**: Use the `EMAIL_STYLES` constants for headings, paragraphs, and buttons.
5. **Left-aligned body**: Body text is left-aligned. The banner is full-width.

## ABSOLUTE RULES — Never violate these

### ❌ Never use SVG data URIs as banner fallbacks
The historical pattern of `BANNER_URL = "data:image/svg+xml;utf8,<svg...>THE LOST+UNFOUNDS</svg>"` is **banned**. SVG data URIs render as visible white text above the banner in most email clients. If you ever see a `BANNER_URL` constant containing a `data:image/svg` string anywhere in the codebase, replace it immediately:

```typescript
// BANNED — causes white text above banner in email clients
const BANNER_URL = "data:image/svg+xml;utf8,<svg ...>THE LOST+UNFOUNDS</svg>"

// CORRECT
const BANNER_URL = 'https://www.thelostandunfounds.com/brand/banner.png'
```

### ❌ Never call `ensureBannerHtml` directly from a new handler
`ensureBannerHtml` in `_zoho-email-utils.ts` is a safety net for legacy handlers, not an API. New code must go through `generateTransactionalEmail` or `generateNewsletterEmail` — these call `wrapEmailContent` which already includes the correct banner `<img>` tag.

### ❌ Never add a `<title>` tag to email HTML
Many email clients render `<title>` content as visible preheader text above the banner. The template in `lib/email-template.ts` deliberately omits `<title>`. Do not add it.

### ❌ No content above the banner
The `<body>` tag immediately opens into the hidden preheader div (zero-height, zero-opacity), then the banner. Nothing visible comes before the banner — no text, no spacing, no wrapper divs with content.

## Banner image URL (canonical)

```
https://www.thelostandunfounds.com/brand/banner.png
```

Old Supabase URL (legacy, still in some templates for backwards-compat detection):
```
https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png
```
Do not use the Supabase URL in new code. The `ensureBannerHtml` detection array includes it so existing emails aren't double-injected.

## Usage Patterns

### 1. Transactional Emails (Orders, Welcomes, Notifications)
Use `generateTransactionalEmail` to wrap your content. It includes the banner and footer but no unsubscribe link.

```typescript
import { generateTransactionalEmail, EMAIL_STYLES } from '../../lib/email-template.js';

const body = `
  <h1 style="${EMAIL_STYLES.heading1}">ORDER CONFIRMED</h1>
  <p style="${EMAIL_STYLES.paragraph}">Thank you for your purchase.</p>
  <a href="${url}" style="${EMAIL_STYLES.button}">ACCESS GALLERY</a>
`;

const html = generateTransactionalEmail(body);
// Then pass html to sendTransactionalEmail() — see email-delivery skill
```

### 2. Newsletter Emails
Use `generateNewsletterEmail`. It automatically handles unsubscribe link injection.

```typescript
import { generateNewsletterEmail } from '../../lib/email-template.js';

const html = generateNewsletterEmail(campaignContent, subscriberEmail);
```

### 3. Auditing existing email code
When reviewing any file that sends email, check for:
- `data:image/svg` in any string → replace with real banner URL
- Raw HTML passed to `sendZohoEmail` without going through `generateTransactionalEmail` first → migrate
- `<title>` tags inside email HTML → delete
- Any visible content before the banner `<img>` in the rendered output → remove

## Common Pitfalls
- **Missing Shell**: Forgetting to add `<!DOCTYPE html>` or `<html>` tags. `wrapEmailContent` handles this for you.
- **Inconsistent Buttons**: Using different padding or colors for buttons. Always use `EMAIL_STYLES.button`.
- **Relative URLs**: Emails must use absolute URLs for all links and images.
- **Heading color**: Dark headings (`color:#000`) will be invisible on the black email background. Headings inside `wrapEmailContent` inherit white from the template styles — don't override with black unless you intend the content to sit on a white section.
