---
name: Frontend Style Guide
description: Strict design rules and style preferences for the frontend.
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

## Colors
- **Black & White**: Prefer pure black (`bg-black`) and white (`text-white`) for high contrast elements like metadata cards, avoiding `zinc` or gray backgrounds for strictly black/white requested areas.

## Typography
- Use `uppercase`, `tracking-widest`, and bold fonts for labels and headers to maintain the premium aesthetic.
