---
name: email-rendering
description: How THE LOST+UNFOUNDS emails actually render in mail clients, and why the inbox is not evidence of the template. Use whenever changing email colours, the email shell or buttons, or when an email "looks wrong" in someone's inbox. Triggers on "email looks wrong", "dark mode", "email background", "email button", "white text", "inverted", "outlined box", "Gmail", "Apple Mail", "Outlook".
---

# Email Rendering

`brand-email-manager` owns **what the brand is**. `email-delivery` owns **how mail is sent**.
This skill exists for one reason: **what you see in an inbox is not what the template says**,
and changing the brand to chase a screenshot has already caused one production-wide mistake.

## RULE 1 — The email body is a WHITE panel under a BLACK banner

```
Banner:     black PNG with white type (an image; not painted by the palette)
Background: #ffffff
Text:       #000000
textMuted:  #666666
border:     #dddddd
link:       #000000
```

The owner set this directly on 2026-08-13: *"I don't want a black background, white text
email."* The banner stays black; the body under it is a white page with black type.

**This reverses what this skill said before, and the reversal is deliberate.** Do not "restore"
the black body on the strength of this file's history or an old comment in a handler.

### The trap that still applies

**Gmail on iOS inverts whatever you send.** It previously turned the black email white; it now
turns this white email dark. An inbox screenshot shows one client's transform, never the
template. The history here is that the palette was flipped in *both* directions on the strength
of screenshots, and both flips were argued from a phone.

So the rule is not "the brand is black" or "the brand is white" — it is: **check the source, and
change the palette only when the owner says to.**

```bash
grep -n "background: '#" lib/email-template.ts api/email-template.ts
npx tsx scripts/audit-email-contrast.ts
```

## RULE 2 — `color-scheme: light` DOES stop Gmail darkening the email

Every email shell must carry both of these in `<head>`:

```html
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
```

**This was previously documented here as not working. That was wrong**, and the owner disproved
it from his own inbox on 2026-08-13: two emails, same phone, same Gmail, same dark mode. The
photo-delivery email rendered as a white panel; the newsletter rendered dark. The only
difference was this declaration. `lib/email-template.ts` had it, and the newsletter's separate
shell in `_newsletter-send-handler.ts` did not.

Do **not** "upgrade" it to `light dark`. That declares the email supplies its own dark
rendering, and the client will duly darken it. Adding a `prefers-color-scheme: dark` block has
the same effect and was reverted for that reason.

Still true:

- `[data-ogsc]` / `[data-ogsb]` are **Gmail Android only**, inert on Gmail iOS.
- Inline `!important` protects a declaration, not a whole-message transform.

### The lesson that outlives the specific fact

The wrong version of this rule survived here because it sounded authoritative and nobody
retested it. It then cost the owner an hour of being told his request was impossible while he
was looking at an email that did it. **When the owner says he can see something working, he is
holding better evidence than this file.** Go find the difference between the two messages
instead of explaining why what he sees cannot happen.

## RULE 3 — A button is a solid fill, never an outline

The button inverts the body. On the white body that means a **solid black fill with white
text**, which is the same expression as before — it reads from the palette rather than naming
colours, so it followed the palette across the flip:

```
background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background} !important;
```

Accent panels (the amount-due block on a payment email) invert the same way: black block,
white figure.

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
