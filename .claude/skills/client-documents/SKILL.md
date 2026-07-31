---
name: client-documents
description: Canonical branding and generation rules for client-facing documents — invoices, quotes, and proposals. Use whenever asked to create, send, or restyle an invoice or a proposal for any client. Triggers on "invoice", "proposal", "quote", "estimate", "bill the client", "send them a quote", or any named-client document request.
---

# Client Documents (Invoices & Proposals)

Every client-facing document must look identical to the last one, without being told. If someone
has to say "make it like the one for Andrew" or "style it like Toke Truck", this skill has failed.

---

## Invoices

### The rule

**An invoice is a row in the `invoices` table. It is never a hand-written document.**

Do not author invoice HTML. Do not build a PDF. Do not write a one-off script that renders an
invoice. The visual design is not yours to make — it already exists in code and is applied
automatically.

### The canonical flow

1. **Insert a row** into `invoices`, including a random `pdf_token`.
2. **The PDF renders on demand** at `/api/invoices/pdf?id={invoice.id}&token={pdf_token}`.
3. **Email it** through `api/invoices/send.ts`.

Reference implementation to copy: **`api/booking/create-final-invoice.ts`** (see the insert at
~line 148). It is the worked example of doing this correctly.

Required columns on the insert:

```
client_id, booking_id, invoice_number, invoice_type, date, event_date,
description, line_items, subtotal, total, amount_due, status,
payment_method, pdf_token
```

### Why this guarantees consistency

`generateInvoicePdf()` in **`lib/api-handlers/_invoice-pdf.ts`** owns every visual decision:

- the brand banner, read from `public/brand/banner.png` **on disk** (cached per container).
  It is deliberately not fetched over HTTP — see the warning below.
- `BRAND` — name `THE LOST+UNFOUNDS`, tagline `PHOTOGRAPHY & VISUAL STORYTELLING`, website,
  `media@thelostandunfounds.com`
- the palette: `INK #000000`, `MUTED #888888`, `HAIRLINE #dddddd`
- page geometry: 56pt margins, 612pt page width, letter-spaced uppercase headings

Both live entry points — `api/invoices/pdf.ts` and `api/invoices/send.ts` — call it. **Create the
row and correct branding is automatic.** That is why the existing invoices all match.

### Brand assets are read from disk, never fetched — and the wordmark lives in the banner

Two rules in `_invoice-pdf.ts` that are easy to undo by accident:

**1. Never make a brand asset depend on a network fetch at render time.** The banner used to be
pulled from `https://www.thelostandunfounds.com/brand/banner.png` on every render, inside a bare
`catch {}`. When the site was down, every invoice rendered bannerless — structurally perfect, no
error, no log line. It read as "the agent ignored our branding" when the generator was working
exactly as written. It now reads `public/brand/banner.png` from disk; HTTP is a fallback only, and
a total miss logs `[invoice-pdf] BANNER MISSING`.

**2. The banner artwork already contains the wordmark.** `BRAND.name` is only drawn as text when
the banner is *absent*. Rendering both prints "THE LOST+UNFOUNDS" twice — once inside the image,
once beneath it. If you add a header element, check it against a rendered page, not just the code.

**3. Don't compute layout offsets from `doc.y` after `doc.image()`.** pdfkit does not advance the
cursor past an image placed at explicit coordinates, so `doc.y` still points at the top of the
page and the header draws *over* the banner in dark-on-black. Derive the drawn height from the
image's own aspect ratio (`pngSize()`).

> **Verify by rendering.** After touching this file, generate a PDF and look at the whole page —
> not just the thing you changed. Bugs 2 and 3 were both invisible while bug 1 was active, and
> both were obvious the moment a page was actually rendered and viewed.

### The failure mode this prevents

Asked to "create an invoice for [client]" with no skill loaded, an agent doesn't discover the
`invoices` table or `generateInvoicePdf`, so it writes its own HTML from scratch. The result is
off-brand and inconsistent with every invoice already sent. This has happened. If you find
yourself writing `<table>` markup for an invoice, stop — you are on the wrong path.

### Invoice email body

`api/invoices/send.ts` builds the email body and wraps it with `wrapEmailContent`. It uses
`Arial, Helvetica, sans-serif` for text and `'Courier New', monospace` for amounts, a 32px
letter-spaced uppercase `INVOICE` heading, and hairline rules between line items. Don't restyle
it per client. Delivery rules live in the `email-delivery` skill.

---

## Proposals

### Where they actually live

A client proposal is a **standalone print-ready HTML file at `public/<client>-proposal.html`.**
Not a React component. These are the real deliverables:

| File | Lines |
|---|---|
| `public/kattitude-proposal.html` | 646 |
| `public/kiosk-proposal.html` | 660 |
| `public/tattoo-artist-proposal.html` | 619 |
| `public/kattitude-phase2-proposal.html` | 613 |
| `public/silva-star-proposal.html` | 431 |

**All five share the same design system** — identical palette, identical font stack, and the same
20 CSS class names. Kattitude's shares 19 of its 20 classes with Silva Star's. This system is
working; do not reinvent it.

### The stylesheet — one source, inlined into every document

**`public/proposal.css` is the single source of truth.** Edit it there, never inside an HTML file,
then run:

```bash
npm run proposal:css          # write the shared CSS into every proposal
npm run proposal:css:check    # verify they're in sync (non-zero exit if stale)
```

`scripts/sync-proposal-css.mjs` rewrites only the region between these markers in each document:

```html
<!-- proposal-css:start -->
<style> …generated, do not edit… </style>
<!-- proposal-css:end -->
<style> …optional per-document overrides, hand-edited… </style>
```

**Why inlined rather than `<link href="/proposal.css">`:** proposals get attached to emails and
saved to disk. An external stylesheet would arrive completely unstyled. Every document must stay
self-contained. Never replace the inlined block with a `<link>`.

Per-document overrides go **after** the end marker and survive the sync. Keep them minimal —
genuine deviations only, not a second copy of the shared rules. Current overrides:

- `silva-star-proposal.html` — larger display type (`.cover-h1` 38px, `.pagehead h2` 32px /
  `max-width:18ch`) and a glyph bullet instead of the square block
- `kattitude-phase2-proposal.html` — `.pagehead h2{max-width:24ch}`, plus `.dep-grid` and `.flow`
  components that exist only in that document

> `max-width` on headings belongs to **`.pagehead h2`**, not `.subhead`. Putting it on the wrong
> selector changes where headings wrap and is not obvious from reading the CSS.

### Fonts are embedded — do not link to Google Fonts

`public/proposal.css` carries **Inter as base64 `@font-face` rules** (variable, weight 100–900,
roman + italic, latin subset — about 133 KB).

Proposals used to `<link>` Inter from `fonts.googleapis.com`. That fetch has to succeed at the
moment the document is displayed, which fails in exactly the cases that matter: attached to an
email, opened offline, or printed to PDF. A proposal rendered without it silently falls back to
Arial/Liberation and loses the letterforms the whole design depends on — this was confirmed by
inspecting a generated PDF, which had embedded `LiberationSans` rather than Inter.

**Never reintroduce a Google Fonts `<link>`, and never strip the `@font-face` blocks to save
space.** Self-contained is the requirement.

### PDF export

```bash
npm run proposal:pdf              # render every proposal to public/<client>-proposal.pdf
node scripts/proposal-pdf.mjs kattitude   # or filter to one
```

PDFs are committed and served statically, so each has a stable URL —
`https://www.thelostandunfounds.com/kattitude-proposal.pdf` — that can be linked in an email or
attached directly.

There is deliberately **no runtime PDF endpoint**. Proposals are static files, so changing one
already requires a deploy; generating ahead of time avoids shipping a headless browser into a
serverless function (`@sparticuz/chromium` is ~50 MB and sits near Vercel's limit). Invoices are
different — they hold per-client data, so they genuinely need `/api/invoices/pdf` at runtime.

**Regenerate the PDFs whenever a proposal or `proposal.css` changes**, otherwise the committed PDF
and the HTML drift apart. Verify page counts match the document's `.page` sections.

### To make a new proposal

**Copy the most recent `public/*-proposal.html` and rewrite the content.** The markers and the
inlined stylesheet come along with it; run `npm run proposal:css` afterwards to be certain it
matches. Do not start from a blank file, and do not build one as a React component — that is a
different, smaller lineage (see below) and is not the deliverable format.

### Verifying a change

These are client-facing documents. After editing `proposal.css`, confirm nothing shifted:

```bash
npm run proposal:css
# render before/after and compare — headless_shell is at
# /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
#   --headless --disable-gpu --no-sandbox --hide-scrollbars \
#   --virtual-time-budget=4000 --window-size=1100,9000 --screenshot=out.png file://…
```

A 1100×9000 window covers the longest proposal (kiosk, 7 pages). A shorter viewport only renders
the first page and will hide regressions further down.

### The shared class system

```
.page  .pagehead  .runhead  .runfoot          layout + running header/footer
.cover-brand  .cover-logo  .cover-label       cover block
.cover-h1  .cover-h1-sub  .cover-tag
.cover-body  .cover-grid  .cover-dates
.subhead  .rule  .rule-soft                   section structure
.callout  .compare  .invest  .sign            content blocks
```

### Palette — defined as CSS custom properties

```css
:root{
  --paper:    #ffffff;
  --ink:      #0a0a0a;
  --soft:     #3a3a3a;
  --muted:    #7a7a7a;
  --rule:     #1a1a1a;
  --rule-soft:#d8d8d8;
}
```

Use the variables, never literal hex. `#1a1a1a` is `--rule` — it is the standard, not a variant.

### Other conventions

- **Print-first**: `@page { size: Letter; margin: 0 }` plus `print-color-adjust:exact`. These are
  documents meant to be saved as PDF — keep both.
- **Font**: Inter from Google Fonts, weights 400–800, stack
  `'Inter','Helvetica Neue',Arial,sans-serif`.
- **Title convention**: `THE LOST+UNFOUNDS — Proposal for <Client Name>`.
- **Typography**: uppercase with heavy letter-spacing (`.22em`–`.42em`) at small sizes (8–13px)
  for labels, eyebrows and running heads. Headline sentences are sentence case.
- **Structure**: cover → positioning line → scope → comparison → pricing → sign-off. The
  positioning line is second person and names the client's work
  ("You create the art. The platform runs the studio." / "You run the trucks. The site brings the
  work."). Keep that voice.
- **No rounded corners, no shadows.**

> **Hairline rules are allowed here.** Proposals and invoices are print-style documents and use
> thin rules (`--rule`, `--rule-soft`) for structure. This is a deliberate exception to the
> app-wide `no-border-design` rule, which governs the web UI, not client documents. Do not strip
> rules out of a proposal or invoice in the name of that skill.

### The React preview lineage — separate, don't confuse them

`src/templates/<client>/` holds in-app preview routes: `Landing`, `Dashboard`, and for two clients
a `Proposal` component (`SilvaStarProposal.tsx`, `FadeboxProposal.tsx`, routed at
`/silva-star/proposal` and `/fadebox-preview/proposal`). These are **web previews, not the sent
document.**

They have drifted from the HTML system: `FadeboxProposal.tsx` uses `#ededed` where everything else
uses `--rule-soft #d8d8d8`. If you touch it, bring it back in line rather than copying the
deviation forward.

---

## Checklist

- [ ] Invoice created as an `invoices` row, not authored markup
- [ ] `pdf_token` set; PDF linked via `/api/invoices/pdf?id=…&token=…`
- [ ] No hand-written invoice HTML or PDF anywhere in the change
- [ ] If `_invoice-pdf.ts` was touched: rendered a test PDF and viewed the whole page
- [ ] Banner present, wordmark appears exactly once, header clear of the banner
- [ ] Proposal created as `public/<client>-proposal.html`, copied from the most recent one
- [ ] Shared CSS edited in `public/proposal.css` only, then `npm run proposal:css` run
- [ ] `npm run proposal:css:check` passes
- [ ] `npm run proposal:pdf` re-run so the committed PDFs match the HTML
- [ ] Inter still embedded as `@font-face`; no Google Fonts `<link>` reintroduced
- [ ] Document still self-contained — inlined `<style>`, no `<link>` to an external sheet
- [ ] Uses the shared class system and `--ink`/`--muted`/`--rule` variables, not literal hex
- [ ] `@page` Letter + `print-color-adjust:exact` retained
- [ ] Title reads `THE LOST+UNFOUNDS — Proposal for <Client>`
- [ ] No `rounded-*`, no `shadow-*`
- [ ] Rendered before/after at 1100×9000 and compared, if the shared CSS changed
- [ ] Sent through the `email-delivery` path, with `brand-email-manager` rules applied

## Known gaps

**Invoice brand identity is duplicated.** There are two `BRAND` objects:

- `lib/email-template.ts` exports the shared one — name, logo, website, and a dark-mode palette
  (`background #000000`, `text #ffffff`, `textMuted #999999`, `border #1a1a1a`). `api/invoices/send.ts`
  correctly imports it for the email body.
- `lib/api-handlers/_invoice-pdf.ts` defines its **own private** `BRAND` — name, tagline, website,
  email — plus `INK #000000`, `MUTED #888888`, `HAIRLINE #dddddd`.

The palettes *should* differ: the email is dark, the PDF is ink-on-paper. But the identity fields
are duplicated and have already drifted — `website` is `https://www.thelostandunfounds.com` in one
and `thelostandunfounds.com` in the other, and the muted grey is `#999999` vs `#888888`. Lifting
name/website/tagline into a shared `lib/brand.ts` would fix it; the two palettes stay separate.

**React preview components.** `FadeboxProposal.tsx` still uses `#ededed` where the HTML system
uses `--rule-soft #d8d8d8`. Those components are not covered by the sync script.
