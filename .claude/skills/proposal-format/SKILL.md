---
name: proposal-format
description: Defines the standard format for all client-facing business proposals. Use whenever creating a proposal, quote document, or business pitch for any client. All proposals must match the ROA Industries proposal format exactly — black ink on white background, no dark themes, no colored accents.
---

# Proposal Format Standard

All client proposals produced by THE LOST+UNFOUNDS must match the ROA Industries Unlimited proposal format. This is a binding standard — do not apply the noir-design or any dark-theme aesthetic to proposals.

## Document Format
- **File type**: Self-contained HTML file, printable to PDF via browser
- **Location**: `public/[client-slug]/proposal.html`
- **Pages**: 3 pages (Cover, Scope, Investment)
- **Reference file**: `/public/roa/` — the ROA Industries proposal is the canonical example

## Color & Design
- **Background**: `#ffffff` (pure white) — never dark, never cream, never colored
- **Ink**: `#000000` or `#0a0a0a` — pure black text
- **Muted text**: `#555555` for labels, captions, running headers/footers
- **Lines/rules**: `#cccccc` — light gray horizontal rules
- **No accent colors** — no brand colors from the TLOU site, no noir palette
- **Callout box** (optional): Black background (`#000`) with white text — used sparingly on page 3

## Typography
- **Headlines**: Space Grotesk, 800 weight, uppercase, large (48–62px)
- **Section labels**: Space Grotesk, 8px, 0.22em letter-spacing, uppercase, muted color
- **Body copy**: Inter, 13.5px, line-height 1.78
- **Running headers/footers**: Space Grotesk, 8px, uppercase, muted

## Layout (3 pages)

### Page 1 — Cover
- Running header: "The Lost+Unfounds · [Client] Proposal" | "Page 1 / 3"
- TLOU logo (grayscale filtered), centered
- Brand name + tagline, centered
- "PROPOSAL" label
- Large bold title (the service being proposed)
- Italic subtitle: "Prepared for [Client Name]"
- Parties table: PREPARED BY (left) | PREPARED FOR (right), divided by horizontal rule
- Dates row: PROPOSAL DATE | VALID THROUGH
- Running footer: [client tagline] | "Page 1 / 3"

### Page 2 — Scope / What You Get
- "01 · THE OPPORTUNITY" section label
- Bold headline describing the core problem being solved
- 2 paragraphs of body copy
- "02 · WHAT YOU GET" section label
- Bulleted deliverables list (■ marker, bold item name — description)
- "ALSO INCLUDED" sub-label with secondary bullet list

### Page 3 — Investment & Next Steps
- "03 · INVESTMENT & NEXT STEPS" section label
- Bold headline (e.g., "ONE PRICE. NO SURPRISES." or "YOUR TOOLS. YOUR TERMS.")
- Brief intro paragraph
- Pricing table: ITEM | FREQUENCY | PRICE columns, with item name + description sub-text
- Black callout box with centered explanatory text (optional)
- TIMELINE & PAYMENT TERMS centered section
- Acceptance clause paragraph
- Signature block: "FOR THE LOST AND UNFOUNDS LLC." | "FOR [CLIENT]"

## Print
- Include a "Save as PDF" button (hidden on print via `@media print`)
- Use `@page { size: letter; margin: 0; }` and `page-break-after: always` per page div
- Page width: 8.5in, min-height: 11in

## What NOT to do
- Do not use dark backgrounds (`#0a0a0a`, `#111`, `#1a1a1a`)
- Do not use colored accents (no copper, crimson, purple, etc.)
- Do not apply the noir-design skill
- Do not use the ROA landing page style — that is a marketing site, not a proposal
