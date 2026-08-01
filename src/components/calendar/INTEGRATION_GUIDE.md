# Calendar & Settings Integration Guide

## Epic 43: Complete Implementation

### Architecture

```
CalendarWithSettings (Wrapper)
├── CalendarComponent (Kanban/List)
│   ├── onDayClick → Selection Hook
│   └── selectedDates (highlighted)
├── SettingsSidebar (5 Cards)
│   ├── PriceCard
│   ├── DiscountCard
│   ├── AvailabilityCard
│   ├── CancellationCard
│   └── TaxesCard
└── CalendarDayClickModal (Interaction)
    ├── Action Selection
    └── Data Entry & Save

useCalendarSelection Hook
├── State: selectedDates, mode, selectedCard
├── Actions: toggleDay, selectDateRange, clearSelection
└── Modal Helpers: openPriceModal, openDiscountModal, etc.
```

## Usage Example

```tsx
'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { CalendarKanbanView } from '@/components/calendar/CalendarKanbanView'
import { useParams } from 'next/navigation'

export default function CalendarPage() {
  const params = useParams()
  const propertyId = params.id as string

  return (
    <CalendarWithSettings
      propertyId={propertyId}
      calendarComponent={CalendarKanbanView}
    />
  )
}
```

## Mobile-First Features

### Layout
- **Mobile**: Vertical stack
  - Calendar: 60% of viewport
  - Settings: Bottom sheet (swipeable)
  - Modal: Full screen dialog

- **Tablet/Desktop**: 2-column
  - Calendar: Left (60%)
  - Settings: Right (40%)
  - Modal: Centered dialog (90vw max)

### Touch Interactions
- **Day Click**: Auto-open modal
- **Period Select**: Drag or click → click
- **Large Buttons**: 48px+ height
- **No Horizontal Scroll**: Vertical layout by default

### Responsive Breakpoints
```
Mobile (< 768px):
- Full-width calendar
- Settings as bottom sheet
- Modal full-screen

Tablet (768px - 1024px):
- 2-column layout begins
- Modal 90vw max-width

Desktop (> 1024px):
- Full 2-column layout
- Modal 90vw max-width
```

## Data Flow: Day Click → Save

```
1. User clicks calendar day
   └─> handleDayClick(day, year, month)
       └─> selection.toggleDay(date)
           └─> setState selectedDates

2. Auto-open modal for single day
   └─> selection.openPriceModal(date)
       └─> setModalData, setIsModalOpen

3. Modal appears with action menu
   ├─> 💰 Definir Preço
   │   └─> openPriceModal() → PriceSettingView
   │       └─> Input price → handleSavePrice()
   │
   └─> 🔒 Bloquear Datas
       └─> openBlockDatesView → Confirmation
           └─> handleBlockDates()

4. Save to API
   └─> POST /api/properties/{id}/pricing/bulk-update
       ├─> startDate, endDate, price
       └─> Response: success

5. Clear selection
   └─> selection.clearSelection()
       └─> setState idle
           └─> Close modal
               └─> Refresh calendar
```

## Hook Usage

```tsx
const selection = useCalendarSelection(propertyId)

// State
selection.state.selectedDates  // Date[]
selection.state.mode  // 'idle' | 'single-day' | 'period'
selection.state.selectedCard  // null | card name
selection.stats  // { nights, startDate, endDate }

// Actions
selection.toggleDay(date)  // Toggle single day
selection.selectDateRange(start, end)  // Select period
selection.clearSelection()  // Reset all

// Modal helpers
selection.openPriceModal(date | range)
selection.openDiscountModal(range)
selection.openAvailabilityModal(range)
selection.openCancellationModal(range)
selection.closeModal()

// Modal state
selection.isModalOpen  // boolean
selection.modalData  // { card, dates?, date? }
```

## API Endpoints Required

```
POST /api/properties/{id}/pricing/bulk-update
  payload: { startDate, endDate, price }
  response: { success, updatedDays }

POST /api/properties/{id}/calendar/block-dates
  payload: { startDate, endDate, reason }
  response: { success, blockedDays }
```

## Component Props

### CalendarWithSettings
```tsx
interface CalendarWithSettingsProps {
  propertyId: string
  calendarComponent: React.ComponentType<{
    onDayClick: (day: number, year: number, month: number) => void
    selectedDates: string[]  // ISO date strings
  }>
}
```

### CalendarDayClickModal
```tsx
interface CalendarDayClickModalProps {
  isOpen: boolean
  dates: Date | DateRange | null
  propertyId: string
  onClose: () => void
  onSavePrice?: (price: number) => Promise<void>
  onBlockDates?: () => Promise<void>
}
```

## Testing Checklist

### Mobile (< 768px)
- [ ] Day click opens modal
- [ ] Modal displayed full-screen
- [ ] Action buttons (48px+) are touch-friendly
- [ ] Price input has numeric keyboard
- [ ] Settings sidebar accessible
- [ ] No horizontal scroll on any viewport

### Tablet/Desktop
- [ ] 2-column layout displays
- [ ] Calendar on left, settings on right
- [ ] Modal centered with max-width
- [ ] All interactions responsive
- [ ] Settings sidebar not cut off

### Data Flow
- [ ] Click day → modal opens
- [ ] Enter price → API call
- [ ] Block dates → API call
- [ ] Selection clears after save
- [ ] Calendar updates after save

### Edge Cases
- [ ] Click same day twice (toggle)
- [ ] Select period (7+ days)
- [ ] Enter zero/negative price (error)
- [ ] Block already-booked dates (warning)
- [ ] Network error handling

## Future Enhancements

1. **Period Selection**: Click → drag → release
2. **Drag-and-drop**: Move reservations
3. **Batch Operations**: Select multiple periods
4. **Undo/Redo**: Recent changes stack
5. **Keyboard Shortcuts**: Space to toggle, arrows to navigate
6. **Accessibility**: ARIA labels, focus management
