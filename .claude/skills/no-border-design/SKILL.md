---
name: no-border-design
description: Enforce no-border design philosophy across the site. Use when styling components, cards, containers, or images. Use when user mentions "border", "card styling", "container design", or "separator". Critical rule - never use border classes on any UI element.
---

# No-Border Design Skill

## Overview
**This site uses a no-border, no-shadow design philosophy.** All UI components must be flat: no
visible borders, no elevation effects. This skill is the **authority** on the question — where
`noir-design`, `bento-design`, `commerce-engine`, or `frontend-style-guide` appear to suggest an
outline or a shadow, this skill wins.

## Critical Rules

### NEVER use border classes in any component:
- ❌ `border`
- ❌ `border-t`, `border-b`, `border-l`, `border-r`
- ❌ `border-white`, `border-white/10`, `border-white/20`, etc.
- ❌ `border-red-500`, `border-yellow-400`, etc.
- ❌ Any `border-*` utility class
- ❌ `divide-x`, `divide-y` — these compile to `border-*-width` on children. Same rule, same ban.
- ❌ `ring`, `ring-*`, `outline` — outlines in all but name

> **Not a border — `border-radius`.** `border-radius: 0` / `style={{ borderRadius: 0 }}` sets a
> corner radius, not a border. It is required by `noir-design` and must not be stripped in the
> name of this rule despite the property name containing "border".
>
> Note this is separate from the radius rule itself: corners are **square by default**, and
> `rounded-*` is allowed *only* on the Platform Console Tray / tool-dock pill. See `noir-design`.

### NEVER use shadows or elevation:
- ❌ `shadow`, `shadow-sm`, `shadow-lg`, `shadow-2xl`, any `shadow-*`
- ❌ Arbitrary shadows: `shadow-[0_8px_30px_rgba(0,0,0,0.5)]`, `shadow-[0_0_20px_rgba(255,255,255,0.2)]`
- ❌ Glows, gradients

### Use these alternatives for visual separation:
- ✅ `bg-white/5` or `bg-white/10` background differences
- ✅ Spacing (`gap-*`, `space-y-*`, `mb-*`, `mt-*`, generous padding)
- ✅ Subtle background color changes (`#0a0a0a` for raised chrome)
- ✅ `backdrop-blur-*` on overlays — blur separates without an outline or a shadow

### When editing components:
1. Search for any `border` classes in the file
2. Remove them completely
3. Replace with background color variations if visual separation is needed

## Files to watch:
- `/src/components/ui/*.tsx` - All UI components
- `/src/components/admin/*.tsx` - Admin components  
- `/src/pages/Admin.tsx` - Admin dashboard

## Example transformations:

### Before:
```tsx
className="bg-black border border-white/10 p-4"
```

### After:
```tsx
className="bg-black p-4"
// OR if separation is needed:
className="bg-white/5 p-4"
```

### Before:
```tsx
className="border-t border-white/10 pt-4"
```

### After:
```tsx
className="pt-4"
// OR:
className="pt-4 bg-white/5"
```
