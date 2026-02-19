---
description: How to send any outgoing email (newsletter, transactional, notification) with proper branding
---

# Send Email Workflow

## Pre-flight: Read the branding skill
// turbo
1. Read the brand-email-manager skill:
   ```
   view_file .agent/skills/brand-email-manager/SKILL.md
   ```

## Verify the handler uses the correct function
2. Open the relevant email handler file and confirm it imports and calls the correct function from `lib/email-template.ts`:
   - **Newsletter emails** → `generateNewsletterEmail(bodyContent, subscriberEmail)`
   - **Transactional emails** → `generateTransactionalEmail(bodyContent)`
   - **Custom emails** → `wrapEmailContent(bodyContent, options)`
   - ❌ NEVER use `processEmailContent` alone — it does NOT include the logo/banner.

## Verify the logo URL
3. Confirm the logo URL in `lib/email-template.ts` resolves (HTTP 200):
   ```
   curl -I https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png
   ```

## Deploy before testing
4. If any handler code was modified, you MUST commit and push to `main` BEFORE running a test send. The send script hits the production API at `https://www.thelostandunfounds.com/api/newsletter/send`.

## Send a test email
5. Run the send script in test mode first:
   ```
   node scripts/send-life-be-life-ing-newsletter.js --test=thelostandunfounds@gmail.com
   ```

## Verify branding in inbox
6. Ask the user to confirm the test email has:
   - ✅ Logo/banner image visible at top
   - ✅ Black background
   - ✅ White text
   - ✅ Unsubscribe link in footer
   - ✅ Correct content

## Production send (only after user confirmation)
7. Run with `--production` flag only after the user explicitly approves the test email.
