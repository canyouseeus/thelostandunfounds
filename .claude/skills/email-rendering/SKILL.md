---
name: email-rendering
description: How THE LOST+UNFOUNDS emails actually render in mail clients, and why the inbox is not evidence of the template. Use whenever changing email colours, the email shell or buttons, or when an email "looks wrong" in someone's inbox. Triggers on "email looks wrong", "dark mode", "email background", "email button", "white text", "inverted", "outlined box", "Gmail", "Apple Mail", "Outlook".
---

# Email Rendering

`brand-email-manager` owns **what the brand is**. `email-delivery` owns **how mail is sent**.
This skill exists for one reason: **what you see in an inbox is not what the template says**,
and changing the brand to chase a screenshot has already caused one production-wide mistake.

## RULE 1 — The brand is a BLACK email. Do not change it because an inbox looks white.

```
Background: #000000
Text:       #ffffff
```

Every branded email is authored this way — `lib/email-template.ts`, `api/email-template.ts`,
the newsletter template in `_newsletter-send-handler.ts`, the welcome email. This is
consistent and deliberate.

**Gmail on iOS inverts it.** A black email is displayed as white with black text. That
inverted rendering looks like a white-background brand, and it is not one.

This actually happened: a screenshot of a white-looking email was taken as proof that the
brand was white-on-black-banner, the whole palette was flipped to `#ffffff` across two
templates and fourteen handlers, and Gmail then inverted *that* — showing a dark email and
producing the exact opposite of the intent. **Both directions were "verified" by screenshot
and both were wrong.**

Before concluding the palette is wrong, check what the template actually contains:

```bash
grep -n "background: '#" lib/email-template.ts api/email-template.ts
git show <commit>:lib/api-handlers/_newsletter-send-handler.ts | grep "background-color"
```

If those say `#000000`, the brand is black and the inbox is inverting. That is not a bug to fix.

## RULE 2 — You cannot opt out of dark-mode inversion

- `color-scheme: light` does **not** prevent it — declaring a single scheme is what invites a
  client to convert the message.
- `color-scheme: light dark` says "this email handles dark mode itself", which also permits
  conversion.
- `[data-ogsc]` / `[data-ogsb]` overrides are **Gmail Android only**. They are inert on Gmail
  iOS, which is where this was being tested.
- Inline `!important` protects a specific declaration, not the client's whole-message transform.

Design so the email is correct as authored. Do not add machinery that tries to defeat a
client's dark mode; it will not work and it obscures the real palette.

## RULE 3 — A button is a solid fill, never an outline

On a black body the button is a **solid white fill with black text**:

```
background-color: ${BRAND.colors.text}; color: ${BRAND.colors.background} !important;
```

### ❌ Never fill a button with the page colour and add a border

The historical `lib` button was `background-color: <page black>` + `border: 2px solid <white>`.
The fill was invisible, so the border was the only thing making the button visible — it
rendered as an empty outlined box, which is not the brand and violates the no-border rule.

Note the two templates previously derived the button from `colors.background` / `colors.text`
in **opposite orders**, producing two different buttons from identical constant names. They
now state it identically. **If you change one, change both.**

## RULE 4 — Verify contrast mechanically, never by eye

A find-and-replace across email colours **will** produce invisible text. It has: one sweep
turned two client-facing buttons black-on-black and an amount-due panel black-on-black, none
of which was obvious in the diff.

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

## Testing protocol

1. Render locally and assert the palette: banner present, no `<title>`, no SVG data URI,
   body `#000000`, text `#ffffff`, button white fill with black text.
2. Send a `[TEST]`-prefixed message to `thelostandunfounds@gmail.com`. Never CC `media@` or a
   subcontractor on a test.
3. When judging a screenshot, **state which client and whether dark mode is on** before drawing
   any conclusion about the template. A dark-mode phone shows the inverse of the truth.
4. Only then send to a client.

A local assertion proves the template. A screenshot proves one client's rendering. Neither
proves the other.
