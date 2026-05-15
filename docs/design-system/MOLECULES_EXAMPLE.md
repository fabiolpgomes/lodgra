# Molecules — Usage Examples

## Phase 4 Molecules Complete

Complete examples showing how to compose atoms into molecules.

---

## FormField Example

Simple form composition for login:

```tsx
import { FormField } from '@/design-system/molecules'

export function LoginForm() {
  const [errors, setErrors] = useState({})

  return (
    <form className="flex flex-col gap-4">
      <FormField
        label="Email"
        inputProps={{
          type: 'email',
          placeholder: 'seu@email.com',
        }}
        helperText="Informe um email válido"
      />

      <FormField
        label="Senha"
        inputProps={{
          type: 'password',
          placeholder: '••••••••',
        }}
        helperText="Min 8 caracteres"
      />

      <FormField
        label="Confirmar Senha"
        inputProps={{
          type: 'password',
          placeholder: '••••••••',
        }}
        error={errors.password !== undefined}
        errorMessage={errors.password}
      />
    </form>
  )
}
```

---

## SearchBox Example

Search integration in header:

```tsx
import { SearchBox } from '@/design-system/molecules'
import { useRouter } from 'next/navigation'

export function HeaderSearch() {
  const router = useRouter()

  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/busca?q=${encodeURIComponent(value)}`)
    }
  }

  return (
    <SearchBox
      inputProps={{
        placeholder: 'Pesquisar limpezas...',
      }}
      onSearch={handleSearch}
      buttonProps={{
        children: 'Buscar',
      }}
    />
  )
}
```

---

## Card Example

Display grouped information:

```tsx
import { Card } from '@/design-system/molecules'
import { Button } from '@/design-system/atoms'

export function OrderCard({ order }) {
  return (
    <Card
      title="Pedido #12345"
      subtitle={`Criado em ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`}
      variant="elevated"
      padding="md"
      footer={
        <div className="flex gap-2">
          <Button variant="primary" size="sm">
            Ver Detalhes
          </Button>
          <Button variant="ghost" size="sm">
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex justify-between">
        <span className="text-design-sm text-lodgra-primary/60">Status:</span>
        <span className="text-design-sm font-bold">{order.status}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-design-sm text-lodgra-primary/60">Total:</span>
        <span className="text-design-base font-bold">R$ {order.total.toFixed(2)}</span>
      </div>
    </Card>
  )
}
```

---

## Combined Example — Booking Form

Complete form using multiple molecules:

```tsx
import { FormField, Card } from '@/design-system/molecules'
import { Button } from '@/design-system/atoms'
import { useState } from 'react'

export function BookingForm() {
  const [formData, setFormData] = useState({
    service: '',
    date: '',
    time: '',
  })

  const [errors, setErrors] = useState({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validate and submit
  }

  return (
    <Card
      title="Agendar Limpeza"
      padding="lg"
      footer={
        <Button className="w-full">
          Confirmar Agendamento
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Serviço"
          inputProps={{
            placeholder: 'Selecione um serviço',
            value: formData.service,
            onChange: (e) => setFormData({ ...formData, service: e.target.value }),
          }}
          error={!!errors.service}
          errorMessage={errors.service}
        />

        <FormField
          label="Data"
          inputProps={{
            type: 'date',
            value: formData.date,
            onChange: (e) => setFormData({ ...formData, date: e.target.value }),
          }}
          error={!!errors.date}
          errorMessage={errors.date}
        />

        <FormField
          label="Horário"
          inputProps={{
            type: 'time',
            value: formData.time,
            onChange: (e) => setFormData({ ...formData, time: e.target.value }),
          }}
          helperText="Horários disponíveis: 08:00 - 18:00"
        />
      </form>
    </Card>
  )
}
```

---

## Styling Integration

All molecules use design tokens automatically:

```tsx
// Colors (from tokens.css)
- text-lodgra-primary (#1E3A8A)
- border-lodgra-primary/10 (transparent variant)

// Typography (from tokens.css)
- text-design-sm (11px)
- font-heading (Hanken Grotesk)

// Spacing
- gap-2, gap-4 (from Tailwind)
- p-3, p-4, p-6 (padding variants)

// States
- focus:ring-lodgra-primary/20
- disabled:opacity-50
- error: border-red-500
```

---

## Next Steps — Phase 5

Once molecules are complete, build **organisms** combining multiple molecules:

- **Header** (Logo + Nav + SearchBox)
- **Sidebar** (Nav + Brand)
- **Form** (Multiple FormFields + Buttons)

Then move to **Phase 5 Quality** for accessibility and documentation.

---

**Status:** ✅ Phase 4 Molecules Complete  
**Last Updated:** 2026-05-15
