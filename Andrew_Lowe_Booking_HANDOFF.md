# Handoff Prompt — Andrew Lowe Headshot Booking (INV-003)

## Context

A new booking inquiry came in from **Andrew Lowe**, a local comedian, for a headshot session. Joshua asked me to draft an invoice and a response email so the booking could be locked in with a deposit. Location is still TBD — the deposit gets the date held; location is confirmed afterward.

We use a custom invoicing system that lives inside this repo (`thelostandunfounds`):
- **CRM:** Supabase `clients` and `invoices` tables. Invoice numbering is sequential (`INV-001` Toke Truck, `INV-002` Rachel Harbut, now `INV-003` Andrew Lowe).
- **Branded invoice format:** Hand-crafted HTML files (see `TokeTruck_Invoice_April18.pdf` for reference) that get printed to PDF from the browser. Centered character logo, "[Service] Photography" subtitle, 4-column header (BILLED TO / INVOICE DATE / EVENT DATE / DUE with split deposit/balance), 3-column line-item table, Total, Delivery Timeline, italic gray Note, then payment block, then "Thank you for booking with The Lost & Unfounds ✦" footer.
- **Payment:** **Stripe only.** Other methods (Venmo, Cash App, Apple Pay, Bitcoin) are deprecated. The invoice PDF has a black "PAY DEPOSIT »" button that links to a Stripe Payment Link.
- **Brand:** "THE LOST+UNFOUNDS" (plus sign, no space), but the footer signature uses "The Lost & Unfounds" (with ampersand). Email is `media@thelostandunfounds.com`.

## What's Been Done

1. **Supabase records created** in project `nonaqhllakrckbtbawrb`:
   - `clients` row for Andrew Lowe (id `ca19bcd0-14cd-4f29-86a5-3a689742aab2`)
   - `invoices` row `INV-003`, type `standard`, status `draft`, total $75, amount_due $37.50
   - Line item: `{"description": "Headshot Photography Session", "details": "10-15 high-resolution photos delivered", "amount": 75}`
2. **Branded HTML/PDF invoice:** `AndrewLowe_Invoice_INV-003.html` + `.pdf` in the repo root. Matches the Toke Truck format exactly, with the PAY DEPOSIT button.
3. **Response email:** `Andrew_Lowe_Booking_Response.md` — package ($75 total, $37.50 deposit, 10–15 high-res photos, location TBD), directs Andrew to hit the PAY DEPOSIT button.
4. **Reusable template:** `Booking_Inquiry_Response_Template.md` — Stripe-only, references the workflow.

## ⚠️ Pending — Production Stripe Link Swap

The PAY DEPOSIT button on the PDF currently points to a **Stripe TEST MODE** payment link:
`https://buy.stripe.com/test_28E28reeS8QCfVdeVOcV200`

This URL came from the Stripe MCP, which is connected in test mode. **Real cards will be rejected at checkout.** The invoice cannot be sent to Andrew until this is swapped for a live-mode link.

Joshua's production Stripe keys are set on Vercel (project `prj_6AFga8ibmQFfKL5zP5qsRu1q8RkT`, team `team_mb29bMintz7Ffd29VRICdhGx`), but not in `.env.local`.

### To finish the job

1. Joshua runs `vercel env pull .env.local` from the project folder. This pulls `STRIPE_SECRET_KEY` (live mode) into `.env.local`.
2. Use that key to call Stripe directly and recreate the Payment Link:
   ```bash
   # Create product
   curl https://api.stripe.com/v1/products \
     -u "$STRIPE_SECRET_KEY:" \
     -d "name=Headshot Session Deposit — Andrew Lowe (INV-003)" \
     -d "description=50% non-refundable deposit. Balance $37.50 due day of shoot."

   # Create price ($37.50 = 3750 cents)
   curl https://api.stripe.com/v1/prices \
     -u "$STRIPE_SECRET_KEY:" \
     -d "product=PROD_ID_FROM_ABOVE" \
     -d "unit_amount=3750" \
     -d "currency=usd"

   # Create Payment Link
   curl https://api.stripe.com/v1/payment_links \
     -u "$STRIPE_SECRET_KEY:" \
     -d "line_items[0][price]=PRICE_ID_FROM_ABOVE" \
     -d "line_items[0][quantity]=1"
   ```
3. Update the invoice row in Supabase:
   ```sql
   UPDATE invoices
   SET stripe_payment_link_id = '<new_plink_id>',
       stripe_payment_link_url = '<new_live_url>'
   WHERE invoice_number = 'INV-003';
   ```
4. Regenerate the PDF — open `AndrewLowe_Invoice_INV-003.html`, replace the two occurrences of the test URL with the live URL, then re-render:
   ```bash
   weasyprint AndrewLowe_Invoice_INV-003.html AndrewLowe_Invoice_INV-003.pdf
   ```
5. Send to Andrew using `Andrew_Lowe_Booking_Response.md` as the email body, with the regenerated PDF attached.

## Files In Repo Root

| File | Purpose |
|---|---|
| `AndrewLowe_Invoice_INV-003.html` | Branded invoice source (edit + re-print to PDF) |
| `AndrewLowe_Invoice_INV-003.pdf` | Rendered invoice — has test Stripe link right now |
| `Andrew_Lowe_Booking_Response.md` | Email body to send Andrew |
| `Booking_Inquiry_Response_Template.md` | Reusable template for future inquiries |
| `Andrew_Lowe_Booking_HANDOFF.md` | This file |

## Reference Invoices (live in Supabase, used for format matching)

- `INV-001` Toke Truck (Apr 16, 2026, $300 event photography)
- `INV-002` Rachel Harbut (Apr 17, 2026, $150 birthday session)
