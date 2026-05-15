# Pattern Library — Complete Component Reference

**Generated:** 2026-05-15  
**Phase:** 5 — Quality & Scale  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Atoms — Base Components](#atoms)
2. [Molecules — Simple Combinations](#molecules)
3. [Organisms — Complex Sections](#organisms)
4. [Usage Patterns](#patterns)
5. [Best Practices](#best-practices)

---

## Atoms

### Button

Primary action component with 4 variants and 3 sizes.

**Variants:** primary | secondary | ghost | danger  
**Sizes:** sm | md | lg  
**States:** default | loading | disabled | focus

```tsx
import { Button } from '@/design-system/atoms'

// Primary (default)
<Button>Click Me</Button>

// Secondary variant
<Button variant="secondary">Save</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Loading state
<Button isLoading>Processing...</Button>

// Disabled
<Button disabled>Disabled</Button>
```

**Token Integration:**
- Colors: `text-lodgra-primary`, `bg-lodgra-accent`
- Typography: `font-heading`, `font-black`, `text-design-sm`
- Spacing: `px-4 py-2.5` (size-dependent)

---

### Input

Text input with optional label and validation.

**Sizes:** sm | md | lg  
**States:** default | focus | error | disabled

```tsx
import { Input } from '@/design-system/atoms'

// Basic
<Input placeholder="Enter text" />

// With label (internal)
<Input label="Email" type="email" />

// Error state
<Input
  label="Username"
  error
  errorMessage="Already taken"
/>

// Helper text
<Input
  label="Password"
  type="password"
  helperText="Min 8 characters"
/>

// Disabled
<Input disabled placeholder="Read-only" />
```

**Token Integration:**
- Border: `border-lodgra-primary/10`
- Focus ring: `ring-lodgra-primary/20`
- Error: `border-red-500`
- Typography: `text-design-base`

---

### Label

Semantic label component for form fields.

**Sizes:** sm | md | lg  
**Features:** Optional field indicator

```tsx
import { Label } from '@/design-system/atoms'

// Basic
<Label htmlFor="field">Field Name</Label>

// Optional indicator
<Label htmlFor="phone" optional>Phone</Label>

// Sizes
<Label size="sm">Small</Label>
<Label size="md">Medium</Label>
<Label size="lg">Large</Label>
```

**Token Integration:**
- Typography: `font-heading font-black uppercase`
- Letter spacing: `tracking-wider` (1px)
- Color: `text-lodgra-primary`

---

## Molecules

### FormField

Combines Label + Input with integrated validation.

**Props:**
- `label`: string (required)
- `labelProps`: Omit<LabelProps, 'children'> (optional)
- `inputProps`: InputProps (required)
- `error`: boolean (optional)
- `errorMessage`: string (optional)
- `helperText`: string (optional)
- `required`: boolean (optional, default true)

```tsx
import { FormField } from '@/design-system/molecules'

// Basic form field
<FormField
  label="Email"
  inputProps={{ type: 'email', placeholder: 'your@email.com' }}
/>

// With validation
<FormField
  label="Username"
  inputProps={{ placeholder: 'Username' }}
  error={!!errors.username}
  errorMessage={errors.username}
/>

// With helper text
<FormField
  label="Password"
  inputProps={{ type: 'password' }}
  helperText="Min 8 characters, 1 uppercase, 1 number"
/>

// Optional field
<FormField
  label="Phone"
  inputProps={{ type: 'tel' }}
  required={false}
/>
```

**Composition:**
```
FormField
├── Label (conditional, based on label prop)
└── Input
    ├── Input field
    ├── Error message (conditional)
    └── Helper text (conditional)
```

---

### SearchBox

Combines Input + Icon + Button for search patterns.

**Props:**
- `inputProps`: Omit<InputProps, 'className'> (required)
- `buttonProps`: Omit<ButtonProps, 'children'> (optional)
- `icon`: React.ReactNode (default: Search icon)
- `onSearch`: (value: string) => void (optional)
- `showButton`: boolean (default: true)

```tsx
import { SearchBox } from '@/design-system/molecules'

// Basic search
<SearchBox inputProps={{ placeholder: 'Search...' }} />

// With handler
<SearchBox
  inputProps={{ placeholder: 'Search users...' }}
  onSearch={(value) => router.push(`/search?q=${value}`)}
/>

// Without button
<SearchBox
  inputProps={{ placeholder: 'Live search...' }}
  showButton={false}
/>

// Custom button
<SearchBox
  inputProps={{ placeholder: 'Find...' }}
  buttonProps={{ variant: 'secondary' }}
/>
```

**Composition:**
```
SearchBox
├── Input field (relative positioned)
│   └── Search icon (absolute left)
└── Button (conditional, based on showButton)
```

---

### Card

Container component for grouped content.

**Props:**
- `title`: React.ReactNode (optional)
- `subtitle`: React.ReactNode (optional)
- `footer`: React.ReactNode (optional)
- `variant`: 'default' | 'elevated' | 'outlined' (default: 'default')
- `padding`: 'sm' | 'md' | 'lg' (default: 'md')
- HTML div attributes (className, onClick, etc.)

**Variants:**

| Variant | Style | Use Case |
|---------|-------|----------|
| **default** | Subtle border | Standard containers |
| **elevated** | Shadow depth | Highlighted sections |
| **outlined** | Thick border | Alternative emphasis |

```tsx
import { Card } from '@/design-system/molecules'

// Basic card
<Card title="Information">
  <p>Card content here</p>
</Card>

// With subtitle and footer
<Card
  title="Payment"
  subtitle="Order details"
  footer={<Button>Confirm</Button>}
>
  <p>Payment details</p>
</Card>

// Elevated variant
<Card variant="elevated" title="Featured">
  Important content
</Card>

// Custom padding
<Card title="Compact" padding="sm">
  Small padding content
</Card>
```

**Composition:**
```
Card (div)
├── Header section
│   ├── Title (h3, conditional)
│   └── Subtitle (p, conditional)
├── Content section (children)
└── Footer section (conditional)
```

---

## Organisms

### Header

Navigation bar with logo and search.

**Composition:** Logo + Nav + SearchBox + User Menu

```tsx
import { Header } from '@/design-system/organisms'

<Header
  logo={{ src: '/logo.png', alt: 'Lodgra' }}
  navigation={[
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Cleaning', href: '/cleaning' },
  ]}
  onSearch={(query) => console.log('Search:', query)}
/>
```

**Features:**
- Responsive navigation (desktop/mobile)
- Integrated search
- User menu (auth state dependent)
- Sticky positioning

---

### Sidebar

Navigation sidebar with brand.

**Composition:** Brand + Nav + User Profile

```tsx
import { Sidebar } from '@/design-system/organisms'

<Sidebar
  brand={{ label: 'Lodgra' }}
  items={[
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Cleaning', href: '/cleaning', icon: CheckSquare },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]}
  collapsed={isMobile}
/>
```

**Features:**
- Collapsible on mobile
- Active route highlighting
- Icon + label support
- User profile section

---

### Form

Complex form with multiple fields.

**Composition:** Multiple FormFields + Buttons

```tsx
import { Form } from '@/design-system/organisms'

<Form
  title="Book Cleaning Service"
  fields={[
    { name: 'service', label: 'Service Type', type: 'select' },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'address', label: 'Address', type: 'text' },
  ]}
  onSubmit={handleSubmit}
  submitLabel="Book Now"
/>
```

**Features:**
- Field-level validation
- Error aggregation
- Submit/Cancel buttons
- Loading states
- Optional fields

---

## Usage Patterns

### Form with Validation

```tsx
import { FormField } from '@/design-system/molecules'
import { Button } from '@/design-system/atoms'
import { useState } from 'react'

export function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = {}
    
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      // Submit form
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField
        label="Email"
        inputProps={{
          type: 'email',
          value: formData.email,
          onChange: (e) => setFormData({ ...formData, email: e.target.value }),
        }}
        error={!!errors.email}
        errorMessage={errors.email}
      />
      <FormField
        label="Password"
        inputProps={{
          type: 'password',
          value: formData.password,
          onChange: (e) => setFormData({ ...formData, password: e.target.value }),
        }}
        error={!!errors.password}
        errorMessage={errors.password}
      />
      <Button onClick={handleSubmit}>Login</Button>
    </form>
  )
}
```

### Search with Navigation

```tsx
import { SearchBox } from '@/design-system/molecules'
import { useRouter } from 'next/navigation'

export function HeaderSearch() {
  const router = useRouter()

  return (
    <SearchBox
      inputProps={{ placeholder: 'Search services...' }}
      onSearch={(value) => {
        if (value.trim()) {
          router.push(`/search?q=${encodeURIComponent(value)}`)
        }
      }}
    />
  )
}
```

### Card Layout

```tsx
import { Card } from '@/design-system/molecules'
import { Button } from '@/design-system/atoms'

export function ServiceCard({ service }) {
  return (
    <Card
      title={service.name}
      subtitle={`$${service.price}/hour`}
      variant="elevated"
      footer={
        <Button className="w-full">Book Service</Button>
      }
    >
      <p className="text-design-sm">{service.description}</p>
      <p className="text-design-xs text-lodgra-primary/60 mt-2">
        ⭐ {service.rating} ({service.reviews} reviews)
      </p>
    </Card>
  )
}
```

---

## Best Practices

### ✅ DO:

1. **Use FormField for forms** — Combines validation logic
2. **Use Card for containers** — Consistent spacing and styling
3. **Use tokens in classes** — `text-lodgra-primary`, `bg-lodgra-bg-light`
4. **Keep components focused** — One responsibility per component
5. **Test edge cases** — Empty states, loading, errors
6. **Document props** — Use TypeScript interfaces for clarity

### ❌ DON'T:

1. **Don't use inline colors** — Use design tokens from tailwind config
2. **Don't create one-off components** — Extend existing ones instead
3. **Don't skip accessibility** — Use semantic HTML, ARIA labels
4. **Don't hardcode sizes** — Use size variants (sm/md/lg)
5. **Don't ignore error states** — Handle all validation scenarios

---

## Integration Checklist

- [x] All atoms documented with examples
- [x] All molecules documented with examples
- [x] Usage patterns with real code
- [x] Token integration explained
- [x] Best practices defined
- [x] Component composition shown
- [ ] Storybook setup (optional, Phase 5+)
- [ ] Visual regression tests (optional, Phase 5+)
- [ ] Performance audit (optional, Phase 5+)

---

## Next Steps

1. **A11y Audit** → Validate WCAG AA/AAA compliance
2. **Organisms** → Build Header, Sidebar, Form
3. **ROI Report** → Calculate design system value
4. **Storybook** → Interactive component documentation

---

**Status:** ✅ Phase 5.1 Complete — Documentation  
**Last Updated:** 2026-05-15  
**Generated by:** Design System Automation
