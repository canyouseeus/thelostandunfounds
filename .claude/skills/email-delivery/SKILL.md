---
name: email-delivery
description: Routes all transactional email through the Zoho-primary / Resend-fallback helper instead of either provider directly. Use when adding or modifying any code path that sends email to a user (booking notifications, commission emails, order receipts, welcome emails, status changes, etc). Triggers on "send email", "transactional email", "Zoho", "Resend", or any handler/util touching email delivery.
---

# Email Delivery Skill

## Policy (non-negotiable)

**Scope: this skill is the authority on _transactional_ email.** Newsletter/bulk sending is a
separate path with its own handler — see "Newsletter / batch" below and the `outreach-ops` skill
for campaign and subscriber management.

- **Zoho is the primary provider** for transactional email.
- **Resend is the automatic fallback** when Zoho fails (throws, unconfigured, non-2xx).

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

Newsletter sending does **not** go through this helper. It lives in
`lib/api-handlers/_newsletter-send-handler.ts`, which:

- defines its **own local `sendZohoEmail`** (line ~259) — a separate implementation from the shared
  one in `_zoho-email-utils.ts`, with a different signature
- selects provider with `const useResend = isResendConfigured()` (line 531), i.e. purely
  `!!process.env.RESEND_API_KEY`
- sends with `useResend ? sendResendEmail(...) : sendZohoEmail(...)` (line ~585)
- throttles sequentially: 550ms/email on Resend, 750ms on Zoho (line 621)

**So the newsletter already prefers Resend automatically whenever `RESEND_API_KEY` is set**, and
falls back to Zoho only when it isn't. That is Resend-*preferred*, not Resend-*only* — the
distinction matters: if the key is ever missing in an environment, the newsletter silently sends
through Zoho at 1.3 emails/sec with no warning.

If you are changing newsletter behaviour, that handler is the file — not this one.

> **Dead code warning.** `sendNewsletterEmail` and `sendBatchNewsletterEmails` are exported from
> `_resend-email-handler.ts` but are **not called anywhere in the codebase**. Don't assume they're
> the live newsletter path — they aren't. Either wire them up deliberately or leave them alone;
> importing them "because they look canonical" will send nothing.

**Resend is the right provider for bulk.** Zoho Mail is a mailbox product with per-day send caps;
bulk sending through it risks the quota and the sending reputation of the same domain that carries
transactional mail. Resend is a purpose-built ESP with batch endpoints, domain auth and bounce
handling. Keep `RESEND_API_KEY` configured in every environment that sends newsletters.

Two open items (do not resolve unilaterally):
1. Whether the Zoho fallback should be removed outright so a missing `RESEND_API_KEY` fails loudly
   instead of quietly degrading to a mailbox provider.
2. `sendBatchEmails` exists in `_resend-email-handler.ts` but the newsletter loops one-at-a-time
   with a 550ms delay. Wiring the batch endpoint would be materially faster.

## What NOT to do

- Don't call `sendZohoEmail` or `getZohoAuthContext` directly from a handler for a new transactional path. Existing call sites are tech debt — see the list below. Flag them when you touch them; don't expand the pattern.
- Don't call `sendEmail` (the raw Resend send) from a handler unless you genuinely need Resend-only (newsletter, batch). For one-recipient transactional, use `sendTransactionalEmail`.
- Don't write a third provider integration without explicit approval.
- Don't swallow Zoho failures silently. The helper already logs them with `console.warn('[email-delivery] ...')`; preserve that visibility.

## Where the code lives

- `lib/api-handlers/_resend-email-handler.ts` — canonical helper. `sendTransactionalEmail` does Zoho-first/Resend-fallback. Raw `sendEmail`, `sendNewsletterEmail`, `sendBatchEmails` stay Resend-only.
- `lib/api-handlers/_zoho-email-utils.ts` — Zoho primitives (`getZohoAuthContext`, `sendZohoEmail`). Imported by the helper. Don't import from handlers directly.
- `lib/email-template.ts` — HTML templating (`generateTransactionalEmail`, `generateNewsletterEmail`, etc). Used inside the helpers.
- `lib/api-handlers/affiliates/_emails.ts` — example caller. Routes commission/payout/welcome emails through `sendTransactionalEmail` and gets fallback for free.
- `lib/api-handlers/_zoho-mail-handler.ts` — **not a sending path.** It is the Zoho *mailbox*
  client (`getFolders`, `getMessages`, `moveMessage`, `saveDraft`, `markAsRead`) behind the admin
  webmail page, imported only by `api/mail/[...path].ts`. Do not reach for it to send email.

## Known bypasses (tech debt — do not expand)

These call Zoho directly and therefore get **no Resend fallback**: if Zoho throws or is
unconfigured, the email silently does not send. Migrate opportunistically when you're already
editing the relevant lines; don't launch a sweeping refactor without approval.

- `api/invoices/send.ts`
- `api/booking/send-contract.ts`
- `api/gallery/[...path].ts`
- `lib/api-handlers/_shop-email-utils.ts`
- `lib/api-handlers/_booking-payment-utils.ts`
- `lib/api-handlers/_photo-email-utils.ts`
- `lib/api-handlers/_newsletter-send-handler.ts` — newsletter path, see above; different question
- `lib/api-handlers/_newsletter-retry-handler.ts` — same

For reference, ~16 handlers already use `sendTransactionalEmail` correctly (blog notifications,
welcome emails, affiliate emails, booking confirmations, event notifications). `api/booking/index.ts`
is one of them — it was migrated, despite older notes flagging it as a bypass.

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
