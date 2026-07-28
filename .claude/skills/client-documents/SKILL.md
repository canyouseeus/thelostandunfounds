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

- the brand banner, fetched from `https://www.thelostandunfounds.com/brand/banner.png`
- `BRAND` — name `THE LOST+UNFOUNDS`, tagline `PHOTOGRAPHY & VISUAL STORYTELLING`, website,
  `media@thelostandunfounds.com`
- the palette: `INK #000000`, `MUTED #888888`, `HAIRLINE #dddddd`
- page geometry: 56pt margins, 612pt page width, letter-spaced uppercase headings

Both live entry points — `api/invoices/pdf.ts` and `api/invoices/send.ts` — call it. **Create the
row and correct branding is automatic.** That is why the existing invoices all match.

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

### To make a new proposal

**Copy the most recent `public/*-proposal.html` and rewrite the content.** Do not start from a
blank file, and do not build one as a React component — that is a different, smaller lineage (see
below) and is not the deliverable format.

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
- [ ] Proposal created as `public/<client>-proposal.html`, copied from the most recent one
- [ ] Uses the shared class system and `--ink`/`--muted`/`--rule` variables, not literal hex
- [ ] `@page` Letter + `print-color-adjust:exact` retained
- [ ] Title reads `THE LOST+UNFOUNDS — Proposal for <Client>`
- [ ] No `rounded-*`, no `shadow-*`
- [ ] Sent through the `email-delivery` path, with `brand-email-manager` rules applied

## Known gap

The proposal CSS is duplicated in full inside each HTML file rather than shared from one
stylesheet. All five copies currently agree, so the system holds — but nothing enforces it, and
the React preview components have already drifted (`FadeboxProposal.tsx` uses `#ededed`). Pulling
the `:root` variables and the 20-class block into one included stylesheet is the durable fix.
