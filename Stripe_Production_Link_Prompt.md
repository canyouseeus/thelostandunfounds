# Prompt — Swap Andrew Lowe's Invoice to Production Stripe

Paste the block below into a new Claude session (with access to this `thelostandunfounds` folder, the Supabase MCP, and bash) once `vercel env pull .env.local` has been run.

---

I just ran `vercel env pull .env.local` so production env vars (including `STRIPE_SECRET_KEY` in live mode) are now in `.env.local` at the project root.

I need you to swap the **test mode** Stripe link on invoice **INV-003** (Andrew Lowe, headshot session deposit) for a real production one. Here's the full context:

## What exists right now

- **Supabase** (project `nonaqhllakrckbtbawrb`, table `invoices`): row `INV-003` for client Andrew Lowe (`ca19bcd0-14cd-4f29-86a5-3a689742aab2`).
  - Total $75, `amount_due` $37.50 (50% deposit)
  - `stripe_payment_link_url` currently points to a TEST-mode link: `https://buy.stripe.com/test_28E28reeS8QCfVdeVOcV200`
- **File on disk:** `AndrewLowe_Invoice_INV-003.html` and `AndrewLowe_Invoice_INV-003.pdf` in the repo root. The HTML has the test URL hardcoded in two places (the `href` on the PAY DEPOSIT button and the visible URL text below it).
- **Template** at `Invoice_HTML_Template.html` is the canonical format for all future invoices — uses the email banner at the top, Stripe-only, PAY DEPOSIT button.

## What I need you to do

1. Read `STRIPE_SECRET_KEY` from `.env.local` (it should now start with `sk_live_`, not `sk_test_`). If it still starts with `sk_test_`, stop and tell me — the env pull didn't grab live keys.

2. Using the live key, hit Stripe's REST API directly with `curl` to create:
   - a Product named `Headshot Session Deposit — Andrew Lowe (INV-003)` with description `50% non-refundable deposit. Balance $37.50 due day of shoot.`
   - a one-time Price of `3750` cents USD for that product
   - a Payment Link for that price, quantity 1

3. Update the Supabase row:
   ```sql
   UPDATE invoices
   SET stripe_payment_link_id = '<new live plink id>',
       stripe_payment_link_url = '<new live url>'
   WHERE invoice_number = 'INV-003';
   ```

4. Edit `AndrewLowe_Invoice_INV-003.html` and replace **both** occurrences of `https://buy.stripe.com/test_28E28reeS8QCfVdeVOcV200` with the new live URL.

5. Re-render the PDF:
   ```bash
   weasyprint AndrewLowe_Invoice_INV-003.html AndrewLowe_Invoice_INV-003.pdf
   ```
   (WeasyPrint is installed via pip at `~/.local/bin/weasyprint`. If that path isn't in PATH, call it directly.)

6. Print a quick confirmation: the new live URL, the updated DB row, and the regenerated PDF path.

Then I'm ready to send the email at `Andrew_Lowe_Booking_Response.md` with the PDF attached.

**Background:** The dead test link came from an Anthropic Stripe MCP connector that turned out to be configured in test mode. The whole booking workflow (CRM, banner-branded PDF, Stripe-only payment) is documented in `Andrew_Lowe_Booking_HANDOFF.md` if you need more context.
