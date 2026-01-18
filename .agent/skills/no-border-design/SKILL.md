---
description: Enforce no-border design across the site
---

# No-Border Design Skill

## Overview
**This site uses a no-border design philosophy.** All UI components must not have visible borders.

## Critical Rules

### NEVER use border classes in any component:
- ❌ `border`
- ❌ `border-t`, `border-b`, `border-l`, `border-r`
- ❌ `border-white`, `border-white/10`, `border-white/20`, etc.
- ❌ `border-red-500`, `border-yellow-400`, etc.
- ❌ Any `border-*` utility class

### Use these alternatives for visual separation:
- ✅ `bg-white/5` or `bg-white/10` background differences
- ✅ `shadow-*` for elevation effects
- ✅ Spacing (`gap-*`, `space-y-*`, `mb-*`, `mt-*`)
- ✅ Subtle background color changes

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
