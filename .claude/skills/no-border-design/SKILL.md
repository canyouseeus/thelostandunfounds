---
name: no-border-design
description: Enforce no-border design philosophy across the site. Use when styling components, cards, containers, or images. Use when user mentions "border", "card styling", "container design", or "separator". Critical rule - never use border classes on any UI element.
---

# No-Border Design — Single Source of Truth

**This is the authoritative rule for ALL skills and components on this site. It overrides any conflicting instruction in noir-design, bento-design, or any other skill.**

## THE RULE

**ZERO BORDERS. NO EXCEPTIONS.**

Never use any border class or border CSS property on any UI element, in any component, in any skill.

### NEVER use:
- ❌ `border`
- ❌ `border-t`, `border-b`, `border-l`, `border-r`
- ❌ `border-white`, `border-white/10`, `border-white/20`, `border-white/5`
- ❌ `border-black`, `border-gray-*`, `border-red-*`, `border-yellow-*`, etc.
- ❌ Any `border-*` Tailwind utility class
- ❌ `border: 1px solid` in CSS
- ❌ `outline` as a visual border substitute

### ALWAYS use these instead for visual separation:
- ✅ `bg-white/5` or `bg-white/10` — subtle background contrast
- ✅ `shadow-*` — elevation effects
- ✅ `gap-*`, `space-y-*`, `mb-*`, `mt-*` — spacing
- ✅ `divide-*` classes only if they produce no visible line (e.g. `divide-transparent`)

## When editing any component:
1. Search for `border` in the file before saving
2. Remove every `border-*` class found
3. If visual separation is needed, use `bg-white/5` instead

## Examples

### Cards / containers:
```tsx
// WRONG
className="bg-black border border-white/10 p-4"

// CORRECT
className="bg-white/5 p-4"
```

### Inputs:
```tsx
// WRONG
className="bg-black border border-white/20 text-white focus:border-white"

// CORRECT
className="bg-white/5 text-white focus:bg-white/10 transition-colors outline-none"
```

### Dividers:
```tsx
// WRONG
<div className="border-t border-white/10" />

// CORRECT
<div className="h-px bg-white/5" />
// OR just use margin/padding spacing
```

### Noir cards & buttons:
```tsx
// WRONG
className="border: 1px solid white; background: black;"

// CORRECT
className="bg-black"  // or bg-white/5 if contrast is needed
```
