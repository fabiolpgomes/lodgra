# Design System API Reference

**Auto-generated from TypeScript interfaces**  
**Last Updated:** 2026-05-15

---

## Table of Contents

1. [Atoms](#atoms)
   - [Button](#button)
   - [Input](#input)
   - [Label](#label)
2. [Molecules](#molecules)
   - [FormField](#formfield)
   - [SearchBox](#searchbox)
   - [Card](#card)
3. [Organisms](#organisms)
   - [Header](#header)
   - [Sidebar](#sidebar)
   - [Form](#form)
   - [Table](#table)
   - [Modal](#modal)
   - [Dropdown](#dropdown)
   - [Chart](#chart)

---

## Atoms

### Button

**Location:** `src/design-system/atoms/Button.tsx`

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Button style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `isLoading` | `boolean` | `false` | Show loading state |
| `disabled` | `boolean` | `false` | Disable button |
| `children` | `React.ReactNode` | Required | Button content |
| `className` | `string` | - | Custom CSS classes |

**Example:**
```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

<Button isLoading>Processing...</Button>
```

---

### Input

**Location:** `src/design-system/atoms/Input.tsx`

```typescript
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorMessage?: string
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Input label |
| `helperText` | `string` | - | Helper text below input |
| `errorMessage` | `string` | - | Error message (shows error state) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Input size |
| `error` | `boolean` | `false` | Error state |
| `type` | `string` | `'text'` | HTML input type |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | `false` | Disable input |
| `className` | `string` | - | Custom CSS classes |

**Example:**
```tsx
<Input
  label="Email"
  type="email"
  placeholder="your@email.com"
  helperText="We'll never share your email"
/>

<Input
  label="Username"
  error
  errorMessage="Username is required"
/>
```

---

### Label

**Location:** `src/design-system/atoms/Label.tsx`

```typescript
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>, VariantProps<typeof labelVariants> {
  size?: 'sm' | 'md' | 'lg'
  optional?: boolean
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Label size |
| `optional` | `boolean` | `false` | Show optional indicator |
| `htmlFor` | `string` | - | Input ID to associate |
| `className` | `string` | - | Custom CSS classes |

**Example:**
```tsx
<Label htmlFor="email">Email</Label>
<Label htmlFor="phone" optional>Phone</Label>
```

---

## Molecules

### FormField

**Location:** `src/design-system/molecules/FormField.tsx`

```typescript
interface FormFieldProps {
  label: string
  labelProps?: Omit<LabelProps, 'children'>
  inputProps: InputProps
  error?: boolean
  errorMessage?: string
  helperText?: string
  required?: boolean
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | Required | Field label |
| `inputProps` | `InputProps` | Required | Input component props |
| `error` | `boolean` | - | Error state |
| `errorMessage` | `string` | - | Error message |
| `helperText` | `string` | - | Helper text |
| `required` | `boolean` | `true` | Show required indicator |
| `labelProps` | `LabelProps` | - | Additional label props |

**Example:**
```tsx
<FormField
  label="Email"
  inputProps={{ type: 'email' }}
  helperText="We'll never spam you"
/>
```

---

### SearchBox

**Location:** `src/design-system/molecules/SearchBox.tsx`

```typescript
interface SearchBoxProps {
  inputProps: Omit<InputProps, 'className'>
  buttonProps?: Omit<ButtonProps, 'children'>
  icon?: React.ReactNode
  onSearch?: (value: string) => void
  showButton?: boolean
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `inputProps` | `InputProps` | Required | Input props |
| `buttonProps` | `ButtonProps` | - | Button props |
| `icon` | `React.ReactNode` | Search icon | Custom icon |
| `onSearch` | `(value: string) => void` | - | Search handler |
| `showButton` | `boolean` | `true` | Show search button |

**Example:**
```tsx
<SearchBox
  inputProps={{ placeholder: 'Search...' }}
  onSearch={(query) => console.log(query)}
/>
```

---

### Card

**Location:** `src/design-system/molecules/Card.tsx`

```typescript
interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'sm' | 'md' | 'lg'
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `React.ReactNode` | - | Card title |
| `subtitle` | `React.ReactNode` | - | Card subtitle |
| `footer` | `React.ReactNode` | - | Footer content |
| `variant` | `'default' \| 'elevated' \| 'outlined'` | `'default'` | Card style |
| `padding` | `'sm' \| 'md' \| 'lg'` | `'md'` | Card padding |
| `children` | `React.ReactNode` | Required | Card content |

**Example:**
```tsx
<Card title="Title" variant="elevated" footer={<Button>Action</Button>}>
  Content here
</Card>
```

---

## Organisms

### Header

**Location:** `src/design-system/organisms/Header.tsx`

```typescript
interface HeaderProps {
  logo?: { src: string; alt: string; href?: string }
  navigation?: Array<{ label: string; href: string }>
  onSearch?: (value: string) => void
  userMenu?: React.ReactNode
  mobileMenuOpen?: boolean
  onMobileMenuToggle?: () => void
}
```

**Example:**
```tsx
<Header
  logo={{ src: '/logo.png', alt: 'Logo' }}
  navigation={[{ label: 'Home', href: '/' }]}
  onSearch={(q) => console.log(q)}
/>
```

---

### Sidebar

**Location:** `src/design-system/organisms/Sidebar.tsx`

```typescript
interface SidebarProps {
  items: SidebarItem[]
  brand?: { label: string; icon?: React.ReactNode }
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  footer?: React.ReactNode
}

interface SidebarItem {
  label: string
  href: string
  icon?: LucideIcon
  active?: boolean
  badge?: string | number
}
```

**Example:**
```tsx
<Sidebar
  items={[
    { label: 'Home', href: '/', icon: Home, active: true },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]}
  brand={{ label: 'App' }}
/>
```

---

### Form

**Location:** `src/design-system/organisms/Form.tsx`

```typescript
interface FormProps {
  title: string
  subtitle?: string
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => Promise<void> | void
  submitLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  isLoading?: boolean
}

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'tel' | 'date' | 'time' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  options?: Array<{ label: string; value: string }>
  helperText?: string
  pattern?: string
  validation?: (value: string) => string | undefined
}
```

**Example:**
```tsx
<Form
  title="Login"
  fields={[
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
  ]}
  onSubmit={handleSubmit}
/>
```

---

### Table

**Location:** `src/design-system/organisms/Table.tsx`

```typescript
interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  striped?: boolean
  bordered?: boolean
  hoverable?: boolean
  sortBy?: keyof T
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: keyof T) => void
  loading?: boolean
  emptyState?: React.ReactNode
}

interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}
```

**Example:**
```tsx
<Table
  data={users}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
  ]}
  striped
/>
```

---

### Modal

**Location:** `src/design-system/organisms/Modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeButton?: boolean
  backdrop?: boolean
}
```

**Example:**
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm"
  footer={<Button onClick={handleConfirm}>Confirm</Button>}
>
  Are you sure?
</Modal>
```

---

### Dropdown

**Location:** `src/design-system/organisms/Dropdown.tsx`

```typescript
interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  onSelect?: (value: string) => void
  align?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
}

interface DropdownItem {
  label: string
  value: string
  icon?: React.ReactNode
  divider?: boolean
  disabled?: boolean
}
```

**Example:**
```tsx
<Dropdown
  trigger={<Button>Menu</Button>}
  items={[
    { label: 'Edit', value: 'edit' },
    { label: 'Delete', value: 'delete', divider: true },
  ]}
  onSelect={(value) => console.log(value)}
/>
```

---

### Chart

**Location:** `src/design-system/organisms/Chart.tsx`

```typescript
interface BarChartProps {
  data: ChartData[]
  height?: number
  showGrid?: boolean
  showValues?: boolean
}

interface PieChartProps {
  data: ChartData[]
  size?: 'sm' | 'md' | 'lg'
}

interface ChartData {
  label: string
  value: number
  color?: string
}
```

**Example:**
```tsx
<BarChart
  data={[
    { label: 'Jan', value: 100, color: '#1E3A8A' },
    { label: 'Feb', value: 150, color: '#1E3A8A' },
  ]}
/>

<PieChart
  data={[
    { label: 'Online', value: 65 },
    { label: 'Offline', value: 35 },
  ]}
/>
```

---

## Common Props

### Size Variants
Most components support size variants:
- `sm` — Small (compact)
- `md` — Medium (default)
- `lg` — Large (prominent)

### Variant Options
Many components support visual variants:
- Button: `'primary' | 'secondary' | 'ghost' | 'danger'`
- Card: `'default' | 'elevated' | 'outlined'`
- Dropdown: `'left' | 'right'` (alignment)

### State Management
Components handle their own state:
- `disabled` — Disable interaction
- `loading` — Show loading state
- `error` — Show error state
- `active` — Show active/selected state

### Custom Styling
All components accept:
- `className` — Custom CSS classes (merged with defaults)
- `style` — Inline styles (React standard)
- Custom props are passed through to underlying HTML elements

---

## Type Exports

All TypeScript interfaces are exported for use in your application:

```typescript
import {
  ButtonProps,
  InputProps,
  LabelProps,
  FormFieldProps,
  SearchBoxProps,
  CardProps,
  HeaderProps,
  SidebarProps,
  FormProps,
  TableProps,
  ModalProps,
  DropdownProps,
  BarChartProps,
  PieChartProps,
  ChartData,
} from '@/design-system'
```

---

**Last Generated:** 2026-05-15  
**Total Components:** 13 (3 atoms + 3 molecules + 7 organisms)  
**TypeScript Support:** ✅ Full type safety
