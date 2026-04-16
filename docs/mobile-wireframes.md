# 📱 Mobile-First Wireframes (High Fidelity)

**Methodology:** Mobile-first, bottom-up (atoms → molecules → organisms)  
**Breakpoints:** base (320px) → sm (640px) → md (768px)  
**Interaction:** Touch-first, swipe-enabled, 44px+ targets

---

## 1️⃣ Dashboard Mobile (Vertical Stack)

### Mobile Layout (320px - 640px)
```
┌─────────────────────────────┐
│   Home Stay                 │  ← Header (sticky)
│   [Olá, Luís Gomes]        │
├─────────────────────────────┤
│                             │
│  📊 Métricas (Cards Stack)  │  ← Cards: Full-width, vertical
│  ┌─────────────────────────┐│    - Total Revenue
│  │ €3,245 este mês        ││    - Occupancy %
│  │ +12% vs mês anterior   ││    - Bookings count
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 73% Ocupação           ││
│  │ +8% vs ano anterior    ││
│  └─────────────────────────┘│
│                             │
│  📈 Status (Responsive)     │  ← h-48 (mobile), h-64 (tablet)
│  ┌─────────────────────────┐│    Touch-friendly chart
│  │  [CHART]                ││    Confirmadas 12
│  │  Confirmadas: 12        ││    Pendentes: 3
│  │  Pendentes: 3           ││    Canceladas: 1
│  └─────────────────────────┘│
│                             │
│  📊 Ocupação (Responsive)   │  ← h-48 (mobile), h-64 (tablet)
│  ┌─────────────────────────┐│
│  │  [CHART]                ││
│  │  Média: 71%             ││
│  └─────────────────────────┘│
│                             │
│  💰 Receita (Responsive)    │  ← h-48 (mobile), h-64 (tablet)
│  ┌─────────────────────────┐│
│  │  [CHART]                ││
│  │  Total: €8,340          ││
│  └─────────────────────────┘│
│                             │
├─────────────────────────────┤
│  [Início][Reservas][...] Mais │  ← Bottom nav (56px)
└─────────────────────────────┘
```

### Tablet Layout (640px+)
```
┌───────────────────────────────────────┐
│ Home Stay    [Search]    [Olá, Luís] │  ← Horizontal header
├───────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  │
│  │ €3,245       │  │ 73%          │  │  ← Cards: 2-column grid
│  │ +12%         │  │ +8%          │  │
│  └──────────────┘  └──────────────┘  │
│                                       │
│  ┌────────────────────────────────┐  │
│  │  Status Chart (h-64)            │  │  ← Charts: Side-by-side
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Occupancy Chart (h-64)         │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  Revenue Chart (h-64)           │  │
│  └────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### Responsive Tailwind
```tsx
// Charts: Mobile-first
<div className="h-48 sm:h-56 md:h-80">
  <StatusChart />
</div>

// Cards: Mobile stack → tablet 2-col → desktop 3-col
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <MetricCard />
  <MetricCard />
  <MetricCard />
</div>

// Typography: Smaller mobile
<h1 className="text-xl sm:text-2xl md:text-3xl font-bold" />
```

---

## 2️⃣ Calendar Mobile (Touch-Optimized)

### Mobile View (320px - 640px)
```
┌─────────────────────────────┐
│ Calendário                  │  ← Sticky header
│ [< Abril 2026 >]           │     Touch: swipe left/right
├─────────────────────────────┤
│  seg  ter  qua  qui  sex    │  ← Compact header (6px font)
│        1    2    3    4     │     Numbers only (no day names)
│  [5   6    7    8    9   10]│
│ 11  [12  13   14   15   16] │  ← Today: blue pill
│ 17  [18  19   20   21   22] │
│ 23   24   25   26   27   28 │
│ 29   30                      │
├─────────────────────────────┤
│ April 4 (Selected)          │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Bruno Pinho — Casa Pre  │ │  ← Reservation bars
│ │ Check-in: 2, Out: 4     │ │     Swipe to see details
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Celia Ulisses — Casa Pre│ │
│ │ Check-in: 4, Out: 5     │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ [+ New] [<  >]              │  ← Action buttons
│                             │
├─────────────────────────────┤
│ [Início][Reservas][Cal][Mais]  ← Bottom nav
└─────────────────────────────┘
```

### Touch Interactions
- **Swipe Left/Right:** Change month
- **Tap Date:** Show day view with times
- **Long-Press Event:** Edit reservation
- **Drag Event:** Reschedule (with confirmation)
- **Pinch:** Zoom (optional, v2)

### Responsive Tailwind
```tsx
// Calendar grid: Smaller on mobile
<div className="text-[10px] sm:text-xs md:text-sm">
  {/* Day cells */}
</div>

// Event bars: Full width on mobile
<div className="mx-1 sm:mx-2 px-2 py-1 text-[11px] truncate">
  {reservation.guestName}
</div>

// Actions: Bottom sheets on mobile
<BottomSheet className="md:hidden">
  {/* Calendar controls */}
</BottomSheet>
```

---

## 3️⃣ Booking Flow (Progressive Steps)

### Mobile Checkout (320px)
```
┌─────────────────────────────┐
│ Casa Pré Fabricada Loule    │  ← Property header
│ [< Voltar]                  │     Swipe left to go back
├─────────────────────────────┤
│ PASSO 1: Resumo             │
├─────────────────────────────┤
│ 📅 2-5 Abril               │
│ 👥 4 Hóspedes              │
│ 💰 €340 total              │
│                             │
│ [Continuar para Dados]      │  ← Full-width button (56px)
├─────────────────────────────┤

PASSO 2: Dados do Hóspede (if scrolled)
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Nome *                  │ │  ← Full-width inputs (44px height)
│ │ [____________________]  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Email *                 │ │
│ │ [____________________]  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Telefone *              │ │
│ │ [____________________]  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ País *                  │ │  ← Dropdown: full-width
│ │ [Portugal        ▼]     │ │
│ └─────────────────────────┘ │
│                             │
│ [Continuar para Pagamento]  │
├─────────────────────────────┤

PASSO 3: Pagamento (if scrolled)
├─────────────────────────────┤
│ Stripe iFrame               │  ← Full-width
│ (Mobile-optimized by Stripe)│
│                             │
│ [Pagar €340]                │
│                             │
├─────────────────────────────┤
│ [Início][Reservas][Cal][+] │  ← Bottom nav
└─────────────────────────────┘
```

### Tablet Layout (640px+)
```
┌──────────────────────────────────────┐
│ Casa Pré Fabricada Loule             │
├──────────────────────────────────────┤
│  Step 1       Step 2       Step 3     │  ← Horizontal progress
│  Resumo       Dados       Pagamento   │
│    ✓           ►            ○        │
├──────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │ 📅 2-5 Abril                    │ │  ← Wider cards
│  │ 👥 4 Hóspedes                   │ │
│  │ 💰 €340 total                   │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Nome:    [________________]      │ │  ← Side-by-side inputs
│  │ Email:   [________________]      │ │
│  │ Phone:   [________________]      │ │
│  │ País:    [Portugal          ▼]  │ │
│  └─────────────────────────────────┘ │
│                                       │
│           [Continuar >]               │
└──────────────────────────────────────┘
```

### Responsive Tailwind
```tsx
// Steps: Vertical mobile → horizontal tablet
<div className="flex flex-col sm:flex-row gap-4">
  <Step number={1} />
  <Step number={2} />
  <Step number={3} />
</div>

// Inputs: Full-width mobile
<input className="w-full sm:w-1/2 h-12 px-3 text-base" />

// Buttons: 56px height on mobile (thumb-friendly)
<button className="w-full h-14 sm:h-12 font-semibold rounded-lg" />
```

---

## 4️⃣ Forms (Mobile-Optimized)

### New Reservation Form (Mobile)
```
┌─────────────────────────────┐
│ Nova Reserva                │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Propriedade *           │ │
│ │ [Todas  ▼]              │ │  ← Dropdowns: full-width
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Check-in *              │ │
│ │ [2026-04-04]            │ │  ← Native date picker (mobile)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Check-out *             │ │
│ │ [2026-04-05]            │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Nome Hóspede *          │ │
│ │ [___________]           │ │  ← Larger tap target
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Email *                 │ │
│ │ [___________]           │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Telefone *              │ │
│ │ [___________]           │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Nº Hóspedes             │ │
│ │ [+ 1 -] = 2             │ │  ← Spinner (mobile-friendly)
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Notas Internas (opt)    │ │
│ │ [___________]           │ │
│ │ [___________]           │ │
│ └─────────────────────────┘ │
│                             │
│ [Criar Reserva] [Cancelar]  │  ← Full-width buttons
│                             │
├─────────────────────────────┤
│ [Início][Reservas][Cal][Mais]  ← Bottom nav
└─────────────────────────────┘
```

### Responsive Tailwind
```tsx
// Form group: Stacked mobile → side-by-side tablet
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField />
  <FormField />
</div>

// Label positioning: Above mobile → beside tablet
<label className="block sm:inline text-sm font-medium" />

// Input spacing: Larger mobile (h-12) → normal tablet (h-10)
<input className="h-12 sm:h-10 px-3 text-base" />

// Select: Custom dropdown mobile → native tablet
<select className="h-12 sm:h-10 appearance-auto sm:appearance-none" />
```

---

## 5️⃣ Navigation (Bottom Tab Bar + Drawer)

### Bottom Nav (Mobile)
```
┌─────────────────────────────┐
│ [Page Content]              │
│                             │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│ [🏠] [📋] [🏢] [📅] [≡ Mais] │  ← 5 icons, 56px height
│ Início Reservas Imóveis Cal   ← Labels (10px)
└─────────────────────────────┘
```

### More Drawer (Bottom Sheet)
```
┌─────────────────────────────┐
│ Menu                        │  ← SheetHeader
├─────────────────────────────┤
│                             │
│ Geral (grid 3-col)          │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │💰    │ │📊    │ │📋    │ │  ← Icons large (32px)
│ │Despesas│ │Financeiro│ │Relatórios│
│ └──────┘ └──────┘ └──────┘ │
│                             │
│ Configuração (grid 3-col)   │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │👥    │ │🔄    │ │⚙️    │ │
│ │Proprietários│ │Sync│ │Definições│
│ └──────┘ └──────┘ └──────┘ │
│                             │
├─────────────────────────────┤
└─────────────────────────────┘
```

### Desktop Navigation (640px+)
```
┌─────────────────────────────────────────────────────┐
│ [Home Stay] [🔍]  [Início] [Reservas] [Imóveis]     │  ← Desktop Header
│                   [Despesas] [Financeiro] [Relatórios]
│                                   [Configuração ▼]
│                                         [👤 Luís] [↓]
└─────────────────────────────────────────────────────┘
```

---

## 🎨 Design Tokens (Mobile-First)

### Spacing
```
xs: 4px    (2px × 2)
sm: 8px    (2px × 4)
md: 16px   (2px × 8)
lg: 24px   (2px × 12)
xl: 32px   (2px × 16)

// Mobile padding: md (16px)
// Tablet padding: lg (24px)
// Desktop padding: xl (32px)
```

### Typography
```
Mobile:
- h1: 20px (text-xl)
- h2: 18px (text-lg)
- h3: 16px (text-base)
- Body: 14px (text-sm)
- Small: 12px (text-xs)

Tablet (640px+):
- h1: 24px (text-2xl)
- h2: 20px (text-xl)
- h3: 18px (text-lg)
- Body: 16px (text-base)
- Small: 14px (text-sm)

Desktop (1024px+):
- h1: 32px (text-3xl)
- h2: 24px (text-2xl)
- h3: 20px (text-xl)
- Body: 16px (text-base)
- Small: 14px (text-sm)
```

### Touch Targets
```
Minimum: 44px × 44px (WCAG AA)
Comfortable: 48px × 48px (Android standard)
Thumb zone: Bottom 66% of screen

// Tailwind utilities
.btn-touch: p-3 min-w-[44px] min-h-[44px]
.input-touch: h-12 px-3 text-base  (48px height)
.select-touch: h-12 px-3            (48px height)
```

### Colors (No change)
```
Primary: blue-600 (#2563eb)
Success: green-600 (#16a34a)
Pending: amber-600 (#d97706)
Cancel: red-600 (#dc2626)
```

---

## 📋 Implementation Checklist

- [ ] Dashboard: Responsive grid (h-48/h-64/h-80)
- [ ] Charts: ResponsiveOptions config
- [ ] Calendar: Touch gestures + view switcher
- [ ] Calendar: dayMaxEvents = 1-2 mobile
- [ ] Forms: Full-width inputs (w-full)
- [ ] Forms: 44px+ touch targets
- [ ] Buttons: 44-48px height mobile
- [ ] Bottom nav: Already implemented ✅
- [ ] PWA: Service worker + manifest
- [ ] PWA: Install prompt handler
- [ ] Offline: IndexedDB cache strategy
- [ ] Testing: Lighthouse mobile 85%+

