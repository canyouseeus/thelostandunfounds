---
name: noir-design
description: Enforces the Noir aesthetic standards - monochrome palette, sharp geometry, uppercase typography, glassmorphism effects. Use when creating or modifying any UI component, page, or design element. Primary design system for the site.
---

# Noir Design Skill

This skill ensures that all UI elements adhere to the project's signature "Noir" aesthetic.

## Core Design Principles

### 1. Color Palette (Monochrome)
- **Background**: ALWAYS `#000000` (Pure Black).
- **Text**: `#ffffff` (Pure White) or `rgba(255, 255, 255, 0.87)` for secondary text.
- **Borders**: `1px solid #ffffff` or semi-transparent white `rgba(255, 255, 255, 0.1)`.

### 2. Geometry & Borders
- **No Rounded Corners**: Set `border-radius: 0 !important` on all buttons, cards, and containers.
- **Borders**: Use rigid, thin borders. Avoid heavy shadows; use thin white outlines instead.

### 3. Typography
- **Font**: Use `Inter` or system sans-serif.
- **Case**: Use **UPPERCASE** for headers (h1, h2) and important navigation items to emphasize the "Noir" look.
- **Alignment (Critical)**: All body text MUST be `text-left`. Only the Amazon disclosure may be justified.

### 4. Interactive Elements
- **Glassmorphism**: When using overlays, use `rgba(0, 0, 0, 0.95)` with a white border.
- **Hover States**: Invert colors on hover (Black text on White background).
- **Animations**: Use "mechanical" animations (blinking cursors, sliding toasts) rather than soft fades.

## Common CSS Classes
- `.noir-card`: `border: 1px solid white; background: black; border-radius: 0;`
- `.noir-button`: `background: transparent; color: white; border: 1px solid white; padding: 0.5rem 1rem;`
- `.text-left`: Always prefer this for layout.

## Standard Button Patterns

### Secondary / Utility Button (copy, export, debug actions)
```tsx
<button
  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-black text-white border border-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
  style={{ borderRadius: 0 }}
>
  <Icon className="w-3 h-3" />
  LABEL
</button>
```

### Primary Action Button
```tsx
<button
  className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black border border-white hover:bg-black hover:text-white transition-colors"
  style={{ borderRadius: 0 }}
>
  ACTION
</button>
```

### Rules
- `border-radius: 0` — always use `style={{ borderRadius: 0 }}` to override Tailwind's base reset
- Hover **inverts** colors exactly — never softens or lightens
- Labels always **UPPERCASE** with `tracking-widest`
- Icons: `w-3 h-3` for utility, `w-4 h-4` for primary
- No shadows, no gradients, no glows
