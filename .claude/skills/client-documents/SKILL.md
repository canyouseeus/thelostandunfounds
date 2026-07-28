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

### Current state — read this before starting

Proposals are **hand-built per client** and there is no shared component:

| File | Lines |
|---|---|
| `src/templates/silva-star/SilvaStarProposal.tsx` | 407 |
| `src/templates/fadebox/FadeboxProposal.tsx` | 288 |

Neither imports a shared brand module. They are copy-paste siblings and have **already drifted** —
Silva Star uses `#1a1a1a`, Fadebox uses `#ededed`, for otherwise equivalent surfaces.

**So: start from the most recent existing proposal and adapt it. Never write one from a blank
file.** Copying forward is the only thing currently keeping these consistent.

### Canonical proposal spec

Shared by both existing proposals — treat as the standard:

- **Palette**: `#0a0a0a` (ink), `#3a3a3a`, `#7a7a7a` (muted), `#d8d8d8`, `#f5f5f5` (page), `#ffffff`
- **Typography**: uppercase with heavy letter-spacing — `.22em` to `.42em` — at small sizes
  (8–13px) for labels, eyebrows and section headers. Headline sentences are sentence case.
- **No rounded corners.** Both files contain zero `rounded` classes. Keep it that way.
- **No shadows.** Both files contain zero `shadow` classes. Keep it that way.

> **Hairline rules are allowed here.** Proposals and invoices are print-style documents and use
> thin rules for structure. This is a deliberate exception to the app-wide `no-border-design`
> rule, which governs the web UI, not client documents. Do not strip rules out of a proposal or
> invoice in the name of that skill.

### When adding a client

`src/templates/<client>/` holds that client's `Landing`, `Dashboard` and optionally `Proposal`.
Kattitude currently has a Landing and Dashboard but **no Proposal** — if one is needed, copy the
most recent proposal rather than inventing a layout.

---

## Checklist

- [ ] Invoice created as an `invoices` row, not authored markup
- [ ] `pdf_token` set; PDF linked via `/api/invoices/pdf?id=…&token=…`
- [ ] No hand-written invoice HTML or PDF anywhere in the change
- [ ] Proposal copied forward from the most recent one, not written fresh
- [ ] Palette and letter-spaced uppercase treatment match the spec above
- [ ] No `rounded-*`, no `shadow-*`
- [ ] Sent through the `email-delivery` path, with `brand-email-manager` rules applied

## Known gap

There is no shared proposal layout component. Until one is extracted, consistency depends on
copying forward, which is how the `#1a1a1a` / `#ededed` drift happened. Extracting a shared
proposal shell is the durable fix — it touches two live client-facing pages, so it needs a
deliberate pass rather than an incidental one.
