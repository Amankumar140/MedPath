# MedPath Global Design System

This document outlines the unified design tokens, styling rules, responsive layout patterns, and reusable component primitives used across the MedPath authenticated routes.

---

## 1. Core Visual Tokens (index.css)

MedPath uses standard Tailwind CSS color tokens with semantic naming for dark and light modes, combined with glassmorphic cards, custom range inputs, and accessibility glows.

### Typography Scales
- **Headline Large (`font-headline-lg` / `text-headline-lg`)**: Bold, clean styling with premium gradient text `bg-gradient-to-r from-primary to-secondary`.
- **Headline Medium (`font-headline-md` / `text-headline-md`)**: Strong structure tags.
- **Body Large (`font-body-lg` / `text-body-lg`)**: Default readability fonts.
- **Body Medium (`font-body-md` / `text-body-md`)**: Standard content fonts.
- **Label Small (`font-label-sm` / `text-label-sm`)**: Secondary captions and tags.

### Custom Classes
- **`.premium-glass-card`**: Elegant backdrop-filter blur (20px), low opacity border (`border-outline-variant/15`), shadows with HSL tailored tints, and dark mode cyan glows.
- **`.hover-lift`**: Micro-animation hover state (`transition-all hover:-translate-y-1 hover:shadow-md`).
- **`.animate-slide-up`**: Smooth entry fade-and-translate transition for pages.
- **`.animate-pulse-glow`**: Subtle breathing illumination on key diagnostic scanner cards.

---

## 2. Reusable Component Primitives

The system includes a component library at `client/src/components/ui/` with standardized props.

### 1. `Card.jsx`
Glassmorphic container component.
- **Props**:
  - `variant`: `'glass'` (default), `'lowest'`, `'low'`
  - `hoverLift`: `boolean` (adds micro-animations)
  - `onClick`: `function` (adds interactive hover and keyboard navigation)

### 2. `Button.jsx`
Semantic button actions.
- **Props**:
  - `variant`: `'primary'`, `'secondary'`, `'outline'`, `'ghost'`
  - `size`: `'sm'`, `'md'` (default), `'lg'`
  - `icon`: `string` (Material Symbol icon name)
  - `loading`: `boolean` (renders an inline spinner)
  - `disabled`: `boolean`

### 3. `Input.jsx`
Secure input capture.
- **Props**:
  - `label`: `string`
  - `icon`: `string` (left indicator icon)
  - `error`: `string` (validation message)
  - `type`: `'text'`, `'number'`, `'textarea'`

### 4. `Select.jsx`
Standardized drop-down selector.
- **Props**:
  - `label`: `string`
  - `options`: `Array<{ value, label }>`

### 5. `Badge.jsx`
Small status indicator.
- **Props**:
  - `variant`: `'primary'`, `'secondary'`, `'success'`, `'danger'`, `'warning'`, `'neutral'` (default)

### 6. `ProgressBar.jsx`
Linear progress indicator.
- **Props**:
  - `value`: `number` (current progress)
  - `max`: `number` (total bounds)

### 7. `EmptyState.jsx`
Placeholder when no data is returned.
- **Props**:
  - `icon`: `string`
  - `title`: `string`
  - `description`: `string`
  - `action`: `{ label, icon, onClick }`

---

## 3. Responsive Layout Patterns

1. **Containers**: Maintain alignment with `max-w-container-max mx-auto px-4 md:px-6 w-full`.
2. **Grids**: Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5` for history lists and statistics.
3. **Touch Targets**: All interactive controls maintain a minimum touch target size of `44px` on mobile displays.
4. **Spacing**: Standardized spacing via spacing tokens (`sp-xs`, `sp-sm`, `sp-md`, `sp-lg`, `sp-xl`).
