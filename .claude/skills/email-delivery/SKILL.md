---
name: email-delivery
description: Routes all transactional email through the Zoho-primary / Resend-fallback helper instead of either provider directly. Use when adding or modifying any code path that sends email to a user (booking notifications, commission emails, order receipts, welcome emails, status changes, etc). Triggers on "send email", "transactional email", "Zoho", "Resend", or any handler/util touching email delivery.
---

# Email Delivery Skill

## Policy (non-negotiable)

- **Zoho is the primary provider** for transactional email.
- **Resend is the automatic fallback** when Zoho fails (throws, unconfigured, non-2xx).
- **Newsletter / bulk sends are Resend-only** — Zoho can't handle the volume and was the reason Resend was introduced.

Reason Resend exists: Zoho was hitting deliverability/quota issues, especially on newsletter sends. Resend was added as a safety net so the app keeps sending when Zoho refuses. Past LLM-written PRs each picked one provider and called it directly, leaving every new path single-pointed-of-failure. Don't repeat that.

## What to call

### Transactional (one recipient, no unsubscribe)

```typescript
import { sendTransactionalEmail } from '../../lib/api-handlers/_resend-email-handler.js';

const result = await sendTransactionalEmail({
  to: customer.email,
  subject: 'Your booking is confirmed',
  content: bodyHtml, // inner body — helper wraps it via generateTransactionalEmail
});
// result.success: boolean
// result.provider: 'zoho' | 'resend'   ← tells you which one actually sent
// result.error: string (if !success)
// result.id: Resend message id (if provider === 'resend' and success)
```

This helper handles Zoho-first, Resend-fallback automatically. Despite the misleading filename (`_resend-email-handler.ts`, predates the policy), it is the canonical entry point for transactional sends. Multi-recipient or `replyTo` sends bypass Zoho directly and go to Resend (Zoho's API can't take them in one call).

### Newsletter / batch

```typescript
import { sendNewsletterEmail, sendBatchNewsletterEmails } from '../../lib/api-handlers/_resend-email-handler.js';
```

These are **Resend-only by design**. Don't add Zoho fallback to them.

## What NOT to do

- Don't call `sendZohoEmail` or `getZohoAuthContext` directly from a handler for a new transactional path. (Existing call sites in `api/booking/index.ts:230-246` and elsewhere are tech debt — flag them when you touch them, don't expand the pattern.)
- Don't call `sendEmail` (the raw Resend send) from a handler unless you genuinely need Resend-only (newsletter, batch). For one-recipient transactional, use `sendTransactionalEmail`.
- Don't write a third provider integration without explicit approval.
- Don't swallow Zoho failures silently. The helper already logs them with `console.warn('[email-delivery] ...')`; preserve that visibility.

## Where the code lives

- `lib/api-handlers/_resend-email-handler.ts` — canonical helper. `sendTransactionalEmail` does Zoho-first/Resend-fallback. Raw `sendEmail`, `sendNewsletterEmail`, `sendBatchEmails` stay Resend-only.
- `lib/api-handlers/_zoho-email-utils.ts` — Zoho primitives (`getZohoAuthContext`, `sendZohoEmail`). Imported by the helper. Don't import from handlers directly.
- `lib/email-template.ts` — HTML templating (`generateTransactionalEmail`, `generateNewsletterEmail`, etc). Used inside the helpers.
- `lib/api-handlers/affiliates/_emails.ts` — example caller. Routes commission/payout/welcome emails through `sendTransactionalEmail` and gets fallback for free.

## Env vars

| Var                   | Used by | Required? |
|----------------------|---------|-----------|
| `ZOHO_CLIENT_ID`     | Zoho    | for Zoho path |
| `ZOHO_CLIENT_SECRET` | Zoho    | for Zoho path |
| `ZOHO_REFRESH_TOKEN` | Zoho    | for Zoho path |
| `ZOHO_FROM_EMAIL`    | Zoho    | for Zoho path |
| `RESEND_API_KEY`     | Resend  | for fallback path |
| `RESEND_FROM_EMAIL`  | Resend  | optional, defaults to noreply@ |

If only one provider is configured, the helper still works — Zoho path throws early, Resend takes over.

## Banner rules (enforced — never violate)

- **Never use an SVG data URI as a banner.** Any `BANNER_URL = "data:image/svg+xml..."` in the codebase is a bug. Replace with `'https://www.thelostandunfounds.com/brand/banner.png'`. SVG data URIs render as white text above the real banner in most email clients.
- **All email HTML must go through `generateTransactionalEmail` or `generateNewsletterEmail`** before being sent. These functions include the real banner `<img>` tag. Passing raw HTML directly to `sendZohoEmail` bypasses the template and risks the fallback injecting the wrong content.
- See the `brand-email-manager` skill for the full list of email branding rules.

## Reviewing existing code

If you're modifying an existing handler that calls `sendZohoEmail` or raw Resend `sendEmail` directly for transactional purposes:
- Migrate it to `sendTransactionalEmail` if your change is already touching the relevant lines.
- If you're not touching those lines, leave them but mention the tech debt in your summary so the user can decide whether to bundle a cleanup.
- Don't do a sweeping "fix all single-provider sends" refactor without explicit approval.
