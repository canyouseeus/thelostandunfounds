---
name: bento-design
description: Guidelines and patterns for implementing the "THE LOST+UNFOUNDS" premium Bento-style UI across the application.
---

# Bento Design Skill

This skill provides the core design principles, component patterns, and implementation strategies to unify "THE LOST+UNFOUNDS" around its premium, "Bento-style" dashboard aesthetics.

## Core Design Principles

1.  **Pure Black Base**: Use absolute black (`#000000`) for the primary background.
2.  **Bento Card Structure**: Logical groupings of information should be encapsulated in `AdminBentoCard` (or similar containers) with:
    *   Header background: `#0a0a0a` (slightly lighter than base).
    *   Subtle hover effects: Lift (`-translate-y-0.5`), scale (`scale-[1.01]`), and dark shadow.
    *   No radius: All corners MUST be square/none.
3.  **Left-Aligned Content**: All body text, headers (within cards), and descriptions MUST be left-aligned (`text-left`).
4.  **Premium Typography**:
    *   Use `Inter` as the primary font.
    *   Large headings should be uppercase with wide tracking (e.g., `uppercase tracking-widest`).
    *   Small labels/metadata should use `text-[10px]` with wide tracking (`tracking-[0.2em]`).
5.  **Subtle Accents**:
    *   Border colors: `border-white/10` or `border-white/20`.
    *   Text colors: `text-white/80` for labels, `text-white/60` or `text-white/40` for metadata.
    *   Primary Action: White background with black text for buttons, or subtle high-contrast accents.

## Primary Components

*   `AdminBentoCard`: The foundational container. Supports titles, icons, and custom actions in the header.
*   `AdminBentoRow`: For key-value pairs or compact lines of information.
*   `CollapsibleSection`: For major page areas that need to be organized.
*   `LoadingSpinner`: Use the custom square-style loading spinner.

## Implementation Patterns

### 1. Migrating a Basic List to Bento Style

**Before (Basic):**
```tsx
<div className="bg-black/50 border border-white p-6">
  <h3 className="text-white text-lg font-bold mb-4">Items</h3>
  <div className="space-y-4">
    {items.map(item => (
      <div key={item.id} className="p-4 bg-black/30">
        <h4>{item.name}</h4>
      </div>
    ))}
  </div>
</div>
```

**After (Bento Style):**
```tsx
<AdminBentoCard 
  title="ITEMS" 
  icon={<Package className="w-4 h-4" />}
  action={<button onClick={handleAdd}>NEW</button>}
>
  <div className="divide-y divide-white/5">
    {items.map(item => (
      <div key={item.id} className="group/item py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
          <p className="text-white/40 text-[10px] uppercase tracking-wider">{item.status}</p>
        </div>
        {/* Actions */}
      </div>
    ))}
  </div>
</AdminBentoCard>
```

### 2. Form Implementation
*   Inputs: `bg-black border border-white/20 text-white focus:border-white transition-colors outline-none`.
*   Buttons: `px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition`.

## Best Practices
*   **Grid Layouts**: Use `grid-cols-1 md:grid-cols-2` or `md:grid-cols-3` for desktop dashboards.
*   **Avoid Over-nesting**: Keep the Bento cards as the primary top-level containers.
*   **Shadows**: Use large, soft shadows on hover: `hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]`.
*   **Transitions**: Always include `transition-all duration-300 ease-out` for interactive elements.
