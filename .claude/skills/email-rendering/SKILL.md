---
name: email-rendering
description: How THE LOST+UNFOUNDS emails actually render in mail clients, and why the inbox is not evidence of the template. Use whenever changing email colours, the email shell or buttons, or when an email "looks wrong" in someone's inbox. Triggers on "email looks wrong", "dark mode", "email background", "email button", "white text", "inverted", "outlined box", "Gmail", "Apple Mail", "Outlook".
---

# Email Rendering

`brand-email-manager` owns **what the brand is**. `email-delivery` owns **how mail is sent**.
This skill exists for one reason: **what you see in an inbox is not what the template says**,
and changing the brand to chase a screenshot has already caused one production-wide mistake.

## RULE 1 — The brand is a BLACK email. It renders WHITE in the owner's Gmail.

```
Background: #000000
Text:       #ffffff
Banner:     black PNG (an image; never repainted, and never inverted by a client)
```

**Gmail on iOS inverts every email it receives, and this is the entire point.** The owner reads
his mail there. A black email arrives and Gmail displays it as a white page with black type and
a solid black button. That inverted view is what he considers correct, and it is produced by
the BLACK source.

### The whole day this cost, in one table

On 2026-08-13 the palette was flipped to white because the owner said *"I don't want a black
background, white text email"* while pointing at a screenshot of a white-looking email. Then:

| Email | Authored | Gmail iOS showed | Owner's verdict |
|---|---|---|---|
| Photo delivery, 14:36 | **black** | white page, black button | "this is correct" |
| TEST 7 / 8 / 10 | **white** | dark page, white button | "this is not correct" |

The email he held up as proof that white was possible **was the black brand**, pulled from the
Zoho Sent folder and confirmed: `bgcolor="#000000"`, `meta content="dark"`, sent five hours
before the white palette deployed.

So the request "make it white like that one" is satisfied by KEEPING IT BLACK.

### What this means for you

- Do not flip the palette on the strength of a screenshot. A screenshot shows a client's
  transform, never the source.
- When the owner points at an email as the reference, **fetch that email's source** before
  changing anything. It is one call:
  `/api/mail/messages?folderId=<sent>` then `/api/mail/message?id=<id>&folderId=<sent>`.
  That single step would have saved the entire afternoon.

```bash
grep -n "background: '#" lib/email-template.ts api/email-template.ts
npx tsx scripts/audit-email-contrast.ts
```

## RULE 2 — You cannot opt out of Gmail iOS inversion. Every attempt was tried.

All of these were tried on 2026-08-13 and none of them worked:

- `color-scheme: light` + `supported-color-schemes: light`. **Does not prevent it.** It was
  briefly documented here as the fix; that was wrong and was disproved by TEST 8.
- `color-scheme: light dark` plus an authored `@media (prefers-color-scheme: dark)` block.
  Reverted: it tells the client the email handles dark mode, so the client darkens it.
- `[data-ogsc]` / `[data-ogsb]`. **Gmail Android only**, inert on Gmail iOS.
- Inline `!important`. Protects a declaration, not a whole-message transform.
- Sending via Zoho instead of Resend. **TEST 10 ruled transport out**: same body, sent from the
  same `admin` address through the same Zoho path as the email the owner approved, still
  darkened.

Apple Mail, the Outlook apps and ProtonMail *do* honour `prefers-color-scheme`, so an authored
dark block is not useless in general. It is useless for the owner, and it actively broke the
black brand's rendering for him, which is why it is not in the templates.

Design so the email is correct as authored, in black, and let Gmail invert it.

## RULE 3 — A button is a solid fill, never an outline

On the black body the button is a **solid white fill with black text**, which is what Gmail
inverts into the SOLID BLACK button the owner asks for:

```
background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background} !important;
```

Accent panels (the amount-due block on a payment email) follow the same rule: white block,
black figure, which inverts to a black block in Gmail.

**If the owner asks for a black button, the source stays a WHITE fill.** Authoring a black fill
on the black body is the invisible-button bug, twice shipped.

### ❌ Never fill a button with the page colour and add a border

The historical `lib` button was `background-color: <page black>` + `border: 2px solid <white>`.
The fill was invisible, so the border was the only thing making the button visible — it
rendered as an empty outlined box, which is not the brand and violates the no-border rule.

Note the two templates previously derived the button from `colors.background` / `colors.text`
in **opposite orders**, producing two different buttons from identical constant names. They
now state it identically. **If you change one, change both.**

## RULE 4 — Verify contrast mechanically, never by eye

```bash
npx tsx scripts/audit-email-contrast.ts
```

That script is the check. It renders the real template, verifies the palette pairs, scans every
`style="…"` in the email handlers for a fill and a type colour that do not contrast, and rejects
bordered buttons and translucent white. Run it after any colour change.

A find-and-replace across email colours **will** produce invisible text. It has, in both
directions: one sweep turned two client-facing buttons black-on-black, and the white-body sweep
found a payment button and an amount-due figure that had been invisible for some time and were
not noticed by eye.

After any colour change, audit `lib/api-handlers/*.ts`, `lib/email-template.ts` and
`api/email-template.ts` for:

- black background with black-ish text, and the white/white case
- **multi-line** rules — `background-color` and `color` are usually on different lines, which a
  line-based grep misses
- translucent colours — `rgba(255,255,255,…)` text and `border-top` dividers vanish on white
- buttons specifically, since they legitimately invert the body palette

## RULE 5 — Some files that look like email are not

`_newsletter-unsubscribe-handler.ts` renders **browser pages** — it has `<title>` tags and
sends no mail. The site is black, so those pages must stay dark. Recolouring them as if they
were email makes them black-on-black.

```bash
grep -c "<title>" <file>   # >0 → browser page, not email
grep -c "sendEmail\|sendZohoEmail\|wrapEmailContent\|generateTransactional" <file>
```

## RULE 6 — The test loop. Run it until the owner approves.

**Never send a client-facing email that the owner has not approved from a test.** The loop is:

1. Make the change.
2. **Send a `[TEST n]` email to `thelostandunfounds@gmail.com`** — unprompted, in the same turn
   as the change. Never wait to be asked.
3. **Tell them you sent it**, which number it is, and the specific thing to look at.
4. They approve, or they ask for a change.
5. If they ask for a change: make it, **send another test**, notify again. Increment the number.
6. Repeat from 4. Only an explicit approval ends the loop.

There is no step where a change goes out without a fresh test behind it. A revision to an
already-tested email is a new email and needs its own test — do not assume a small edit is
safe because the previous version looked right.

This is not optional politeness. Every email rendering defect in this codebase's history was
invisible to local checks and obvious in a phone screenshot: the outlined button, the inverted
palette, the black-on-black CTAs. A render assertion proves the HTML string. It proves nothing
about the inbox, and the inbox is the product.

The failure mode to avoid: making a change, asserting the palette locally, reporting success,
and leaving the owner to find the problem in their own inbox. That happened repeatedly in one
session, and each round cost a full exchange.

```bash
# part of the change, not a response to a request
node --experimental-strip-types <render-script>.mjs   # assert palette locally
curl -sS -X POST https://www.thelostandunfounds.com/api/mail/send \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Email: thelostandunfounds@gmail.com' \
  --data @<payload>.json                              # [TEST n] to admin only, no CC
```

Then name the one thing that test can actually settle.

## RULE 7 — A bare URL in an email body is styled by the mail client, not by us

Dropping a raw `https://…` into email text hands the styling to the recipient's client. It
auto-links it and paints it in **its own default blue with an underline** — the one colour the
brand never uses. The template is not consulted. This reached a client on QUO-002: a Stripe
deposit URL was passed as plain text in the `message` field of `/api/invoices/send`, and iOS
Mail rendered it as blue link text where the brand calls for a solid black-fill button.

Any URL a recipient is meant to click is an anchor carrying `EMAIL_STYLES.button`:

```ts
`<a href="${url}" style="${EMAIL_STYLES.button}">PAY DEPOSIT — $150</a>`
```

Per RULE 3 that resolves to a solid fill with inverted text — on the black body, white fill and
black text. Never a bare URL, and never a bare URL *plus* a button: the client will still
auto-link the loose one and the email ends up with two competing CTAs in two different colours.

**The trap in `/api/invoices/send`:** its `message` parameter is rendered by
`buildPersonalMessageBody()`, which runs the text through `escapeHtml()` and wraps it in `<p>`
tags. It cannot emit an anchor — any markup passed in comes out as visible literal text. So the
payment button must come from the body builder, not from the caller's message. The payment link
also lives in the attached PDF (`generateInvoicePdf` takes `paymentUrl`), which is why this
defect still *worked* and was easy to miss: the client could pay, it just looked wrong.

`buildBookingPaymentEmailBody()` in `_booking-payment-utils.ts` already does this correctly and
is the reference. If a payment email needs a button, route it through a body builder that has
one rather than typing a URL into a message field.

## Testing protocol

1. Render locally and assert the palette: banner present, no `<title>`, no SVG data URI,
   body `#000000`, text `#ffffff`, button white fill with black text.
2. Send a `[TEST]`-prefixed message to `thelostandunfounds@gmail.com` **without being asked**.
   Never CC `media@` or a subcontractor on a test.
3. When judging a screenshot, **state which client and whether dark mode is on** before drawing
   any conclusion about the template. A dark-mode phone shows the inverse of the truth.
4. Only then send to a client.

A local assertion proves the template. A screenshot proves one client's rendering. Neither
proves the other.
