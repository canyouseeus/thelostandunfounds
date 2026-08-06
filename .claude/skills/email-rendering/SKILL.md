---
name: email-rendering
description: How THE LOST+UNFOUNDS emails actually render in mail clients — colour scheme, dark-mode inversion, bulletproof buttons, and the test protocol. Use whenever changing email colours, the email template shell, buttons, or when an email "looks wrong" in someone's inbox. Triggers on "email looks wrong", "dark mode", "email background", "email button", "white text", "inverted", "Gmail", "Apple Mail".
---

# Email Rendering

`brand-email-manager` owns *what the brand is*. `email-delivery` owns *how mail is sent*.
**This skill owns what the recipient's client actually draws on screen** — which is not the
same as what the template specifies.

## The palette (authoritative)

- Banner: black block with white type (an image — `https://www.thelostandunfounds.com/brand/banner.png`)
- Body: **white background `#ffffff`, black text `#000000`**
- Buttons: **solid black fill `#000000`, white text `#ffffff`, no border**
- Muted text: `#666666`

## RULE 1 — `color-scheme` must be `light dark`, never a single value

```html
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```

**Declaring a single scheme causes clients to invert the email.** This is the single most
expensive mistake in this codebase's email history, and it has now happened in both directions:

| Template declared | Gmail rendered |
|---|---|
| `content="dark"` + CSS `light dark` | **light** (inverted the dark body to white) |
| `content="light"` + CSS `light` | **dark** (inverted the white body to grey) |

Declaring **both** schemes tells the client the message manages its own colours, so it leaves
them alone. Do not "tidy" this to a single value to match the palette — it looks correct and
produces the opposite result.

## RULE 2 — restate the palette under Gmail's dark-theme attributes

Gmail on Android/iOS applies dark theme by **rewriting the DOM**, adding `data-ogsc`
(original-styles-colour) and `data-ogsb` (original-styles-background) attributes and
recolouring anything it believes is unstyled. The template restates the palette under those
selectors:

```css
[data-ogsc] body, [data-ogsb] body,
[data-ogsc] table, [data-ogsb] table,
[data-ogsc] td, [data-ogsb] td { background-color: #ffffff !important; }
[data-ogsc] p, [data-ogsb] p, /* h1-h3, ul, ol, li … */ { color: #000000 !important; }
```

**Anchors are deliberately excluded.** Buttons carry their own inline colours and must not be
swept up by a blanket text rule, or every CTA turns black-on-black.

## RULE 3 — buttons need `!important` on the fill, not just the text

```
background-color: #000000 !important; color: #ffffff !important;
```

Inline `!important` beats a stylesheet injected by the client, so the fill survives dark-theme
processing. Without it, Gmail can flip a black button to white while the white text stays
white — an invisible CTA.

### ❌ Never make a button visible with a border

The historical button filled itself with the *page* colour and relied on `border: 2px solid`
to be seen. On a black body that rendered as an empty outlined box. A button is a solid fill.
See `brand-email-manager` for the brand rule; this is why it exists.

## RULE 4 — check contrast mechanically, never by eye

A blanket find-and-replace across email colours **will** produce invisible text. It has:
a sweep once turned two client-facing buttons black-on-black and an amount-due panel
black-on-black, all of which looked fine in the diff.

After any colour change, run a contrast audit over `lib/api-handlers/*.ts`,
`lib/email-template.ts` and `api/email-template.ts`:

- flag any element setting a black background with black-ish text (and the white/white case)
- check **multi-line** too — `background-color` and `color` are often on different lines of the
  same rule, which a line-based grep misses
- check translucent colours: `rgba(255,255,255,…)` text and `border-top` dividers are invisible
  on white and are easy to forget

## RULE 5 — some files that look like email are not

`_newsletter-unsubscribe-handler.ts` renders **browser pages** (it has `<title>` tags and sends
no mail). The site is black; those pages must stay dark. Before recolouring a handler, check:

```bash
grep -c "<title>" <file>     # >0 → it renders a page, not an email
grep -c "sendEmail\|sendZohoEmail\|wrapEmailContent\|generateTransactional" <file>
```

## Testing protocol — a render is not verified until it is seen

1. Render the HTML locally and assert the palette in the output (banner present, no `<title>`,
   no SVG data URI, button `#000000` fill + `#ffffff` text, body `#ffffff`).
2. **Send a real test to `thelostandunfounds@gmail.com`** with a `[TEST]` subject prefix. Do not
   CC `media@` or a subcontractor on a test.
3. **Open it on a phone in dark mode.** Desktop light mode hides every problem in this document.
4. Only then send to a client.

Local assertions prove the template. They prove nothing about the client. Every rendering bug
here was invisible to local checks and obvious in a phone screenshot.

## Which template am I editing?

Two exist and must stay in step:

- `lib/email-template.ts` — used by most handlers and by anything composing mail locally
- `api/email-template.ts` — used by the booking payment path via `_booking-payment-utils.ts`

They previously derived the button from `colors.background` / `colors.text` in **opposite
orders**, producing two different buttons from the same constant names. Both now state button
colours literally. If you change one, change both.
