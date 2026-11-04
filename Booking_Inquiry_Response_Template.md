# Booking Inquiry Response — Template

> Use this as the starting point for every new booking inquiry. Replace the `{{placeholders}}` and adjust details to match the quote.

---

**Subject:** Your {{session_type}} — Booking Confirmation & Deposit

Hey {{first_name}},

Thanks for reaching out about {{session_type}} — excited to work with you. Here's what I'm proposing:

**The Session**
- {{duration}} shoot
- {{look_count}} outfit / look changes
- {{deliverable_count}} high-resolution photos delivered
- Delivered via private digital gallery within 7 business days

**The Investment**
- Total: **${{total}}**
- Deposit to lock the date: **${{deposit}}** ({{deposit_percent}}%, non-refundable)
- Balance: **${{balance}}** due the day of the shoot

**Location**
{{location_paragraph}}

**Next Steps**
1. Invoice **{{invoice_number}}** is attached. Just hit the "PAY DEPOSIT" button on the PDF — secure Stripe checkout, takes about 30 seconds.
2. Once the deposit clears, we lock in the date and finalize the location.
3. I'll send a short prep guide a few days before the shoot.

Let me know if anything needs tweaking. Otherwise, hit the button and we're rolling.

Looking forward to it,

Joshua
THE LOST+UNFOUNDS
media@thelostandunfounds.com
thelostandunfounds.com

---

## Placeholders Quick Reference

| Placeholder | Example |
|---|---|
| `{{first_name}}` | Andrew |
| `{{session_type}}` | headshot session / portrait session / event coverage |
| `{{duration}}` | 1.5–2 hour |
| `{{look_count}}` | 2–3 |
| `{{deliverable_count}}` | 10–15 |
| `{{total}}` | 75 |
| `{{deposit}}` | 37.50 |
| `{{deposit_percent}}` | 50 |
| `{{balance}}` | 37.50 |
| `{{invoice_number}}` | INV-003 |
| `{{location_paragraph}}` | "We haven't nailed this down yet — once the deposit is in, I'll send over two or three location options…" |

## Workflow

1. Booking inquiry comes in → log client in CRM (`AdminInvoices`).
2. Run the "Create Quote" flow (admin panel or `POST /api/booking/create-quote`) — it generates the invoice row, the Stripe Payment Link, and the branded PDF with the PAY DEPOSIT button.
3. Send this email with the PDF attached.

**Payment:** Stripe only (Payment Link is embedded as the "PAY DEPOSIT" button on the invoice PDF).
