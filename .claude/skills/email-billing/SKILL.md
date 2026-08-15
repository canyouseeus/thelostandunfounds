---
name: email-billing
description: How a booking becomes an invoice, a Stripe deposit link and a paid job; the automatic quoting pipeline, discount codes, deposit/balance split, and the confirmation emails around them. Use when billing a client by email, adding a service that should auto-invoice, issuing a discount code, changing deposit terms, or debugging "the client booked but never got an invoice". Triggers on "invoice", "billing", "bill the client", "deposit", "payment link", "promo code", "discount code", "quote", "checkout", "Stripe link".
---

# Email Billing

`client-documents` owns **what an invoice looks like**. `email-delivery` owns **how mail is sent**.
This skill owns **the money path**: how a booking turns into an invoice with a payable link, and
what the client hears at each step.

## The pipeline

```
booking request  →  price resolved server-side  →  quote invoice + Stripe deposit link
                 →  emailed to client           →  deposit paid (webhook)
                 →  deposit confirmation email  →  shoot happens
                 →  final invoice + balance link →  paid
```

| Step | Lives in |
|---|---|
| Booking submitted | `api/booking/index.ts` → `handleBookingRequestInner` |
| Price resolution | `resolvePhotoPrice()` + `AIRBNB_TIERS` / `FIXED_PHOTO_PRICES` |
| Discount lookup | `extractPromoCode()` + `PROMO_CODES` |
| Quote + Stripe link + email | `createQuoteForBooking()` in `_booking-payment-utils.ts` |
| Deposit paid | `_stripe-webhook-handler.ts` → `sendDepositConfirmationEmail()` |
| Final balance | `api/booking/create-final-invoice.ts` |

## RULE 1, Never take a price from the request

The client sends a **bedroom count**, never an amount. The rate is resolved from the server's own
ladder. A price posted by the browser is a price the client chose.

```ts
const pricing = resolvePhotoPrice(event_type.trim(), bedrooms)   // server-side only
```

Same for discounts: `PROMO_CODES` is a server-side map of code → percent. A code in the URL or the
booking notes is a *claim*; the percentage attached to it is not.

## RULE 2: One implementation of the payment path

`createQuoteForBooking()` is called by **both** the booking handler and the admin
`create-quote.ts` endpoint. Do not copy it to add a variant.

The two email templates once derived their button from `colors.background`/`colors.text` in
opposite orders and produced two different buttons from the same names. A duplicated *payment*
path fails the same way, except the divergence is the amount charged.

## RULE 3, Only fixed-price work auto-invoices

Entries exist in `FIXED_PHOTO_PRICES` / `AIRBNB_TIERS` for services with a real rate card.
Consultation work (**Web Development, Retainer (Monthly), Brand / Editorial**) is deliberately
absent, resolves to `null`, and stays manual.

Auto-emailing a $1,500 Stripe link when someone asks about a website is worse than sending
nothing. When adding a service, decide which side of that line it sits on **before** adding a price.

## RULE 4: Every payment state change tells the client something

Paying the deposit used to be silent: the webhook advanced the booking to `deposit_paid` and sent
nothing, so a client paid real money and heard nothing back.

Every transition needs an email:

| Transition | Email | Must say |
|---|---|---|
| Booking created | Quote + deposit link | Total, deposit amount, what's included |
| Deposit paid | Confirmation | Shoot confirmed, date/time/location, **balance due on the day** |
| Final invoice | Balance link | What's outstanding |
| Paid in full | Receipt |: |

State the balance terms at the deposit stage, not at the end. A client who thinks the deposit was
the whole price is a collection problem you created.

Payment emails are **best-effort and non-fatal**. A mail failure must never throw inside the Stripe
webhook: Stripe retries on non-2xx and you double-process a payment already recorded.

```ts
try { await sendDepositConfirmationEmail({...}) }
catch (mailErr: any) { console.warn('⚠️ confirmation failed:', mailErr?.message) }
```

## RULE 5: A discount is only real if the invoice carries it

Promising 10% in an email and typing the full price into the quote is the default failure. The
discount must appear as its **own negative line item**, so the client sees it applied:

```ts
lineItems.push({ description: `Discount: ${promo} (${pct}%)`, quantity: 1,
                 unit_price: -off, amount: -off })
```

Record client-specific codes on the **client record** (`clients.notes`), not in
`affiliate_discount_codes`: that table requires an `affiliate_id` and drives commission payouts.
A courtesy discount filed there corrupts affiliate accounting.

Codes are plain strings with no expiry and no single-use guard. Fine for one named client; never
put one in a newsletter.

## RULE 6: Verify the money, not the code path

`success: true` from the send endpoint means the request was accepted, nothing more.

```bash
# invoice exists, is priced, and has a payable link
select invoice_number, total, amount_due, status, stripe_payment_link_url
  from invoices where booking_id = '<id>';

# booking carries the same numbers
select total_amount_cents, deposit_amount_cents, status from bookings where id = '<id>';

# the client actually received it, and media@ is on it
curl -sS 'https://www.thelostandunfounds.com/api/mail/messages?folderId=2933450000000008022&limit=3' \
  -H 'X-Admin-Email: thelostandunfounds@gmail.com'
```

A quote with `stripe_payment_link_url` null is an invoice nobody can pay.

## Express booking for existing clients

A returning client gets a personal link carrying their **CRM row id**, never their name or email
in the URL:

```
/?view=booking&service=airbnb&promo=<CODE>&client=<clients.id>&beds=<n>
```

`ExpressBookingModal` resolves them through `GET /api/booking?action=client&id=…`, which returns
only name, email and business. It asks for the day, the covered time window, the address and the
access instructions, nothing already on file, then generates the invoice.

**That link is a bearer link.** Anyone holding it can read that client's name, email and business.
Acceptable for a link mailed to that client; do not post it anywhere public.

## Advising on a negotiation: consult first, never auto-approve

A client emails asking for a deal. **Nothing is offered, quoted or sent until the owner decides
the number.** There is no auto-approve, no "reasonable discount" applied on anyone's behalf, and
no discount mentioned to a client before he has agreed to it. The job here is to give him the
numbers to decide with, then execute the decision.

### What to bring to the decision

Never answer "what discount should I give?" with a percentage alone. Bring:

1. **The list price** and what the client is anchored on. A returning client compares against what
   they last paid, not the rate card; say so explicitly if the previous job was a smaller scope.
2. **The subcontractor cost for this job.** This is the number that decides whether a discount is
   affordable. Query it, do not estimate:

```sql
select invoice_number, total, contractor_name, contractor_payout
  from invoices where client_id = '<id>' order by date desc;
```

3. **The resulting margin, in dollars and percent.** INV-004 is the reference point: $200 billed,
   $130 to the photographer: **35% margin**. A 10% discount on a job with that split is coming
   almost entirely out of the owner's share, not the job's.
4. **Market position.** Austin STR shoots run $100-400 for a standard unit; MLS listing work
   $150-325 with a ~$185 median. Say where the proposed number sits.
5. **A recommendation with a floor**, and the reason for it.

### The under-quoting guard

Before advising any discount, state the margin **after** the discount, in dollars. If the
subcontractor rate for the job is not yet agreed, say that the discount cannot be costed and
recommend settling it first. A percentage that sounds small is not small when the contractor takes
65% of revenue.

Do not present a discount as free goodwill. It is margin, and it should be traded for something:

- **Volume**: the rate holds across multiple units, growing the account instead of resetting the price
- **Referral**: they join the affiliate program and earn on who they send
- **Portfolio rights**: the work can be shown publicly
- **Off-peak**: they take a slot that was hard to fill

### Once he decides

Only then: issue the invoice with `create-negotiated-quote` (always with `listPrice`, so the
concession shows), and send the branded email. **That email must carry all three:**

1. **The agreed price**, and one line explaining any difference from the rate card, so the number
   does not read as arbitrary
2. **The booking funnel link**: `?view=booking&service=<id>&promo=<CODE>&client=<clients.id>`,
   never a bare `/?view=booking`
3. **The affiliate invite**: `/become-affiliate?ref=<owner code>`, framed as earning rather than
   saving. A client asking for a discount is telling you they are cost-sensitive; a referral link
   is the answer that costs margin only once

Built with `generateTransactionalEmail()`, CC `media@`, and tested to the admin inbox first per
`email-rendering` RULE 6.

## Negotiated pricing: saying yes to a deal over email

Repeat clients ask. "This is what I can work with" is a normal opening, and taking the job at a
lower number to keep a good client and build the portfolio is a business decision, not an
exception to route around the system.

**Every automatic path resolves price from the rate card on purpose (RULE 1). This is the one
endpoint that accepts a price verbatim, which is why it is admin-only.**

```bash
curl -sS -X POST https://www.thelostandunfounds.com/api/booking/create-negotiated-quote \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Email: thelostandunfounds@gmail.com' \
  -d '{
    "clientEmail": "kelly@rubyhopehomesolutions.com",
    "clientName":  "Kelly Kohler",
    "eventType":   "Airbnb / Short-Term Rental",
    "eventDate":   "2026-08-10",
    "startTime":   "06:00",
    "location":    "1302 W 24th St, Austin TX",
    "listPrice":   335,
    "agreedPrice": 300,
    "reason":      "Returning client"
  }'
```

It creates the booking record the job needs and hands off to `createQuoteForBooking()`; the same
path the website uses, so a negotiated job produces an identical invoice, Stripe deposit link and
branded email.

**Always send `listPrice` alongside `agreedPrice`.** The difference renders as its own line item
("Adjustment: Returning client"), so:

- the client sees what they were given rather than just a lower number
- the record explains the price to whoever reads it months later
- the rate card stays intact: one client's deal does not become the new price

Never quietly bill less by passing only `agreedPrice`. An invoice that shows $300 with no context
looks like the list price, and the next quote at $335 reads as a rise.

### When to hold the line

Discounting is not automatic generosity. A price is worth holding when the schedule is tight, the
property is large enough that the work does not shrink with the fee, or the client is new and has
no history to reward. Concede for repeat clients, multi-unit portfolios and work that will be
shown publicly: those buy something back.

## Pitfalls that have actually happened

- **`invoice_number` not selected** in the webhook's invoice query; the confirmation email
  referenced it and would have read `undefined` to the client.
- **Deposit paid in silence**: status advanced, no email. Found only by reading the handler.
- **Discount recorded, never applied**: the code landed in `bookings.notes` and relied on a human
  remembering it at invoicing time.
- **Booking with no price**: `create-quote` requires `totalPrice`, and the form captured no
  property size, so nothing could be quoted automatically until the tier was collected.

## RULE 7: Nothing is confirmed, and nobody is dispatched, until the deposit clears

A booking with no deposit is a request, not a job. Until `deposit_paid_at` is set, **no email may
tell anyone, client or subcontractor, that the shoot is happening.**

This failed on booking `81e3b35c`. The request came in unpaid and a subcontractor was sent
"Shoot assigned: Tue Aug 11, 6AM" the same hour. The deposit never arrived, the slot then had to
move for an unrelated conflict, and the photographer was left holding a call time for a job that
was never secured. The client-facing acknowledgement was worded correctly; *"nothing is
finalized until… the 50% deposit"*, but the dispatch email behind it contradicted that.

Gate on the money, not on the request existing:

```ts
if (!booking.deposit_paid_at) return   // no assignment mail, no confirmation mail
```

| Event | Safe before deposit? |
|---|---|
| "We got your request" to client | Yes, as long as it does not state the date is held |
| Quote + deposit link to client | Yes; that is the ask for money |
| Internal inquiry alert to `media@` | Yes; internal |
| **"Shoot assigned" to subcontractor** | **No** |
| **"Booking confirmed" to client** | **No** |

The deposit-paid webhook is the natural trigger for both. A date that someone has been told to
show up for, without a deposit behind it, is a commitment made on the client's behalf that the
client has not made.

Rescheduling has the same constraint in reverse: when a time moves, everyone already told the old
time must be re-notified. The booking row is the source of truth for the time; mail already
delivered does not update itself.
