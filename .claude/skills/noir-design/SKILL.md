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
- **Surfaces**: Separation comes from surface tone, never from an outline. Use the ladder below.

### 2. Geometry & Separation

- **NO BORDERS.** See the `no-border-design` skill — it is the authority and this skill defers to
  it. Never use `border`, `border-t/b/l/r`, `border-white`, `border-white/10`, or any `border-*`
  utility on any element. There is no "thin white outline" exception; that rule is retired.
- **NO SHADOWS.** No `shadow-*`, no `shadow-2xl`, no arbitrary `shadow-[...]`, no glows, no rings,
  no gradients. Shadows are **not** an approved substitute for borders — the surface is flat.
- **Surface ladder** — surface tone and spacing are the *only* separation mechanisms. Elements
  separate by sitting on a different tone, not by being outlined or lifted:

  | Level | Value | Used for |
  |---|---|---|
  | Base | `bg-black` / `#000000` | Page background |
  | Raised | `#0a0a0a` | Card headers, section chrome |
  | Subtle | `bg-white/5` | Cards, panels, inputs, secondary buttons |
  | Interactive | `bg-white/10` | Hover/active on a subtle surface |
  | Inverted | `bg-white text-black` | Primary actions, active states |

- **No Rounded Corners**: Set `border-radius: 0 !important` on all buttons, cards, and containers.
  Use `style={{ borderRadius: 0 }}` to beat Tailwind's base reset.
  > `border-radius` is a corner radius, **not** a border. It is required here and is not a
  > violation of the no-border rule despite the property name. Do not strip it.

  **Exactly two exceptions:**

  1. **Tool trays.** The Platform Console Tray / icon dock pattern (admin and affiliate
     dashboards) is a pill: `rounded-full`, or `rounded-[32px] sm:rounded-full` when it wraps to
     multiple rows. See `bento-design` → Platform Console Tray for the canonical markup. Covers
     the tray pill itself and its icon buttons.
  2. **Profile avatars.** Always `rounded-full` — avatars are circles, everywhere they appear.

  Nothing else. Cards, modals, side panels, bottom sheets, inputs, ordinary buttons, product
  images, gallery thumbnails and the expandable card a tray icon opens all stay square. If you are
  reaching for `rounded-*` on something that is not a tool tray or an avatar, the answer is no.

### 3. Typography
- **Font**: Use `Inter` or system sans-serif.
- **Case**: Use **UPPERCASE** for headers (h1, h2) and important navigation items to emphasize the "Noir" look.
- **Alignment (Critical)**: All body text MUST be `text-left`. Only the Amazon disclosure may be justified.

### 4. Interactive Elements
- **Glassmorphism**: When using overlays, use `rgba(0, 0, 0, 0.95)` plus `backdrop-blur` — the blur
  and the tone difference do the separating. No white border.
- **Hover States**: Invert colors on hover (Black text on White background).
- **Animations**: Use "mechanical" animations (blinking cursors, sliding toasts) rather than soft fades.

## Common CSS Classes
- `.noir-card`: `background: rgba(255, 255, 255, 0.05); border-radius: 0;`
- `.noir-button`: `background: rgba(255, 255, 255, 0.1); color: white; border-radius: 0; padding: 0.5rem 1rem;`
- `.text-left`: Always prefer this for layout.

## Standard Button Patterns

### Secondary / Utility Button (copy, export, debug actions)
```tsx
<button
  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-50"
  style={{ borderRadius: 0 }}
>
  <Icon className="w-3 h-3" />
  LABEL
</button>
```

### Primary Action Button
```tsx
<button
  className="px-4 py-2 text-sm font-bold uppercase tracking-widest bg-white text-black hover:bg-white/10 hover:text-white transition-colors"
  style={{ borderRadius: 0 }}
>
  ACTION
</button>
```

### Rules
- **No `border-*` classes.** A button is defined by its surface, not an outline.
- `border-radius: 0` — always use `style={{ borderRadius: 0 }}` to override Tailwind's base reset.
  (Radius, not a border — keep it.)
- Hover **swaps surface tone** between the subtle and inverted levels of the ladder above. Never
  land on `bg-black`: without a border it is invisible against the page.
- Labels always **UPPERCASE** with `tracking-widest`
- Icons: `w-3 h-3` for utility, `w-4 h-4` for primary
- No shadows, no gradients, no glows, no rings
