# Email Sync Dashboard — Front-End Specification

**Version:** 1.0  
**Status:** Ready for Implementation  
**Target:** @dev (Dex)  
**Design Approved By:** Uma (UX Design Expert)  
**Date:** 2026-07-30

---

## 1. Overview & Architecture

### 1.1 Purpose
A scalable, search-first UI for monitoring email synchronization across 50+ properties. Admin performs daily standup (5 min), investigates issues, and takes corrective actions (retry, mark reviewed, refine extraction).

### 1.2 Design Principles
- **Search-First:** Autocomplete on property name + channel tags
- **Minimal Cognitive Load:** Admin finds problem in < 5 seconds
- **Modal Drill-Down:** Details in overlay (non-destructive navigation)
- **Role-Based UX:** Admin full access, Assistant can act, Owner read-only
- **Smart Performance:** Preload top 10 properties, lazy-load rest
- **Action Templates:** Automated fixes for common errors

### 1.3 Technology Stack
- React 18+ (with TypeScript)
- Tailwind CSS (Lodgra design tokens)
- shadcn/ui components (Button, Input, Card, Dialog, etc)
- date-fns for date formatting
- React Query for data fetching

---

## 2. Page Structure & Layout

### 2.1 Main Layout
```
┌─────────────────────────────────────────┐
│  Header: Logo + Title + Settings        │  (AuthLayout)
├─────────────────────────────────────────┤
│                                         │
│  [Search Bar with Autocomplete]         │  ← HERO
│                                         │
│  [Alert Banner if Criticals Exist]      │  ← Conditional
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  Browse Mode (if no search):         ││
│  │  [Filter: Status ▼] [Err Type ▼]   ││
│  │                                     ││
│  │  Property Cards Grid (responsive)   ││
│  │  - Top 10 properties auto-loaded    ││
│  │  - Infinite scroll for rest         ││
│  │                                     ││
│  │  🔴 Casa Moinho (18%, 7 casos)     ││
│  │  🟡 AHS Premium (12%, 4 casos)     ││
│  │  🟢 AHS T1 (3%, 0 casos)           ││
│  │  ...                                ││
│  └─────────────────────────────────────┘│
│                                         │
│  [Modal: Property Details (when clicked)]│
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 Component Hierarchy
```
SyncDashboardPage (Server Component)
├─ AuthLayout
├─ SyncDashboardClient (Client Component)
│  ├─ SearchBar
│  │  ├─ Input
│  │  └─ Autocomplete (with PropertyCard preview)
│  ├─ AlertBanner (conditional)
│  │  └─ [List of critical properties]
│  ├─ BrowseSection (if no search)
│  │  ├─ FilterBar
│  │  │  ├─ StatusFilter
│  │  │  └─ ErrorTypeFilter
│  │  └─ PropertyGrid
│  │     └─ PropertyCard (repeating)
│  │        ├─ StatusBadge
│  │        ├─ PercentageDisplay
│  │        └─ CaseCount
│  └─ PropertyDetailModal
│     ├─ ModalHeader
│     ├─ HealthMetrics
│     ├─ HistoryChart
│     ├─ CommonErrors
│     ├─ CasesPendingTable
│     │  └─ CaseRow
│     │     ├─ ErrorBadge
│     │     ├─ ActionButtons
│     │     └─ ResolutionTemplate
│     └─ ModalFooter (Actions)
│        ├─ [Retry Sync]
│        ├─ [Mark Investigated]
│        └─ [View Logs]
```

---

## 3. Component Specifications

### 3.1 SearchBar Component

**File:** `src/app/[locale]/sync/components/SearchBar.tsx`

```typescript
interface SearchBarProps {
  onSearch: (propertyId: string, propertyName: string) => void
  properties: PropertySummary[] // Preloaded top 10 + searchable
  isSearching: boolean
}

interface PropertySummary {
  id: string
  name: string
  channels: string[] // ['Booking.com', 'Airbnb']
  status: 'healthy' | 'warning' | 'critical'
  reviewRate: number // 0-100
  caseCount: number
}
```

**Behavior:**
- Input debounce: 300ms
- Show autocomplete with 3 matches (status badge + review rate)
- Click result → opens PropertyDetailModal
- Clear button resets to browse mode
- Mobile: full-width input

**States:**
- `idle` — empty, showing placeholder
- `searching` — debounce pending
- `results` — matches displayed
- `no_matches` — "No properties found"
- `error` — "Failed to search"

---

### 3.2 PropertyCard Component

**File:** `src/app/[locale]/sync/components/PropertyCard.tsx`

```typescript
interface PropertyCardProps {
  property: PropertyDetail
  onClick: () => void
  userRole: 'admin' | 'assistant' | 'owner'
}

interface PropertyDetail {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical'
  reviewRate: number
  caseCount: number
  lastSync: string // ISO timestamp
  lastSyncSuccess: boolean
  channels: string[]
  errorPattern?: string // "Propriedade não identificada" | "Múltiplas reservas"
}
```

**Rendering:**
```
┌────────────────────────────┐
│ 🔴 Casa Moinho Refúgio     │
│                            │
│ 18% revisão   ↑ 5% vs ontem│
│ 7 casos pendentes          │
│                            │
│ Último sync: 2h atrás ❌   │
│ Canais: Booking, Airbnb    │
│                            │
│ [Investigar]               │
└────────────────────────────┘
```

**Interactive:**
- Click anywhere → open PropertyDetailModal
- Hover → subtle shadow increase
- Mobile: Full width, stacked grid

---

### 3.3 PropertyDetailModal Component

**File:** `src/app/[locale]/sync/components/PropertyDetailModal.tsx`

```typescript
interface PropertyDetailModalProps {
  property: PropertyDetail
  isOpen: boolean
  onClose: () => void
  userRole: 'admin' | 'assistant' | 'owner'
}
```

**Sections:**

#### Header
```
🔴 CASA MOINHO REFÚGIO
Taxa de Revisão: 18% (↑ 5% vs ontem)
Casos Pendentes: 7
Último Sync: 2h atrás ❌ Falhou
Canais: Booking.com, Airbnb
```

#### Health Metrics
```
┌─────────────────────────────────┐
│ Taxa de Revisão: 18%            │
│ Casos Pendentes: 7              │
│ Erro Mais Comum: "Propriedade   │
│ não identificada" (5 casos)     │
│ Trend: 5% → 8% → 12% → 18%    │
└─────────────────────────────────┘
```

#### History Chart (7/14/30 days)
```
Graph: Review Rate by Day
[Interactive chart, hover shows daily breakdown]
Seg  Ter  Qua  Qui  Sex  Sab  Dom
5%   8%   10%  12%  15%  17%  18%
```

#### Cases Pending Table
```
Columns:
- Guest Name
- Error Type (badge)
- Date
- Action (context menu)

Rows (max 5 visible, scroll for more):
📍 João Silva (15 Jul)
   Erro: Propriedade não identificada
   [Refinar] [Ignorar] [+ Info]

📍 Maria Costa (14 Jul)
   Erro: Múltiplas reservas mesma data
   [Desambiguar] [Ignorar] [+ Info]
```

#### Resolution Templates
```
"Propriedade não identificada" (5 cases)
┌─────────────────────────────────────────┐
│ 🔧 Solução Rápida:                      │
│                                         │
│ 1. Ver emails desses 5 casos            │
│ 2. Comum: Property name não extraído    │
│ 3. Fix: [Refinar Extraction Prompt] ← │
│    (Auto-applies known pattern)        │
│                                         │
│ Ou:                                     │
│ [Marcar Todos como Investigados]        │
└─────────────────────────────────────────┘

"Múltiplas reservas mesma data" (2 cases)
┌─────────────────────────────────────────┐
│ 🔧 Solução Rápida:                      │
│                                         │
│ 1. Desambiguar: Qual reserva sincronizar?
│    [Case 1] vs [Case 2]                │
│ 2. Ou: Ajustar Thresholds               │
│    [Ajustar PROPERTY_MATCH_THRESHOLD]  │
└─────────────────────────────────────────┘
```

#### Action Buttons (Role-Based)
```
Admin:
[Retry Sync Agora] [Marcar Investigado] [View Logs] [Contatar Suporte]Assistant:
[Marcar Investigado] [View Logs]

Owner (read-only):
[View Only] [Notificar Proprietário]
```

---

### 3.4 AlertBanner Component

**File:** `src/app/[locale]/sync/components/AlertBanner.tsx`

```typescript
interface AlertBannerProps {
  criticalProperties: PropertySummary[]
  isExpanded: boolean
  onToggle: () => void
}
```

**Rendering:**
```
⚠️  Alertas Críticos (3)  [▼]

[Expanded]
🔴 Casa Moinho (18%, desde 2h)
   [Investigar] [Ignorar]

🔴 AHS Premium (16%, desde 1h)
   [Investigar] [Ignorar]

🔴 AHS T2 (15%, desde 30m)
   [Investigar] [Ignorar]

[Collapsed]
⚠️  Alertas Críticos (3)  [▶]
```

---

### 3.5 FilterBar Component

**File:** `src/app/[locale]/sync/components/FilterBar.tsx`

```typescript
interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void
  activeFilters: FilterState
}

interface FilterState {
  status?: 'critical' | 'warning' | 'healthy' // undefined = all
  errorType?: string // undefined = all
  period?: 7 | 14 | 30 // days
}
```

**Rendering:**
```
[Status ▼]  [Error Type ▼]  [Period ▼]  [Reset Filters]

Status Options:
- Todas (default)
- 🔴 Críticas (3)
- 🟡 Avisos (5)
- 🟢 Saudáveis (42)

Error Type Options:
- Todas (default)
- Propriedade não identificada (8)
- Múltiplas reservas mesma data (4)

Period Options:
- 7 dias
- 14 dias
- 30 dias
```

---

### 3.6 StatusBadge Component

**File:** `src/components/common/ui/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'critical'
  text?: string
}

// Usage:
<StatusBadge status="critical" /> // Shows: 🔴
<StatusBadge status="warning" /> // Shows: 🟡
<StatusBadge status="healthy" /> // Shows: 🟢
```

---

## 4. Data Structure & APIs

### 4.1 Search API

**GET `/api/admin/sync/search?q={query}&limit=10`**

```typescript
Response {
  results: PropertySummary[]
  total: number
  executedAt: ISO8601
}

PropertySummary {
  id: string // uuid
  name: string
  status: 'healthy' | 'warning' | 'critical'
  reviewRate: number // 0-100
  caseCount: number
  lastSync: ISO8601
  lastSyncSuccess: boolean
  channels: string[] // ['Booking.com', 'Airbnb']
  trend: number // -5 to +5 (percentage change vs yesterday)
}
```

### 4.2 Property Detail API

**GET `/api/admin/sync/properties/{propertyId}`**

```typescript
Response {
  property: PropertyDetail
  executedAt: ISO8601
}

PropertyDetail {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical'
  reviewRate: number
  caseCount: number
  lastSync: ISO8601
  lastSyncSuccess: boolean
  channels: string[]
  errorPatterns: ErrorPattern[]
  history: HistoryPoint[] // last 30 days
}

ErrorPattern {
  type: string // "Propriedade não identificada"
  count: number
  percentage: number
  suggestedFix: string
}

HistoryPoint {
  date: ISO8601
  reviewRate: number
  syncCount: number
  successCount: number
}
```

### 4.3 Cases Pending API

**GET `/api/admin/sync/properties/{propertyId}/cases?limit=50&offset=0`**

```typescript
Response {
  cases: CasePending[]
  total: number
  executedAt: ISO8601
}

CasePending {
  id: string
  guestName: string | null
  propertyName: string | null
  checkIn: ISO8601
  checkOut: ISO8601
  createdAt: ISO8601
  lastModified: ISO8601
  errorType: string // "Propriedade não identificada"
  email: {
    subject: string
    snippet: string // first 200 chars
  }
  status: 'pending_review' | 'investigated' | 'resolved'
  investigatedBy?: string // user email
  investigatedAt?: ISO8601
}
```

### 4.4 Action APIs (POST)

#### Retry Sync
**POST `/api/admin/sync/properties/{propertyId}/retry`**

```typescript
Request {}
Response {
  success: boolean
  syncId: string
  message: string
}
```

#### Mark Investigated
**POST `/api/admin/sync/cases/{caseId}/mark-investigated`**

```typescript
Request {
  notes?: string
}
Response {
  success: boolean
  case: CasePending
}
```

#### Apply Resolution Template
**POST `/api/admin/sync/properties/{propertyId}/apply-template`**

```typescript
Request {
  templateId: string // 'refine_extraction' | 'adjust_threshold'
  parameters?: object
}
Response {
  success: boolean
  appliedAt: ISO8601
  affectedCases: number
  message: string
}
```

---

## 5. State Management

### 5.1 Component State (React Query)

```typescript
// Search results
const searchQuery = useQuery({
  queryKey: ['sync', 'search', query],
  queryFn: async () => fetchSearch(query),
  enabled: query.length > 0,
  staleTime: 30000, // 30s
})

// Browse mode (properties list)
const propertiesQuery = useQuery({
  queryKey: ['sync', 'properties', filters],
  queryFn: async () => fetchProperties(filters),
  staleTime: 60000, // 1 min
})

// Property detail (modal)
const propertyDetailQuery = useQuery({
  queryKey: ['sync', 'property', propertyId],
  queryFn: async () => fetchPropertyDetail(propertyId),
  staleTime: 30000,
})

// Cases for property
const casesQuery = useQuery({
  queryKey: ['sync', 'property', propertyId, 'cases', pagination],
  queryFn: async () => fetchCases(propertyId, pagination),
  staleTime: 30000,
})
```

### 5.2 Modal State

```typescript
const [selectedProperty, setSelectedProperty] = useState<PropertyDetail | null>(null)
const [isModalOpen, setIsModalOpen] = useState(false)

// Open modal when clicking property
const handlePropertyClick = (property: PropertyDetail) => {
  setSelectedProperty(property)
  setIsModalOpen(true)
}

// Close modal
const handleCloseModal = () => {
  setSelectedProperty(null)
  setIsModalOpen(false)
  // Optional: refetch properties list to update status badges
  propertiesQuery.refetch()
}
```

---

## 6. Interaction & Behavior

### 6.1 Search Flow

1. User types in search input
2. Debounce 300ms
3. Query API with query string
4. Show autocomplete with 3 results
5. Click result → set selectedProperty → open modal
6. Escape or X → close modal, keep search
7. Clear button → reset to browse mode

### 6.2 Browse Flow

1. Show PropertyGrid (top 10 preloaded)
2. As user scrolls down, load next batch (infinite scroll)
3. Show FilterBar above grid
4. Click filter → update URL params + refetch
5. Click property card → open modal

### 6.3 Modal Flow

1. Modal opens with property detail
2. Show health metrics, chart, error patterns
3. Show resolution templates (if applicable)
4. User selects action:
   - [Retry] → POST to retry API → show loading → success/error toast
   - [Marcar Investigado] → POST to mark-investigated → refetch cases
   - [Apply Template] → POST to apply-template → show confirmation → refetch
5. Close modal → refetch properties list (status may have changed)

### 6.4 Real-Time Updates (Optional Phase 2)

- WebSocket listener for sync events
- Update status badges in real-time
- Notification when property becomes critical

---

## 7. Role-Based Access Control (RLS)

### 7.1 Data Filtering

**Admin:**
- Sees ALL 50 properties in search/browse
- Can retry, investigate, apply templates
- Can view all cases

**Assistant:**
- Sees SUBSET of properties (configured in user profile)
  - e.g., "Assigned to São Paulo region" → only those properties visible
- Can retry, mark investigated
- Cannot apply templates (technical operations only by admin)
- Can view cases for assigned properties

**Owner (Proprietário):**
- Sees ONLY their property (filter by owner_id)
- Read-only mode (no action buttons)
- Can see case history but cannot resolve
- Optional: Notify button to email proprietário

### 7.2 Backend Implementation

```typescript
// In API route
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role, assigned_properties')
  .eq('id', user.id)
  .single()

// Apply RLS filter
let query = supabase.from('properties')
if (profile.role === 'admin') {
  // No filter, see all
} else if (profile.role === 'assistant') {
  query = query.in('id', profile.assigned_properties)
} else if (profile.role === 'owner') {
  query = query.eq('owner_id', user.id)
}

return query
```

---

## 8. Error Handling

### 8.1 API Errors

```typescript
// Search API fails
<AlertBanner>
  Failed to search properties. <button>Retry</button>
</AlertBanner>

// Retry sync fails
<Toast type="error">
  Failed to retry sync. Please try again or contact support.
</Toast>

// Mark investigated fails
Modal stays open, show error message below button
"Failed to save. Please try again."
```

### 8.2 Empty States

```
No search results
"No properties matching 'xyz'"

No properties with filters
"No properties found with status 'crítica'"

No cases pending (healthy state)
"✅ Nenhum caso aguardando revisão"
```

---

## 9. Performance Optimization

### 9.1 Data Loading Strategy

- **Preload:** Top 10 properties (sorted by review rate descending)
- **On-Demand:** Rest of properties (infinite scroll, 10 per batch)
- **Search:** API search endpoint (indexed by name)
- **Detail:** Load on modal open (single property query)
- **Cases:** Paginated (load first 5, show "Load More" for rest)

### 9.2 Query Cache Times

- Search results: 30s (fast refresh while searching)
- Properties list: 60s (reasonable for browse)
- Property detail: 30s (modal can refresh)
- Cases: 30s (important for real-time feel)

### 9.3 UI Performance

- Virtualize PropertyGrid (only render visible cards)
- Debounce search input (300ms)
- Lazy-load modal content (chart + cases load in parallel)
- Code-split: Modal component only loads when opened

---

## 10. Accessibility (WCAG AA)

- All buttons have aria-labels
- Modal has role="dialog" + aria-labelledby
- Form inputs have labels
- Color not only indicator (text + icons for status)
- Keyboard navigation: Tab through buttons, Escape to close modal
- Focus management: Move to modal on open, back to trigger on close

---

## 11. Responsive Design

**Desktop (1024px+)**
- PropertyGrid: 3-column
- Modal: 80% width, centered

**Tablet (768px - 1023px)**
- PropertyGrid: 2-column
- Modal: 90% width, full height with scroll

**Mobile (< 768px)**
- PropertyGrid: 1-column, full width
- SearchBar: Full width, sticky at top
- Modal: Full screen, slides up from bottom (drawer style)
- FilterBar: Collapses into dropdown menu

---

## 12. Mockups & Figma

Design approved by Uma (UX Design Expert).  
Wireframes: See `/docs/specs/SYNC-DASHBOARD-WIREFRAMES.txt`

---

## 13. Implementation Checklist

- [ ] SearchBar component with autocomplete
- [ ] PropertyCard component with status badge
- [ ] PropertyDetailModal with sections
- [ ] FilterBar with dropdowns
- [ ] PropertyGrid with infinite scroll
- [ ] API integration (search, detail, cases, actions)
- [ ] Error handling & toast notifications
- [ ] Loading states (skeleton loaders)
- [ ] RLS backend validation
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (axe DevTools)
- [ ] Performance testing (Core Web Vitals)
- [ ] E2E tests (Cypress/Playwright)
- [ ] Storybook components

---

## 14. Next Steps (Phase 2)

- Real-time WebSocket updates for status changes
- Notification service (Email + Push)
- Template marketplace (share fixes between admins)
- Bulk actions (resolve 10 cases at once)
- Analytics dashboard (ROI of template fixes)

---

**Spec Ready for Development**  
Assign to @dev for implementation.  
Questions? Contact Uma (UX Design Expert) or Fabio (Product Owner).
