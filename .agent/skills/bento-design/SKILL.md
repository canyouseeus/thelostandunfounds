---
name: bento-design
description: Guidelines and patterns for implementing the "THE LOST+UNFOUNDS" premium Bento-style UI across the application, including the "console tray" / icon dock pattern.
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

## Platform Console Tray

A named pattern for icon-only tool docks. There are two variants — pick based on whether the dock
sits on static page chrome or floats over scrolling content.

**Rule: a console tray is icon-only, never a row of always-visible controls.** Each icon expands
its own focused card on tap — a search icon opens a search card, a filter icon opens a filter
card, and so on. Never lay out inline search bars, chip rows, or labeled text buttons
side-by-side in the tray itself — that reads as clutter, not a console.

**Rule: the tray's surface is frosted glass, never a solid plate.** Content underneath should
blur and show through the tray, the same way it shows through the back-to-top button. Don't wrap
a console tray in an opaque `bg-black` band to solve a "content peeking through" problem — that
defeats the pattern. If content showing through is a problem, the tray is in the wrong spot or
needs a stronger blur, not a solid backing.

### Variant A — static dock (page chrome, nothing scrolls under it)
Reference: `src/pages/Admin.tsx` (search "Premium Dock" / "Platform Console") — the dashboard's
app switcher. It sits on the dashboard's own static black background, so a lighter, more diffuse
glass treatment reads fine:
```tsx
<div className="flex items-center gap-1 p-1.5 bg-white/5 backdrop-blur-xl rounded-full">
  {/* icon buttons */}
</div>
```
Use `rounded-[32px] sm:rounded-full` instead of a plain `rounded-full` only if the dock wraps to
multiple rows on narrow screens (many icons); a dock that always fits a single row stays a full
pill. Its expandable-card content can use the ordinary inline collapsible (height-animated,
pushes content below it) since nothing needs to stay reachable while scrolling.

### Variant B — floating tray (in-page toolbar over scrolling content)
Reference: `src/components/photos/PhotoGallery.tsx`, the "Back to Top Button" (search that
comment) — `fixed bottom-24 left-1/2 -translate-x-1/2 z-40 ... bg-white/10 backdrop-blur-md ...
rounded-full`. And `src/components/admin/AdminPhotosBrowse.tsx` (All Photos tab), which applies
the same treatment to a multi-icon dock.

Use this variant whenever the tray needs to stay reachable while the user scrolls a grid or list
underneath it (photo grids, long tables). It is `fixed`, not `sticky`, and floats at the bottom
of the viewport — matching where the back-to-top button already lives — rather than pinning to
the top of the scroll area:
```tsx
<div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
  {/* expandable card, if one is open, floats directly above the dock — see below */}
  <div className="flex items-center gap-1 p-1.5 bg-white/10 backdrop-blur-md rounded-full shadow-2xl">
    {/* icon buttons */}
  </div>
</div>
```
- `bg-white/10 backdrop-blur-md` — reuse these exact values; they're what makes it read as glass
  rather than a bar. This is intentionally more transparent than Variant A's dock, because it's
  meant to be seen through content, not sit on a flat background.
- `fixed` + `bottom-24` reuses the back-to-top button's own screen position verbatim. If the view
  also has another `fixed bottom-*` bar (e.g. a batch-selection action bar at `bottom-6`),
  `bottom-24` keeps the two from colliding — don't invent a new offset, match the existing one.
- `shadow-2xl` gives the glass some separation from busy content behind it.

### Icon button (both variants)
```tsx
<button
  onClick={...}
  title={label}
  className={`relative p-2.5 sm:p-3 transition-all duration-300 rounded-full group/btn ${
    active
      ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
      : 'text-white/60 hover:text-white hover:bg-white/10'
  }`}
>
  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
  {badge ? (
    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full">
      {badge}
    </span>
  ) : null}
  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
    {label}
  </span>
</button>
```
- Active state inverts to solid white + scales up 110% — never a border, underline, or ring.
- Badge is a small red circle top-right with a count, matching the notification-count treatment
  used elsewhere (submission counts, selection counts).
- No borders anywhere in the dock or its buttons.

### Expandable card per icon
Tapping an icon toggles a single `openCard: string | null` piece of state (only one card open at
a time).

For **Variant A** (static dock), the card can push inline content below the dock with the
standard collapsible:
```tsx
<AnimatePresence>
  {openCard === 'search' && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-white/[0.03] p-4">{/* the one tool this icon is for */}</div>
    </motion.div>
  )}
</AnimatePresence>
```

For **Variant B** (floating tray), the dock isn't anchored in document flow, so its card can't
push content below it — it floats as its own panel directly above the dock instead, inside the
same `fixed` wrapper:
```tsx
<AnimatePresence>
  {openCard && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="bg-black/80 backdrop-blur-2xl shadow-2xl w-[calc(100vw-2rem)] max-w-sm p-4"
    >
      {openCard === 'search' && (/* the one tool this icon is for */)}
    </motion.div>
  )}
</AnimatePresence>
```
The card's own surface can be more opaque (`bg-black/80`) than the dock pill (`bg-white/10`) —
the frosted-glass requirement is about the dock itself being seen through, not every panel it
opens. Text-heavy content (search inputs, filter chips, tag pickers) needs to stay legible.

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
