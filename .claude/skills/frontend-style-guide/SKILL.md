---
name: frontend-style-guide
description: Strict design rules and style preferences for the frontend. Use when creating or modifying any UI component, page layout, or styling. Critical rules include no borders, monochrome palette, uppercase typography.
---

# Frontend Style Guide & Design Rules

## CRITICAL RULES
1. **NO BORDERS** — see `no-border-design` skill for the full authoritative rule. Short version: never use any `border-*` class or `border:` CSS on any element. Use `bg-white/5` or spacing for separation.

2. **NO VIEWPORT CLIPPING**: Nothing may be positioned outside the visible screen at any viewport width (test down to 320px). This applies to every page, modal, and admin panel.
   - **Tab bars / nav rows / pill groups**: must `flex-wrap` OR `overflow-x-auto` with `flex-shrink-0` on items — never a fixed `flex` row that silently overflows.
   - **Long text** (titles, slugs, emails): use `truncate` or `break-words` on a `min-w-0` flex child so it shrinks instead of pushing siblings off-screen.
   - **Tables / wide content**: wrap in `overflow-x-auto` and give the inner table a `min-w-` so rows scroll inside their container, not the page.
   - **Padding on mobile**: prefer responsive padding (`px-3 sm:px-6`) over fixed `px-6`+ on multi-item rows — 4 tabs × `px-6` already overflows a 375px iPhone.
   - **Absolute/fixed elements** (FABs, overlays): must not cover primary content; if they overlap a scroll list, add bottom padding so the last row clears the button.
   - **Review checklist before committing any UI change**: mentally render at 320px, 375px, 768px. If any tab/button/row/text would be cut off or require horizontal page scroll, fix it before shipping.

## Colors
- **Black & White**: Prefer pure black (`bg-black`) and white (`text-white`) for high contrast elements like metadata cards, avoiding `zinc` or gray backgrounds for strictly black/white requested areas.

## Typography
- Use `uppercase`, `tracking-widest`, and bold fonts for labels and headers to maintain the premium aesthetic.
