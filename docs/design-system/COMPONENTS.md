# Design System Components — Phase 4

**Version:** 1.0.0  
**Status:** Phase 4 - Atomic Component Building  
**Last Updated:** 2026-05-15

---

## 📦 Component Library

### Structure

```
src/design-system/
├── atoms/           # Base components (no dependencies)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Label.tsx
│   └── index.ts
├── molecules/       # Simple combinations (2-3 atoms)
│   ├── FormField.tsx
│   └── index.ts
└── organisms/       # Complex sections (molecules + atoms)
    ├── Header.tsx
    └── index.ts
```

---

## 🧬 Atoms (Base Components)

### Button

Reusable button component with multiple variants.

#### Usage

```tsx
import { Button } from '@/design-system/atoms'

// Primary button (default)
<Button>Click me</Button>

// Secondary (accent) button
<Button variant="secondary">Save</Button>

// Ghost button (outline)
<Button variant="ghost">Cancel</Button>

// Danger button (red)
<Button variant="danger">Delete</Button>

// Size variants
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Loading state
<Button isLoading>Processing...</Button>

// Disabled state
<Button disabled>Disabled</Button>

// With className override
<Button className="w-full">Full Width</Button>
```

#### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}
```

#### Variants

| Variant | Colors | Usage |
|---------|--------|-------|
| **primary** | Brand blue bg, white text | Main actions |
| **secondary** | Accent yellow bg, blue text | Alternative actions |
| **ghost** | Transparent, blue border | Non-destructive actions |
| **danger** | Red bg, white text | Destructive actions |

#### Sizes

| Size | Padding | Font Size | Usage |
|------|---------|-----------|-------|
| **sm** | px-3 py-1.5 | 10px | Compact UI |
| **md** | px-4 py-2.5 | 11px | Default |
| **lg** | px-6 py-3.5 | 13px | Prominent actions |

---

### Input

Text input with optional label and error states.

#### Usage

```tsx
import { Input } from '@/design-system/atoms'

// Basic input
<Input placeholder="Enter text" />

// With label
<Input label="Email" type="email" placeholder="name@example.com" />

// With helper text
<Input
  label="Password"
  type="password"
  helperText="Min 8 characters"
/>

// Error state
<Input
  label="Username"
  error
  errorMessage="Username already taken"
/>

// Size variants
<Input size="sm" placeholder="Small" />
<Input size="md" placeholder="Medium" />
<Input size="lg" placeholder="Large" />

// Disabled
<Input disabled placeholder="Disabled input" />
```

#### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  label?: string
  helperText?: string
  errorMessage?: string
}
```

#### States

| State | Border Color | Ring Color | Usage |
|-------|--------------|-----------|-------|
| **default** | `lodgra-primary/10` | `lodgra-primary/20` | Normal input |
| **focus** | `lodgra-primary` | `lodgra-primary/20` | Active input |
| **error** | `red-500` | `red-500/20` | Validation error |
| **disabled** | `lodgra-primary/10` | `transparent` | Readonly input |

---

### Label

Simple label component for form fields.

#### Usage

```tsx
import { Label } from '@/design-system/atoms'

// Basic label
<Label htmlFor="email">Email</Label>

// Optional field marker
<Label htmlFor="phone" optional>Phone</Label>

// Size variants
<Label size="sm">Small Label</Label>
<Label size="md">Medium Label</Label>
<Label size="lg">Large Label</Label>

// Custom styling
<Label className="text-red-600">Required Field</Label>
```

#### Props

```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  size?: 'sm' | 'md' | 'lg'
  optional?: boolean
}
```

---

## 🧪 Token Usage in Components

### Color Tokens

```tsx
// In components, use these Tailwind classes (backed by tokens)
className="text-lodgra-primary"      // #1E3A8A
className="text-lodgra-accent"       // #ffc000
className="bg-lodgra-bg-light"       // #f8f8f8
className="border-lodgra-primary/10" // Opacity variant
```

### Typography Tokens

```tsx
// Font family (from tokens)
className="font-heading"             // var(--font-heading)

// Font sizes (design tokens)
className="text-design-xs"           // 10px
className="text-design-sm"           // 11px
className="text-design-base"         // 13px
className="text-design-md"           // 12px
className="text-design-lg"           // 14px

// Font weights
className="font-black"               // 900 (black)
className="font-bold"                // 700 (bold)

// Letter spacing (design tokens)
className="tracking-wide"            // 0.5px
className="tracking-wider"           // 1px
className="tracking-widest"          // 1.5px
className="tracking-ultra-wide"      // 2px
```

### Spacing & Z-Index

```tsx
// Z-index (design tokens)
className="z-dropdown"   // 30
className="z-sidebar"    // 40
className="z-modal"      // 50

// Spacing (Tailwind standard with token values)
className="px-4 py-3"   // 16px
className="gap-lg"      // 16px
```

---

## 📋 Testing Components

All components include unit tests using React Testing Library.

```bash
# Run component tests
npm test -- Button.test.tsx
npm test -- Input.test.tsx

# Run all design system tests
npm test -- src/design-system/
```

### Test Example

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/design-system/atoms'

test('renders button with correct variant', () => {
  render(<Button variant="secondary">Save</Button>)
  const button = screen.getByRole('button')
  expect(button).toHaveClass('bg-lodgra-accent')
})
```

---

## 🎨 Design Tokens Integration

Components automatically use design tokens via:

1. **CSS Variables** (for complex styling)
   ```tsx
   style={{ borderColor: 'var(--lodgra-primary)' }}
   ```

2. **Tailwind Classes** (recommended)
   ```tsx
   className="text-lodgra-primary"
   ```

3. **Custom Utilities** (from tokens.css)
   ```tsx
   className="heading-primary" // Uses token font, size, weight
   ```

---

## ✅ Component Checklist

### Button
- [x] Primary variant
- [x] Secondary variant
- [x] Ghost variant
- [x] Danger variant
- [x] Size variants (sm, md, lg)
- [x] Loading state
- [x] Disabled state
- [x] Focus/accessibility
- [x] Unit tests
- [ ] Storybook documentation

### Input
- [x] Label integration
- [x] Helper text
- [x] Error state with message
- [x] Size variants (sm, md, lg)
- [x] Disabled state
- [x] Focus/accessibility
- [x] Unit tests
- [ ] Storybook documentation

### Label
- [x] Optional field indicator
- [x] Size variants (sm, md, lg)
- [x] Disabled state
- [x] Focus/accessibility
- [ ] Unit tests
- [ ] Storybook documentation

---

## 🚀 Next Steps (Phase 4-5)

1. **Molecule Building** (`*compose`)
   - FormField (Label + Input)
   - SearchBox (Input + Icon + Button)
   - Card (Container + Title + Content)

2. **Organism Building**
   - Header (Logo + Nav + Search)
   - Sidebar (Nav + Brand)
   - Form (Multiple FormFields + Button)

3. **Documentation**
   - Storybook integration
   - Component patterns
   - Usage guidelines

---

## 📚 Resources

- **Design System Guide:** `docs/design-system/DESIGN_SYSTEM_GUIDE.md`
- **Token Reference:** `docs/design-system/TOKENS.md`
- **Tailwind Config:** `tailwind.config.ts`
- **Token CSS:** `src/styles/tokens.css`

---

**Generated by:** Uma (UX Design Expert)  
**Phase:** 4 — Atomic Component Building  
**Status:** ✅ First 3 atoms complete
