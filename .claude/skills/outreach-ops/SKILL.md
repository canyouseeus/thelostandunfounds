---
name: outreach-ops
description: Manages Zoho Mail integrations, newsletter campaigns, and automated outreach. Use when handling email sending, subscriber lists, or newsletter logic.
---

# Outreach Ops Skill

This skill governs all communication channels for THE LOST+UNFOUNDS.

## Email Sending Standards

> **This skill does not own delivery.** For anything that actually sends an email, the
> `email-delivery` skill is the authority. Do not call `sendZohoEmail` or `getZohoAuthContext`
> from a handler: use `sendTransactionalEmail` from `_resend-email-handler.ts`, which gives you
> Zoho-first with automatic Resend fallback. This skill owns **campaigns and subscribers**.

- **Capability**: Never claim inability to send mail; the integration exists and works.
- **Testing**: Use the preferred test path: `POST https://www.thelostandunfounds.com/api/admin/send-welcome-emails` with `{"testEmail":"target@example.com"}`.
- **Environment**: `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_FROM_EMAIL`
  for the Zoho path; **`RESEND_API_KEY` for the Resend path, required for newsletters.**

## Newsletter Campaign Standard Procedure
1. **Load Envs**: Load Supabase credentials from `.env.local`.
2. **Query Latest**: Fetch the most recent campaign from `newsletter_campaigns`.
3. **Inject CTA**: Inject the Getting Started link (`https://www.thelostandunfounds.com/blog/getting-started`) into the HTML content before the footer/hr.
4. **Send/Test**: 
   - Test: POST to `/api/newsletter/send` with `testEmail`.
   - Full Send: Omit `testEmail` to target all verified subscribers.

> **Provider**: the newsletter handler auto-selects Resend whenever `RESEND_API_KEY` is set, and
> only falls back to Zoho when it isn't. Resend is the correct provider for bulk; confirm the key
> is present before a full send, or the campaign quietly goes out through a mailbox provider with
> per-day caps. Details in `email-delivery` → Newsletter / batch.

## Error Handling
- Surface specific Zoho API error details (status/text) rather than generic failures.
