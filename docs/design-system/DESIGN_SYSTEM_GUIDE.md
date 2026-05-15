# Lodgra Design System Guide

**Version:** 1.0.0  
**Status:** Phase 3 Setup Complete  
**Last Updated:** 2026-05-14

---

## 📚 Overview

This is the foundational documentation for Lodgra's design system, built using:
- **W3C Design Tokens** (DTCG format)
- **Atomic Design** methodology
- **Tailwind CSS** integration
- **CSS Variables** for runtime customization

---

## 🏗️ Architecture

### Directory Structure

```
src/
├── styles/
│   ├── tokens/                 # Token definitions (modular CSS)
│   │   ├── colors.css         # Color tokens
│   │   ├── typography.css     # Typography tokens
│   │   ├── spacing.css        # Spacing & sizing tokens
│   │   └── components.css     # Component & layout tokens
│   └── tokens.css             # Global token entry point
│
└── design-system/             # Design system components (Atomic Design)
    ├── atoms/                 # Base components
    ├── molecules/             # Simple combinations
    ├── organisms/             # Complex sections
    └── templates/             # Page layouts

docs/
├── design-system/
│   ├── DESIGN_SYSTEM_GUIDE.md # This file
│   ├── TOKENS.md              # Token reference
│   ├── COMPONENTS.md          # Component library
│   └── MIGRATION.md           # Migration guide
```

---

## 🎨 Token Categories

### 1. **Colors** (`colors.css`)

#### Brand Colors
```css
--lodgra-primary: #1E3A8A    /* Primary brand blue */
--lodgra-accent: #ffc000     /* Accent yellow */
```

#### Semantic Colors
```css
--lodgra-text-primary: #1E3A8A
--lodgra-text-secondary: rgba(30, 58, 138, 0.4)
--lodgra-text-tertiary: rgba(30, 58, 138, 0.3)
--lodgra-border-primary: rgba(30, 58, 138, 0.1)
```

**Usage:**
```tsx
// In Tailwind (via tailwind.config.ts)
<h1 className="text-lodgra-primary">Heading</h1>

// In CSS
header { color: var(--lodgra-primary); }

// In inline styles
<div style={{ color: 'var(--lodgra-primary)' }} />
```

---

### 2. **Typography** (`typography.css`)

#### Font Families
```css
--font-heading: var(--font-hanken-grotesk)  /* Custom heading font */
--font-body: system-ui, sans-serif           /* Body text */
```

#### Font Sizes
```css
--font-size-xs: 10px    /* Extra small */
--font-size-sm: 11px    /* Small */
--font-size-base: 13px  /* Base/Default */
--font-size-md: 12px    /* Medium */
--font-size-lg: 14px    /* Large */
```

#### Font Weights
```css
--font-weight-normal: 400
--font-weight-bold: 700
--font-weight-black: 900
```

#### Letter Spacing
```css
--letter-spacing-normal: 0
--letter-spacing-wide: 0.5px
--letter-spacing-wider: 1px
--letter-spacing-widest: 1.5px
--letter-spacing-ultra-wide: 2px
```

**Utility Classes:**
```css
.font-heading              /* Apply heading font */
.text-base                 /* Apply base font size */
.font-black               /* Apply black weight */
.tracking-widest          /* Apply widest letter spacing */
```

---

### 3. **Spacing** (`spacing.css`)

#### Spacing Scale
```css
--spacing-xs: 4px      /* 4px gaps */
--spacing-sm: 8px      /* 8px gaps */
--spacing-md: 12px     /* 12px gaps */
--spacing-lg: 16px     /* 16px gaps (px-4 in Tailwind) */
--spacing-xl: 24px     /* 24px gaps (px-6 in Tailwind) */
--spacing-2xl: 32px    /* 32px gaps (px-8 in Tailwind) */
--spacing-3xl: 40px    /* 40px gaps (py-10 in Tailwind) */
```

#### Icon Sizes
```css
--icon-sm: 16px   /* h-4, w-4 (16px) */
--icon-md: 20px   /* h-5, w-5 (20px) */
--icon-lg: 24px   /* h-6, w-6 (24px) */
```

**Usage:**
```tsx
<div className="gap-lg">  {/* 16px gap */}
  <Icon className="icon-md" />  {/* 20px icon */}
</div>
```

---

### 4. **Components** (`components.css`)

#### Z-Index Stacking
```css
--z-base: 0           /* Base layer */
--z-dropdown: 30      /* Dropdowns (TopBar) */
--z-sidebar: 40       /* Sidebar navigation */
--z-modal: 50         /* Modals, popovers */
```

#### Border & Radius
```css
--border-width-default: 1px
--border-radius-sm: 4px
--border-radius-md: 8px
```

#### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

---

## 📦 Atomic Design Structure

### **Level 1: Atoms** (Base Components)

Single, smallest reusable components:
- Button
- Input
- Label
- Icon
- Badge
- Tag

### **Level 2: Molecules** (Simple Combinations)

Collections of atoms bonded together:
- Form Field (Label + Input)
- Search Box (Input + Icon + Button)
- Card Header (Icon + Title + Badge)

### **Level 3: Organisms** (Complex Sections)

Distinct sections of an interface:
- Header
- Sidebar
- Navigation Bar
- Form
- Card

### **Level 4: Templates** (Page Layouts)

Page-level layouts combining organisms:
- Auth Layout
- Dashboard Layout
- Settings Layout

### **Level 5: Pages** (Specific Instances)

Fully rendered pages with real content:
- Login Page
- Dashboard Page
- Settings Page

---

## 🚀 Implementation Guide

### Step 1: Import Tokens

In your main layout or app file:

```tsx
// app/layout.tsx
import '@/styles/tokens.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Step 2: Use Tokens in Components

#### Using CSS Variables
```tsx
const Header = () => (
  <header style={{
    height: 'var(--header-height)',
    backgroundColor: 'var(--lodgra-white)',
    borderColor: 'var(--lodgra-border-primary)',
  }}>
    Content
  </header>
)
```

#### Using Tailwind Classes
```tsx
const Header = () => (
  <header className="h-16 bg-white border-b border-lodgra-primary/10">
    Content
  </header>
)
```

#### Using Utility Classes
```tsx
const Heading = ({ children }) => (
  <h1 className="heading-primary">{children}</h1>
)
```

### Step 3: Create Components (Atoms)

```tsx
// src/design-system/atoms/Button.tsx
import '@/styles/tokens.css'

export function Button({ children, variant = 'primary' }) {
  const variants = {
    primary: 'bg-lodgra-primary text-white',
    secondary: 'bg-lodgra-accent text-lodgra-primary',
  }

  return (
    <button
      className={`
        px-4 py-3
        rounded-sm
        font-black
        text-sm
        transition-fast
        ${variants[variant]}
        hover:opacity-90
      `}
    >
      {children}
    </button>
  )
}
```

### Step 4: Compose Molecules

```tsx
// src/design-system/molecules/FormField.tsx
import { Label } from '@/design-system/atoms/Label'
import { Input } from '@/design-system/atoms/Input'

export function FormField({ label, ...inputProps }) {
  return (
    <div className="gap-sm flex flex-col">
      <Label>{label}</Label>
      <Input {...inputProps} />
    </div>
  )
}
```

---

## 🎯 Token Usage Patterns

### Pattern 1: Semantic Color Names
```tsx
// ✅ Good: Semantic name
<div className="text-lodgra-primary">Heading</div>

// ❌ Avoid: Hardcoded color
<div className="text-[#1E3A8A]">Heading</div>
```

### Pattern 2: Spacing Scale
```tsx
// ✅ Good: Token-based spacing
<div className="gap-lg px-4 py-3">Content</div>

// ❌ Avoid: Inconsistent spacing
<div className="gap-[16px] px-[16px] py-[12px]">Content</div>
```

### Pattern 3: Typography Hierarchy
```tsx
// ✅ Good: Semantic typography
<h1 className="heading-primary">Main Title</h1>
<h2 className="heading-secondary">Subtitle</h2>

// ❌ Avoid: Inline sizing
<h1 className="text-[20px] font-black">Main Title</h1>
```

---

## 📋 Tailwind Configuration

The design system is integrated into Tailwind via `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        'lodgra-primary': 'var(--lodgra-primary)',
        'lodgra-accent': 'var(--lodgra-accent)',
      },
      fontSize: {
        'xs': ['10px', { lineHeight: '1' }],
        'sm': ['11px', { lineHeight: '1' }],
        'base': ['13px', { lineHeight: '1.5' }],
      },
      zIndex: {
        dropdown: '30',
        sidebar: '40',
        modal: '50',
      },
    },
  },
}
```

---

## 📖 Token Reference

| Token Type | File | Count | Usage |
|----------|------|-------|-------|
| **Colors** | `colors.css` | 12 | Text, backgrounds, borders |
| **Typography** | `typography.css` | 16 | Fonts, sizes, weights |
| **Spacing** | `spacing.css` | 12 | Padding, gaps, sizes |
| **Components** | `components.css` | 11 | Z-index, borders, shadows |

**Total:** 67 tokens extracted from audit

---

## 🔄 Next Steps

1. **Phase 4 (Build):** `*build` — Create atomic components
2. **Phase 4 (Compose):** `*compose` — Build molecules from atoms
3. **Phase 5 (Document):** `*document` — Generate pattern library

---

## 📚 Resources

- **W3C Design Tokens:** https://design-tokens.github.io/community-group/format/
- **Atomic Design:** https://bradfrost.com/blog/post/atomic-web-design/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **CSS Variables:** https://developer.mozilla.org/en-US/docs/Web/CSS/--*

---

## ✅ Checklist

- [x] Token definitions created (`colors.css`, `typography.css`, `spacing.css`, `components.css`)
- [x] Global token entry point (`tokens.css`)
- [x] Design system guide (`DESIGN_SYSTEM_GUIDE.md`)
- [ ] Tailwind config updated (next: Phase 4)
- [ ] Atomic components created (next: Phase 4)
- [ ] Migration completed (next: Phase 4-5)

---

**Generated by:** Uma (UX Design Expert)  
**Phase:** 3 — Design Tokens & System Setup  
**Status:** ✅ Complete
