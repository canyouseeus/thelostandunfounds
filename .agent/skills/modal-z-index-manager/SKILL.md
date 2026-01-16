---
description: Ensures all modal/overlay components use proper z-index layering to prevent header overlap issues
---

# Modal Z-Index Management Skill

## Purpose
This skill ensures that all modal dialogs, overlays, and popups in THE LOST+UNFOUNDS application are properly layered above all other UI elements, including the site header, navigation, and other fixed elements.

## The Problem
Modal dialogs with insufficient z-index values (e.g., `z-50`) can appear behind fixed headers, navigation bars, or other high-z-index elements, making them partially or fully obscured.

## The Solution

### Standard Z-Index Hierarchy
Use this z-index scale for THE LOST+UNFOUNDS:

```
Base content:        z-0 to z-10
Sticky elements:     z-20 to z-30
Dropdowns/Tooltips:  z-40 to z-50
Site Header/Nav:     z-50 (EXACTLY - never higher!)
Overlays/Modals:     z-[9999]
Critical Alerts:     z-[10000]
```

**CRITICAL:** The site header in `Layout.tsx` MUST use `z-50` exactly. Never use extremely high values like `z-[2147483647]` for the header, as this will cause modals to appear behind it.

**When debugging modal overlap:**
1. First check the header's z-index in `Layout.tsx`
2. Ensure header uses `z-50`
3. Ensure modals use `z-[9999]`
4. If modals still appear behind header, the header z-index is too high

### Modal Component Requirements

**EVERY modal/overlay MUST follow this pattern:**

```tsx
{/* Modal/Overlay */}
{isOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl p-6 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
      {/* Modal content */}
    </div>
  </div>
)}
```

**Key Requirements:**
1. **Outer container** (backdrop):
   - `fixed inset-0` - Full screen coverage
   - `z-[9999]` - Above all other elements (NEVER use z-50 or lower)
   - `overflow-y-auto` - Allow scrolling when content is tall
   - `flex items-center justify-center` - Center the modal
   - `p-4` - Padding around modal
   - `bg-black/80 backdrop-blur-sm` - Semi-transparent backdrop

2. **Inner container** (modal box):
   - `my-8` - Vertical margin for breathing room
   - `max-h-[calc(100vh-4rem)]` - Prevent modal from being taller than viewport
   - `overflow-y-auto` - Scroll modal content if needed
   - `custom-scrollbar` - Styled scrollbar
   - `relative` - For absolute positioned children (like close button)

3. **Close button** (if present):
   - `absolute top-4 right-4` - Fixed position in modal
   - Should be inside the inner container

### Common Modal Patterns

#### Full-Screen Modal
```tsx
<div className="fixed inset-0 z-[9999] bg-black/95 overflow-y-auto">
  <div className="min-h-screen p-8">
    {/* Content */}
  </div>
</div>
```

#### Side Panel
```tsx
<div className="fixed inset-0 z-[9999] bg-black/60" onClick={onClose}>
  <div className="fixed right-0 top-0 h-full w-96 bg-[#0A0A0A] border-l border-white/10 overflow-y-auto" onClick={e => e.stopPropagation()}>
    {/* Panel content */}
  </div>
</div>
```

#### Bottom Sheet
```tsx
<div className="fixed inset-0 z-[9999] flex items-end bg-black/60">
  <div className="w-full bg-[#0A0A0A] border-t border-white/10 rounded-t-xl max-h-[80vh] overflow-y-auto">
    {/* Sheet content */}
  </div>
</div>
```

## Verification Checklist

When creating or reviewing modals, verify:

- [ ] Outer container uses `z-[9999]` (not z-50 or lower)
- [ ] Outer container has `fixed inset-0`
- [ ] Outer container has `overflow-y-auto` for scrolling
- [ ] Inner container has `my-8` for vertical spacing
- [ ] Inner container has `max-h-[calc(100vh-4rem)]` to prevent overflow
- [ ] Inner container has `overflow-y-auto` for content scrolling
- [ ] Modal is centered properly with flexbox
- [ ] Close button is positioned absolutely within inner container
- [ ] Backdrop click closes modal (if applicable)
- [ ] ESC key closes modal (if applicable)

## Files to Check

When implementing this skill, check these common modal locations:

- `/src/components/admin/AdminGalleryView.tsx` - Gallery editor modal
- `/src/components/admin/AdminMailView.tsx` - Mail compose modal
- `/src/pages/Admin.tsx` - Any admin modals
- `/src/pages/SQL.tsx` - SQL script viewer
- `/src/components/shop/ProductComponents.tsx` - Product modals
- Any component with "Modal", "Dialog", "Overlay", or "Popup" in the name

## Anti-Patterns to Avoid

❌ **NEVER do this:**
```tsx
// z-50 is too low and will be behind headers
<div className="fixed inset-0 z-50 ...">
```

❌ **NEVER do this:**
```tsx
// No overflow handling - content will be cut off
<div className="fixed inset-0 z-[9999] flex items-center justify-center">
  <div className="max-h-[90vh]">
```

❌ **NEVER do this:**
```tsx
// Modal content directly in outer container - no scrolling
<div className="fixed inset-0 z-[9999]">
  <h1>Title</h1>
  <p>Content...</p>
</div>
```

## Testing

After implementing a modal, test:

1. **Z-Index**: Open modal and verify it appears above header
2. **Scrolling**: Add enough content to exceed viewport height and verify scrolling works
3. **Responsiveness**: Test on mobile, tablet, and desktop viewports
4. **Backdrop**: Click backdrop to ensure modal closes (if applicable)
5. **Keyboard**: Press ESC to ensure modal closes (if applicable)

## Implementation Example

Here's a complete modal component example:

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl p-6 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6">{title}</h2>
        
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
```

## Summary

**Always use `z-[9999]` for modals, never `z-50` or lower.**

This ensures modals always appear above headers, navigation, and other fixed elements, preventing the overlap issue.
