---
name: frontend-style-guide
description: Strict design rules and style preferences for the frontend. Use when creating or modifying any UI component, page layout, or styling. Critical rules include no borders, monochrome palette, uppercase typography.
---

# Frontend Style Guide & Design Rules

## CRITICAL RULES
1. **NO BORDERS, NO SHADOWS**:
   - Never use a `border-*` class on any element. No exceptions in shipped code — if you add one
     temporarily for debugging, remove it before committing.
   - Never use `shadow-*`, arbitrary `shadow-[...]`, glows, gradients, `ring-*`, or `outline`.
     Shadows are not a substitute for borders; the surface is flat.
   - `divide-x` / `divide-y` compile to borders — banned too.
   - Use padding, spacing, or background color differences (`bg-white/5`, `bg-white/10`) to
     separate elements. `backdrop-blur-*` is fine on overlays.
   - `borderRadius: 0` is **radius**, not a border — keep it (see `noir-design`). Corners are
     square by default; `rounded-*` is allowed only on the Platform Console Tray / tool-dock pill.
   - **bento-cards**, **gallery items**, and **widgets** must be borderless.
   - The `no-border-design` skill is the authority here; it wins over any other design skill.

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
