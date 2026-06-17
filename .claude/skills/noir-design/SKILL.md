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

### 2. Geometry
- **No Rounded Corners**: Set `border-radius: 0 !important` on all buttons, cards, and containers.
- **NO BORDERS**: Never use border classes or border CSS on any element. Use background contrast (`bg-white/5`, `bg-white/10`) for visual separation instead.

### 3. Typography
- **Font**: Use `Inter` or system sans-serif.
- **Case**: Use **UPPERCASE** for headers (h1, h2) and important navigation items to emphasize the "Noir" look.
- **Alignment (Critical)**: All body text MUST be `text-left`. Only the Amazon disclosure may be justified.

### 4. Interactive Elements
- **Glassmorphism**: When using overlays, use `rgba(0, 0, 0, 0.95)` background — no border.
- **Hover States**: Invert colors on hover (Black text on White background).
- **Animations**: Use "mechanical" animations (blinking cursors, sliding toasts) rather than soft fades.

## Common CSS Classes
- `.noir-card`: `background: black; border-radius: 0;` — NO border.
- `.noir-button`: `background: transparent; color: white; padding: 0.5rem 1rem;` — NO border.
- `.text-left`: Always prefer this for layout.
