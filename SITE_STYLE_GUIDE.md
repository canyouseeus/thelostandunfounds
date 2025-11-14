# Site Style Guide & Maintenance Prompt

Use this prompt when creating new projects or components to maintain consistent styling across the site.

## Design Philosophy

**Minimalist Dark Theme**: Clean, modern, dark aesthetic with subtle borders and smooth transitions. The design prioritizes readability and user experience with a sophisticated black-on-white contrast approach.

## Color Palette

### Primary Colors
- **Background**: Pure black `#000000` / `bg-black`
- **Text Primary**: White `rgba(255, 255, 255, 0.87)` / `text-white`
- **Text Secondary**: White with opacity `text-white/80`, `text-white/60`, `text-white/40`
- **Borders**: Subtle white borders `border-white/10`, `border-white/20`, `border-white/30`

### Accent Colors (for status/feedback)
- **Success**: Green `bg-green-500/20 border-green-500/50 text-green-400`
- **Error**: Red `bg-red-500/20 border-red-500/50 text-red-400`
- **Warning**: Yellow `bg-yellow-500/20 border-yellow-500/50 text-yellow-400`
- **Info**: Blue `bg-blue-500/20 border-blue-500/50 text-blue-400`

### Tier Colors (if applicable)
- **Free**: `text-white/60`
- **Premium**: `text-yellow-400`
- **Pro**: `text-purple-400`

## Typography

- **Font Family**: `Inter, system-ui, Avenir, Helvetica, Arial, sans-serif`
- **Base Font Size**: Responsive, typically `1rem` (16px)
- **Font Weight**: 
  - Regular: `400` for body text
  - Semibold: `600` for emphasis
  - Bold: `700` for headings
- **Line Height**: `1.5`
- **Letter Spacing**: `0.05em` for headings, `0.1em` for special text
- **Text Rendering**: Optimized with `text-rendering: optimizeLegibility` and font smoothing

## Component Patterns

### Buttons

**Primary Button** (main actions):
```tsx
className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
```

**Secondary Button** (outlined):
```tsx
className="px-4 py-2 bg-black border border-white/10 rounded-lg text-white font-medium hover:border-white/30 transition"
```

**Text Button** (subtle actions):
```tsx
className="text-white/60 hover:text-white text-sm transition"
```

**Icon Button** (menu toggle, close):
```tsx
className="text-white/60 hover:text-white transition"
```

### Cards & Containers

**Standard Card**:
```tsx
className="bg-black border border-white/10 rounded-lg p-6"
```

**Card with Hover Effect**:
```tsx
className="bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300"
```

**Tool Card** (for tool listings):
```tsx
className="group relative bg-black border border-white/10 rounded-lg px-6 py-4 hover:border-white/30 transition-all duration-300 flex items-center justify-between"
```

### Modals & Overlays

**Modal Backdrop**:
```tsx
className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
```

**Modal Content**:
```tsx
className="bg-black border border-white/10 rounded-lg p-6 w-full max-w-md mx-4"
```

**Modal Header**:
```tsx
className="flex items-center justify-between mb-6"
```

**Modal Title**:
```tsx
className="text-2xl font-bold text-white"
```

### Forms

**Input Fields**:
```tsx
className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/30"
```

**Labels**:
```tsx
className="block text-sm font-medium text-white/80 mb-2"
```

**Error Messages**:
```tsx
className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm"
```

### Navigation

**Navbar**:
```tsx
className="bg-black/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-50"
```

**Nav Container**:
```tsx
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
```

**Menu Dropdown**:
```tsx
className="absolute top-100% right-0 mt-2 bg-black/95 border border-white/20 rounded px-0 min-w-[200px]"
```

**Menu Items**:
```tsx
className="block px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 last:border-b-0"
```

### Layout

**Page Container**:
```tsx
className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
```

**Section**:
```tsx
className="mb-6"
```

**Centered Content**:
```tsx
className="text-center"
```

**Flex Container**:
```tsx
className="flex items-center justify-between"
```

**Grid/List Spacing**:
```tsx
className="space-y-3" // or space-y-4, space-y-6 depending on density
```

### Typography Classes

**Page Title**:
```tsx
className="text-5xl font-bold text-white mb-4"
```

**Section Heading**:
```tsx
className="text-2xl font-bold text-white mb-4"
```

**Subheading**:
```tsx
className="text-lg font-semibold text-white mb-2"
```

**Body Text**:
```tsx
className="text-white/80"
```

**Small Text**:
```tsx
className="text-sm text-white/70"
```

**Info Text** (subtle):
```tsx
className="text-white/60 text-sm"
```

## Spacing System

Use Tailwind's spacing scale consistently:
- **Tight**: `gap-2`, `p-2`, `mb-2`
- **Normal**: `gap-4`, `p-4`, `mb-4`
- **Comfortable**: `gap-6`, `p-6`, `mb-6`
- **Loose**: `gap-8`, `p-8`, `mb-8`

## Border Radius

- **Small**: `rounded` (4px)
- **Medium**: `rounded-lg` (8px) - **Most common**
- **Large**: `rounded-xl` (12px)

## Shadows & Effects

- **No box shadows** on most elements (clean, flat design)
- **Backdrop blur**: `backdrop-blur-sm` or `backdrop-blur-md` for overlays
- **Transitions**: Always include `transition` or `transition-all duration-300` for interactive elements

## Hover States

**Standard Hover Pattern**:
- Increase border opacity: `hover:border-white/30` (from `border-white/10`)
- Increase text opacity: `hover:text-white` (from `text-white/60`)
- Slight background change: `hover:bg-white/10` for interactive elements

**Button Hover**:
- Primary: `hover:bg-white/90`
- Secondary: `hover:border-white/30`

## Z-Index Scale

- **Base**: `z-10`
- **Dropdown**: `z-50`
- **Sticky Nav**: `z-50`
- **Modal Backdrop**: `z-[9999]`
- **Modal Content**: `z-[9999]`
- **Toast**: `z-[10000]`

## Responsive Design

**Breakpoints** (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

**Common Patterns**:
```tsx
className="px-4 sm:px-6 lg:px-8" // Responsive padding
className="text-2xl md:text-3xl lg:text-4xl" // Responsive text
```

## Animations

**Slide In** (for toasts, modals):
```css
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**Fade/Opacity Transitions**:
- Use `transition` class with opacity changes
- Duration: `duration-300` (300ms) is standard

## Accessibility

- Always include `aria-label` for icon-only buttons
- Use semantic HTML (`nav`, `main`, `header`, `footer`)
- Ensure sufficient color contrast (white on black meets WCAG AAA)
- Include focus states: `focus:outline-none focus:border-white/30`

## Dark Mode

**Always dark mode** - Force dark theme regardless of system preference:
```css
@media (prefers-color-scheme: light) {
  :root {
    color: rgba(255, 255, 255, 0.87);
    background-color: #000000;
  }
}
```

## Icon Usage

- Use `lucide-react` icons consistently
- Standard size: `w-5 h-5` for inline icons, `w-6 h-6` for larger icons
- Color: Inherit text color or use `text-white/60` for subtle icons

## Logo & Branding

- Logo max width: `max-w-[190px]` (190px)
- Logo container: Centered with `flex justify-center`
- Brand name: "THE LOST+UNFOUNDS" in uppercase, bold

## Implementation Checklist

When creating new components, ensure:

- [ ] Background is `bg-black` or `bg-black/80` with backdrop blur
- [ ] Text uses white with appropriate opacity (`text-white`, `text-white/80`, etc.)
- [ ] Borders use `border-white/10` with hover state `hover:border-white/30`
- [ ] Rounded corners use `rounded-lg` (8px)
- [ ] Transitions are included on interactive elements
- [ ] Spacing follows the spacing system
- [ ] Z-index follows the defined scale
- [ ] Responsive classes are included where needed
- [ ] Accessibility attributes are present
- [ ] Icons are from `lucide-react` and properly sized
- [ ] Color scheme is consistently dark

## Example Component Template

```tsx
import { SomeIcon } from 'lucide-react'

export default function NewComponent() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Component Title
        </h2>
        <p className="text-white/80 mb-6">
          Description text
        </p>
        <button
          className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
        >
          Action Button
        </button>
      </div>
    </div>
  )
}
```

---

**Remember**: Consistency is key. When in doubt, reference existing components and maintain the minimalist dark aesthetic throughout all new features and pages.
