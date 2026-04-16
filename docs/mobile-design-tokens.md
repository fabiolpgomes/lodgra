# 🎨 Mobile-First Design Tokens

**Framework:** Tailwind CSS v3 (mobile-first)  
**Methodology:** Atomic Design + DTCG (Design Token Community Group)  
**Format:** CSS variables + Tailwind config extension

---

## 📐 Breakpoints (Mobile-First)

```javascript
// tailwind.config.ts
export const screens = {
  // Base (320px) - mobile-first, no prefix
  // All base styles apply to all screen sizes
  
  'sm':  '640px',   // Portrait tablet, landscape phone
  'md':  '768px',   // Landscape tablet
  'lg':  '1024px',  // Desktop
  'xl':  '1280px',  // Desktop large
  '2xl': '1536px',  // Desktop extra large
}

// Usage:
// base: mobile (320px)
// sm:   tablet (640px+)
// md:   tablet landscape / desktop (768px+)
// lg:   desktop (1024px+)
```

---

## 📏 Spacing Scale (Tailwind - REM-based)

```javascript
export const spacing = {
  // Micro spacing
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px (base mobile padding)
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px (tablet padding)
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px (desktop padding)
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px (large spacing)
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
}

// Mobile-first usage:
// <div className="px-4 sm:px-6 lg:px-8">
// - Mobile: 16px padding
// - Tablet: 24px padding
// - Desktop: 32px padding
```

---

## 🔤 Typography Scale

### Font Sizes (Tailwind)
```javascript
export const fontSize = {
  'xs':  ['0.75rem', '1rem'],      // 12px (labels, hints)
  'sm':  ['0.875rem', '1.25rem'],  // 14px (body small)
  'base': ['1rem', '1.5rem'],      // 16px (body, mobile base)
  'lg':  ['1.125rem', '1.75rem'],  // 18px (headings mobile)
  'xl':  ['1.25rem', '1.75rem'],   // 20px (h2 mobile)
  '2xl': ['1.5rem', '2rem'],       // 24px (h1 mobile, h2 tablet)
  '3xl': ['1.875rem', '2.25rem'],  // 30px (h1 tablet)
  '4xl': ['2.25rem', '2.5rem'],    // 36px (h1 desktop)
}

// Mobile-first hierarchy:
// h1: text-2xl sm:text-3xl lg:text-4xl     (20px → 24px → 36px)
// h2: text-xl sm:text-2xl lg:text-3xl      (20px → 24px → 30px)
// h3: text-base sm:text-lg lg:text-xl      (16px → 18px → 20px)
// p:  text-sm sm:text-base lg:text-base     (14px → 16px → 16px)
// small: text-xs                            (12px everywhere)
```

### Line Heights
```javascript
export const lineHeight = {
  'none': '1',           // 0px gap
  'tight': '1.25',       // 4px gap (headings)
  'snug': '1.375',       // 6px gap (body)
  'normal': '1.5',       // 8px gap (body default)
  'relaxed': '1.625',    // 10px gap (long-form)
  'loose': '2',          // 16px gap (spacious)
}

// Mobile body: normal (1.5)
// Headings: tight (1.25)
```

---

## 🎯 Touch Targets (WCAG AA+)

```javascript
// Minimum sizes for touch
export const minSize = {
  'touch-sm': '2.75rem',  // 44px (WCAG AA minimum)
  'touch-md': '3rem',     // 48px (Android standard)
  'touch-lg': '3.5rem',   // 56px (thumb zone friendly)
}

// Button implementation:
<button className="
  h-12 px-4 sm:h-10            // Mobile: 48px, Tablet: 40px
  min-w-[44px] min-h-[44px]    // Minimum WCAG compliance
  flex items-center justify-center
  rounded-lg font-semibold
  transition-colors
">
  Click me
</button>

// Form input:
<input className="
  h-12 sm:h-10          // Mobile: 48px, Tablet: 40px
  px-3 py-2
  text-base             // Prevents iOS zoom
  border rounded-lg
" />

// Icon button (must have padding):
<button className="
  p-2 min-w-[44px] min-h-[44px]  // 8px padding + 44px min
">
  <Icon className="h-6 w-6" />
</button>
```

---

## 🎨 Color System

### Brand Colors
```javascript
export const colors = {
  // Primary (Actions)
  'primary-50':   '#eff6ff',
  'primary-100':  '#dbeafe',
  'primary-200':  '#bfdbfe',
  'primary-300':  '#93c5fd',
  'primary-400':  '#60a5fa',
  'primary-500':  '#3b82f6',  // Main brand color
  'primary-600':  '#2563eb',  // Darker for hover
  'primary-700':  '#1d4ed8',  // Darkest for active
  'primary-800':  '#1e40af',
  'primary-900':  '#1e3a8a',
  
  // Status
  'success': '#16a34a',      // Green (confirmadas)
  'warning': '#d97706',      // Amber (pendentes)
  'error': '#dc2626',        // Red (canceladas)
  'neutral': '#6b7280',      // Gray (disabled)
  
  // Semantic
  'bg-primary': '#ffffff',   // White background
  'bg-secondary': '#f9fafb', // Light gray (card bg)
  'text-primary': '#111827',    // Dark (main text)
  'text-secondary': '#6b7280',  // Gray (secondary text)
  'text-tertiary': '#9ca3af',   // Light gray (hints)
  'border': '#e5e7eb',       // Light gray (borders)
}

// Usage:
<div className="bg-white text-gray-900">
  <button className="bg-blue-600 hover:bg-blue-700 text-white" />
  <span className="text-gray-500" />
</div>
```

---

## 🎯 Component Sizing

### Buttons

| Type | Mobile | Tablet | Size Class |
|------|--------|--------|-----------|
| Primary (CTA) | 56px | 48px | `h-14 sm:h-12` |
| Secondary | 48px | 44px | `h-12 sm:h-11` |
| Tertiary/Ghost | 44px | 40px | `h-11 sm:h-10` |
| Icon | 44px | 40px | `h-11 sm:h-10` |

```tsx
// Primary (Full-width CTA)
<button className="w-full h-14 sm:h-12 px-4 font-semibold rounded-lg
  bg-blue-600 hover:bg-blue-700 text-white
  transition-colors active:bg-blue-800">
  Pagar €340
</button>

// Secondary (Paired actions)
<div className="flex gap-3">
  <button className="flex-1 h-12 sm:h-11 rounded-lg
    border border-gray-300 bg-white text-gray-700
    hover:bg-gray-50 font-medium">
    Cancelar
  </button>
  <button className="flex-1 h-12 sm:h-11 rounded-lg
    bg-blue-600 text-white font-medium
    hover:bg-blue-700">
    Confirmar
  </button>
</div>

// Icon button
<button className="p-2 min-w-[44px] min-h-[44px]
  flex items-center justify-center rounded-lg
  hover:bg-gray-100 text-gray-600">
  <ChevronLeft className="h-6 w-6" />
</button>
```

### Form Inputs

```tsx
// Standard input
<input className="w-full h-12 sm:h-10 px-3 py-2
  text-base border border-gray-300 rounded-lg
  placeholder-gray-400
  focus:ring-2 focus:ring-blue-500 focus:border-transparent" />

// Select (custom styling)
<select className="w-full h-12 sm:h-10 px-3 py-2
  text-base border border-gray-300 rounded-lg
  appearance-none bg-white pr-8
  focus:ring-2 focus:ring-blue-500 focus:border-transparent" />

// Textarea (at least 56px mobile)
<textarea className="w-full h-28 sm:h-24 px-3 py-2
  text-base border border-gray-300 rounded-lg
  resize-none placeholder-gray-400
  focus:ring-2 focus:ring-blue-500 focus:border-transparent" />

// Checkbox/Radio (with 44px tap area)
<label className="flex items-center gap-3 p-3
  -mx-3 sm:-mx-2 cursor-pointer">
  <input type="checkbox" className="h-5 w-5 rounded" />
  <span className="text-sm">Aceitar termos</span>
</label>
```

### Cards

```tsx
// Card spacing: Mobile 16px → Tablet 24px → Desktop 32px
<div className="bg-white rounded-lg shadow-sm
  p-4 sm:p-6 lg:p-8
  border border-gray-200">
  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
    Title
  </h3>
  <p className="text-sm sm:text-base text-gray-600">
    Description
  </p>
</div>

// Grid (Mobile 1-col → Tablet 2-col → Desktop 3-col)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
  gap-4 sm:gap-6 lg:gap-8">
  <Card />
  <Card />
  <Card />
</div>
```

---

## 📱 Mobile Utility Classes

```javascript
// Add to tailwind.config.ts
export const theme = {
  extend: {
    // Safe area (notch support)
    spacing: {
      'safe': 'env(safe-area-inset-bottom)',
    },
    
    // Touch feedback
    animation: {
      'touch-feedback': 'pulse 0.2s ease-out',
    },
    
    // Bottom nav padding (56px nav)
    margin: {
      'nav': '56px',
    },
    padding: {
      'safe-pb': 'calc(env(safe-area-inset-bottom) + 56px)',
    },
  }
}

// Usage:
<div className="pb-safe-pb">
  {/* Content with bottom nav spacing */}
</div>
```

---

## 🎯 Density Scales

### Information Density

**Mobile (320px - 640px):** Relaxed
- Large spacing between items
- Fewer items per screen
- Deep navigation (vertical stack)

**Tablet (640px - 1024px):** Medium
- Moderate spacing
- 2-column grids
- Shallow navigation

**Desktop (1024px+):** Compact
- Tighter spacing
- 3-column grids
- Sidebar navigation

```tsx
// Lists: Mobile loose → Desktop compact
<div className="space-y-3 sm:space-y-2 lg:space-y-1">
  <Item />
  <Item />
  <Item />
</div>

// Grid gap: Mobile loose → Desktop compact
<div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
  <Item />
  <Item />
  <Item />
</div>
```

---

## 🌐 Safe Areas (Notches & Gestures)

```css
/* Environment variables for notches */
:root {
  safe-area-inset-top: env(safe-area-inset-top);
  safe-area-inset-left: env(safe-area-inset-left);
  safe-area-inset-right: env(safe-area-inset-right);
  safe-area-inset-bottom: env(safe-area-inset-bottom);
}

/* Viewport meta tag (required) */
<meta name="viewport" content="
  width=device-width,
  initial-scale=1,
  viewport-fit=cover
" />
```

```tsx
// Header with notch support
<header className="fixed top-0 left-0 right-0 z-50
  pt-[env(safe-area-inset-top)]">
  {/* Header content */}
</header>

// Bottom nav with home indicator space
<nav className="fixed bottom-0 left-0 right-0
  pb-[env(safe-area-inset-bottom)]">
  {/* Nav items */}
</nav>
```

---

## ✅ Checklist

- [ ] Tailwind breakpoints configured
- [ ] Spacing scale mobile-first (px-4 base)
- [ ] Typography scale mobile-first (16px base)
- [ ] Touch targets 44px minimum
- [ ] Colors defined in :root
- [ ] Safe areas for notches
- [ ] Form inputs h-12 mobile / h-10 tablet
- [ ] Buttons h-14 mobile / h-12 tablet
- [ ] Cards responsive padding
- [ ] Grid responsive columns (1-col → 2-col → 3-col)

