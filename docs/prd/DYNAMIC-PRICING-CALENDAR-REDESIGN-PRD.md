# PRD: Dynamic Pricing + Calendar Redesign (Mobile-First)

**Status:** Draft → Ready for Story Creation  
**Created:** 2026-07-21  
**Product Manager:** Morgan (PM)  
**Target Release:** 6-7 weeks  

---

## Executive Summary

Lodgra needs a **pricing management system** (inspired by Airbnb) + **calendar redesign** (mobile-first) to:
1. **Enable hosts** to set dynamic prices, configure discounts by stay duration
2. **Improve UX** for 90% mobile users — current calendar is unreadable with 8+ properties
3. **Drive revenue** through strategic discounting (weekly/monthly discounts incentivize longer stays)

**Impact:** Enables direct booking revenue optimization + cleaner host management experience.

---

## Scope Overview

### **EPIC A: Dynamic Pricing + Desconto por Duração** (3-4 weeks)
- Airbnb-style pricing rules (basic price, weekend price, discounts)
- 3-tab settings panel: Preços | Descontos | Disponibilidade
- Calendar manager with daily price overrides
- Discount calculation logic (weekly/monthly with precedence)
- Booking UI integration (show discount breakdown)

### **EPIC B: Calendar Redesign** (2-3 weeks, after Epic A)
- Mobile: Card list → Detailed calendar → Settings modal
- Web: Hamburger menu + Sidebar properties + Calendar + Config panel
- Responsive design (≤768px = mobile, >768px = web layout)
- Show reservations with guest names on calendar

**Total Timeline:** 6-7 weeks (sequential, Epic A then Epic B)

---

## User Stories & Acceptance Criteria

---

## EPIC A: Dynamic Pricing + Desconto por Duração

### **Story A1: Schema + Backend Foundation**

**Description:**  
Implement database schema and API endpoints for pricing configuration (basic price, weekend price, discounts, availability rules).

**Acceptance Criteria:**

- [ ] Create table `property_prices`:
  - property_id (FK)
  - base_price (EUR, required)
  - weekend_price (EUR, optional)
  - created_at, updated_at

- [ ] Create table `property_discounts`:
  - property_id (FK)
  - discount_type (enum: 'weekly', 'monthly', 'excellent_guest', 'last_minute', 'advance')
  - percentage (0-100)
  - min_nights (for weekly/monthly)
  - conditions (JSON, for guest ratings/timing)
  - created_at, updated_at

- [ ] Create table `property_availability`:
  - property_id (FK)
  - min_nights (default 1)
  - max_nights (default 365)
  - advance_notice_days (default 0, "same day")
  - notice_for_same_day (time, default 00:00)
  - preparation_days (default 0)
  - created_at, updated_at

- [ ] Create table `property_daily_prices`:
  - property_id (FK)
  - date (YYYY-MM-DD)
  - price (EUR, overrides base_price)
  - created_at, updated_at
  - Unique constraint (property_id, date)

- [ ] Implement API endpoints:
  - `GET /properties/:id/prices` — Fetch all pricing config
  - `POST /properties/:id/prices` — Create/update base price
  - `GET /properties/:id/discounts` — Fetch all discounts
  - `POST /properties/:id/discounts` — Create discount rule
  - `PUT /properties/:id/discounts/:discountId` — Update discount
  - `DELETE /properties/:id/discounts/:discountId` — Remove discount
  - `GET /properties/:id/availability` — Fetch availability rules
  - `PUT /properties/:id/availability` — Update availability
  - `GET /properties/:id/daily-prices` — Fetch price overrides for month
  - `POST /properties/:id/daily-prices` — Set daily price override

**Tech Notes:**
- Use Supabase schema migration
- Endpoints return consistent error codes (400, 404, 422)
- All endpoints require property ownership validation

**Definition of Done:**
- [ ] All endpoints tested with Postman/curl
- [ ] No console errors
- [ ] Migrations reversible

---

### **Story A2: Manager UI — 3-Tab Settings Panel**

**Description:**  
Build mobile-responsive settings panel with 3 tabs: Preços | Descontos | Disponibilidade (accessible via ⚙️ icon on calendar).

**Acceptance Criteria:**

**Tab 1: Preços**
- [ ] Input: "Preço básico" (EUR) — required
- [ ] Input: "Preço de fim de semana" (EUR) — optional, with "Remover" link
- [ ] Toggle: "Preço Inteligente" (disabled, future feature)
- [ ] Section: "Taxas" with → chevron (expand to submenu — future)
- [ ] Save button saves to API (A1 endpoints)
- [ ] Display success/error messages

**Tab 2: Descontos**
- [ ] Card: "Por semana"
  - Label: "Para 7 noites ou mais"
  - Input: Percentage (0-100%)
  - Display: "A média semanal é de €X.XXX" (calculated from base_price)
- [ ] Card: "Por mês"
  - Label: "Para 28 noites ou mais"
  - Input: Percentage (0-100%)
  - Display: "A média mensal é de €X.XXX"
- [ ] Cards: "Hóspedes com avaliações excelentes", "Reservas de última hora", "Reservas antecipadas" (disabled, future)
- [ ] Save button posts to API (A1 endpoints)

**Tab 3: Disponibilidade**
- [ ] Input: "Número mínimo de noites" (default 1)
- [ ] Input: "Número máximo de noites" (default 365)
- [ ] Select: "Tempo de antecedência" (0 = same day, 1-90 days)
- [ ] Time picker: "Aviso prévio para o mesmo dia" (HH:MM, default 00:00)
- [ ] Select: "Tempo de preparação" (0-30 days, default 0)
- [ ] Save button posts to API

**Tech Notes:**
- Use React component with tab switcher (ButtonGroup or similar)
- Form validation on client-side + server-side
- Average calculations: `(base_price × 7) × (1 - discount/100)` for weekly, `(base_price × 28) × (1 - discount/100)` for monthly
- Mobile: Full-screen modal or bottom sheet
- Web: Side panel (Story B5)

**Definition of Done:**
- [ ] All 3 tabs functional
- [ ] Form validation works
- [ ] API calls successful
- [ ] No TypeScript errors

---

### **Story A3: Calendar Manager — Daily Price Grid**

**Description:**  
Build calendar grid (7x4 or 7x5 for month view) with editable daily prices. Tap day → modal to override price.

**Acceptance Criteria:**

- [ ] Display month calendar
  - Header: Month name + navigation (◄ ►) to previous/next month
  - Grid: 7 columns (Sun-Sat), rows per month
  - Each cell: Day number + Price (EUR)
  - Price fetched from property_prices.base_price OR property_daily_prices (override)

- [ ] Tap any day cell → Modal/Bottom sheet with:
  - Day label (e.g., "Friday, July 21")
  - Input: "Preço para este dia" (default = base_price)
  - Button: "Salvar" or "Remover override" (if custom price exists)
  - Close button (X)

- [ ] On save:
  - If price = base_price, delete from property_daily_prices
  - If price ≠ base_price, insert/update property_daily_prices
  - Grid updates immediately (optimistic UI)

- [ ] Visual indicators:
  - Booked days: Gray background + guest name (from reservations)
  - Weekend days: Slightly different color
  - Today: Red circle/indicator

- [ ] Navigate months: Load new month data via API (A1 GET endpoint)

**Tech Notes:**
- Use date library (date-fns or dayjs)
- Grid layout: CSS Grid or flex
- Mobile responsive (full-width on mobile, narrower on web)
- Cache month data to avoid excessive API calls
- Optimistic updates for better UX

**Definition of Done:**
- [ ] Calendar renders correctly for all months
- [ ] Price editing works
- [ ] Guest names display on booked dates
- [ ] Navigation smooth

---

### **Story A4: Discount Calculation Logic (Backend)**

**Description:**  
Implement pricing calculation engine that applies discounts based on stay duration and precedence rules.

**Acceptance Criteria:**

- [ ] Create function `calculatePrice(propertyId, checkInDate, checkOutDate)`:
  - Input: property ID, dates
  - Output: { baseTotal, discountApplied, discountPercentage, finalTotal, breakdown }
  
- [ ] Logic:
  - Calculate total nights = checkOutDate - checkInDate
  - Fetch base_price (or daily overrides from property_daily_prices)
  - Fetch applicable discounts:
    - If nights >= 7: Apply weekly discount (7+ nights rule)
    - If nights >= 28: Apply monthly discount (28+ nights rule)
    - Precedence: Whichever is greater wins (OR use first applicable)
  - Apply selected discount to base_total
  - Respect daily price overrides (don't double-discount)

- [ ] Edge cases:
  - Mixed dates (some at base_price, some at weekend_price, some custom)
  - No discount applicable → return base_total
  - Discount = 0% → return base_total

- [ ] Endpoint: `POST /properties/:id/calculate-price`
  - Body: { checkInDate, checkOutDate }
  - Response: { baseTotal, discountApplied, finalTotal, breakdown: [...] }

**Tech Notes:**
- Precedence rule: "7+ nights gets weekly discount, <7 gets no discount" (per earlier clarification)
- Breakdown must itemize daily prices for transparency
- This logic is CRITICAL for booking flow — test thoroughly

**Definition of Done:**
- [ ] Function tested with multiple scenarios (7 nights, 15 nights, 28+ nights, mixed prices)
- [ ] API endpoint returns correct JSON
- [ ] Rounding to 2 decimals (EUR)
- [ ] No edge case bugs

---

### **Story A5: Booking UI Integration — Show Discount**

**Description:**  
Integrate discount calculation into booking flow. Display price breakdown (base + discount + total) before confirmation.

**Acceptance Criteria:**

- [ ] On booking page, after date selection:
  - Call `POST /properties/:id/calculate-price` with selected dates
  - Display: 
    ```
    Preço base:      €XXX.XX
    Desconto (X%):   -€XX.XX
    ─────────────────────────
    Total:           €XXX.XX
    ```
  - Show discount label: "Desconto por semana" or "Desconto por mês" (if applicable)

- [ ] Update UI in real-time as user changes dates

- [ ] Store selected discount/pricing in booking object for order creation

- [ ] Mobile: Breakdown in booking summary section
  - Web: Breakdown in side panel or modal

**Tech Notes:**
- Reuse existing booking component
- Call calculate-price endpoint on date change (debounce if needed)
- Handle loading/error states

**Definition of Done:**
- [ ] Booking flow updated
- [ ] Discount displays correctly
- [ ] Dates can be changed, price recalculates
- [ ] Order created with correct pricing

---

## EPIC B: Calendar Redesign (Mobile-First)

### **Story B1: Responsive Layout Foundation**

**Description:**  
Implement responsive layout structure that adapts to mobile (≤768px) vs web (>768px) viewports. Mobile = card list flow, Web = 3-column layout.

**Acceptance Criteria:**

**Mobile Layout (≤768px):**
- [ ] Header: "Calendários" + Search icon
- [ ] Main view: Card list (vertical scroll)
- [ ] Each card: Photo + Property name + Location + Mini calendar dots
- [ ] Tap card → Navigate to detailed calendar (full-screen)
- [ ] Bottom nav: Hoje | Calendário | Anúncios | Mensagens | Menu

**Web Layout (>768px):**
- [ ] Header: Hamburger menu (≡) | "Calendários" | Search
- [ ] 3-column layout:
  - Left (sidebar): Property list (with checkboxes, select active)
  - Center: Detailed calendar (grid with prices)
  - Right: Config panel (3 tabs from Story A2)
- [ ] Menu hamburger: Overlay when tapped
- [ ] Responsive widths: Sidebar ~25%, Calendar ~50%, Config ~25%

**Tech Notes:**
- Use CSS media queries or Tailwind breakpoints
- Layout shifts smoothly at 768px breakpoint
- No horizontal scroll on mobile
- All components work in both layouts

**Definition of Done:**
- [ ] Layout renders correctly on mobile and web
- [ ] No layout shift/flicker
- [ ] Navigation works in both layouts
- [ ] Responsive images (photos scale properly)

---

### **Story B2: Card List Component (Mobile)**

**Description:**  
Build mobile card list showing all properties with mini calendar visual (occupied/available days).

**Acceptance Criteria:**

- [ ] Card structure:
  - Photo: Rounded corners, aspect ratio 4:3
  - Title: Property name (truncated if long)
  - Subtitle: Location (city/area)
  - Mini calendar: 4 rows × 7 columns of small dots
    - Dot = day of month
    - ● (black/filled) = occupied
    - • (light/empty) = available
    - Red dot = today

- [ ] On tap card:
  - Navigate to detailed calendar (Story B4)
  - Pass property ID as route param

- [ ] Vertical scroll: Load all properties
  - If 8+ properties, smooth scrolling
  - No pagination (load all at once for simplicity)

- [ ] Pull-to-refresh: Reload property list

**Tech Notes:**
- Fetch properties + reservations for mini calendar data
- Mini calendar shows current month only (simplified)
- Use skeleton loaders while fetching
- Cache property photos

**Definition of Done:**
- [ ] All properties display as cards
- [ ] Photos load quickly
- [ ] Mini calendar dots accurate
- [ ] Tap navigation works
- [ ] Pull-to-refresh works

---

### **Story B3: Sidebar Properties (Web)**

**Description:**  
Build left sidebar (web-only) showing property list with selection state.

**Acceptance Criteria:**

- [ ] Sidebar structure:
  - Fixed width: ~25% of viewport
  - Scrollable vertically (if 8+ properties)
  - Each property:
    - Thumbnail (small square, ~60x60px)
    - Property name
    - Checkbox or radio (single select)

- [ ] On click property:
  - Set as "active" (highlight/border)
  - Center calendar updates to show this property's data
  - Right panel config updates to show this property's settings

- [ ] Styling:
  - Active state: Dark background or border highlight
  - Hover state: Light background
  - Responsive: Hide on mobile (≤768px)

**Tech Notes:**
- State: Use Context or Redux to track activePropertyId
- Props fetched in parent, passed down
- Efficient re-renders (memoize if needed)

**Definition of Done:**
- [ ] All properties listed
- [ ] Selection works
- [ ] Calendar updates on selection
- [ ] Config panel updates on selection

---

### **Story B4: Detailed Calendar (Mobile + Web)**

**Description:**  
Build main calendar view (reuse grid from Story A3) showing daily prices and reservations.

**Acceptance Criteria:**

**Mobile View:**
- [ ] Full-screen calendar
- [ ] Header: [← Back] | Property name | [📅] [⚙️]
- [ ] Calendar grid (7x4 or 7x5 per month):
  - Day number + Price
  - Navigation: ◄ Previous month | Month/Year | Next month ►
  - Tap day → Edit price modal (Story A3)

**Web View:**
- [ ] Centered calendar (Story B3 sidebar left, Story B5 config right)
- [ ] Header: Property name | [📅] [⚙️]
- [ ] Same grid + navigation as mobile

**Both:**
- [ ] Reservations overlay on calendar:
  - Show guest name across booked days
  - Example: "João (5-9)" spans across July 5-9
  - Multiple reservations: Stack or show count (+3 more)

- [ ] Visual indicators:
  - Booked days: Gray/dark background
  - Weekend days: Subtle color difference
  - Today: Red circle
  - Custom price days: Bold or underline

- [ ] Tap ⚙️ → Open config panel / modal

- [ ] Tap 📅 → Month/Year picker (optional, for faster navigation)

**Tech Notes:**
- Reuse A3 grid component
- Fetch reservations from booking API
- Parse dates to determine occupancy
- Cache month data intelligently

**Definition of Done:**
- [ ] Calendar displays correctly
- [ ] Reservations show with guest names
- [ ] Navigation between months works
- [ ] Mobile/web layouts both work
- [ ] Tap ⚙️ opens config

---

### **Story B5: Config Panel (Web)**

**Description:**  
Build right sidebar (web-only) displaying 3-tab config panel (reuse from Story A2).

**Acceptance Criteria:**

- [ ] Right panel:
  - Fixed width: ~25% of viewport
  - Scrollable vertically if content is long
  - 3 tabs: Preços | Descontos | Disponibilidade
  - Tab switching works (same logic as Story A2)

- [ ] Styling:
  - Light background (subtle gray or white)
  - Tab buttons: Bottom border indicator
  - Responsive: Hide on mobile (≤768px), show as modal on tap ⚙️ (mobile)

- [ ] Data binding:
  - Fetch config for activePropertyId (from Story B3)
  - Pre-populate inputs
  - Save updates to API (Story A1 endpoints)

**Tech Notes:**
- Reuse exact tab component from Story A2
- State shared with Story A2 (same form, different layout)
- On mobile: Modal/bottom sheet instead of side panel

**Definition of Done:**
- [ ] 3 tabs display correctly
- [ ] Tab switching works
- [ ] Form data loads correctly
- [ ] Save updates work
- [ ] Mobile/web layouts work

---

### **Story B6: Menu Hamburger (Web)**

**Description:**  
Build hamburger menu (web-only) that appears as overlay when ≡ button tapped.

**Acceptance Criteria:**

- [ ] Hamburger button:
  - Visible only on web (>768px)
  - Top-left corner, fixed position
  - Icon: ≡ (three horizontal lines)

- [ ] On tap ≡:
  - Overlay appears (semi-transparent dark background)
  - Menu slides in from left or fades in
  - Menu items:
    - Home
    - Calendários (current page, highlight)
    - Anúncios
    - Mensagens
    - Configurações
    - Sair (logout)

- [ ] Close menu:
  - Tap close button (X) in menu
  - Tap outside menu (overlay)
  - Tap menu item to navigate

- [ ] Navigation:
  - Tap item → Navigate to page
  - Menu closes automatically

**Tech Notes:**
- Use React state for menu open/close
- Overlay: `position: fixed, z-index: high`
- Smooth fade/slide animation
- Lock body scroll when menu open (prevent background scroll)

**Definition of Done:**
- [ ] Hamburger button visible on web
- [ ] Menu overlay appears/disappears
- [ ] Navigation works
- [ ] Close actions work
- [ ] No scrolling behind overlay

---

### **Story B7: Bottom Navigation (Mobile)**

**Description:**  
Build mobile bottom navigation bar with 5 tabs.

**Acceptance Criteria:**

- [ ] Bottom fixed bar with 5 tabs:
  - Hoje (Home icon)
  - Calendário (Calendar icon, currently active/red)
  - Anúncios (Announcement icon)
  - Mensagens (Message icon)
  - Menu (Hamburger icon)

- [ ] Active state:
  - Tab icon highlighted (red/bold)
  - Tab label visible

- [ ] On tap tab:
  - Navigate to corresponding page
  - Update active state

- [ ] Mobile only (≤768px)
  - Hidden on web

**Tech Notes:**
- Fixed position at bottom
- Safe area padding (for notch devices)
- Icons from existing icon set (Feather, Heroicons, etc.)
- Touch target: ≥44px height

**Definition of Done:**
- [ ] All 5 tabs display correctly
- [ ] Navigation works
- [ ] Active state updates
- [ ] Mobile only
- [ ] Touch targets adequate

---

## User Flows

### Flow 1: Host Sets Discount (Week Discount)

```
Host opens app
  ↓
Tap "Calendários"
  ↓
[Mobile] Card list appears
[Web] Calendar + config panel appear
  ↓
[Mobile] Tap a property card
  ↓
Detailed calendar appears
  ↓
Tap ⚙️ (settings icon)
  ↓
[Mobile] Settings modal opens → Tab "Descontos"
[Web] Right panel already visible → Click "Descontos" tab
  ↓
Input "Por semana": 21%
  ↓
Tap "Salvar"
  ↓
API call: POST /properties/:id/discounts
  ↓
Success message
  ↓
Config saved
```

### Flow 2: Guest Books, Sees Discount

```
Guest visits booking page (direct link)
  ↓
Select dates: July 5 - 12 (8 nights = 1 week + 1 day)
  ↓
Backend calculates: 7 nights triggers weekly discount (21%)
  ↓
Display:
  Preço base:      €1.192 (€149 × 8 days)
  Desconto (21%):  -€251
  ────────────────────────
  Total:           €941
  
  Label: "Desconto por semana"
  ↓
Guest confirms booking
  ↓
Order created with discounted price
```

### Flow 3: Host Customizes Daily Price

```
Host in calendar view
  ↓
Tap a specific day (e.g., July 21)
  ↓
Modal appears:
  "Preço para este dia"
  Input: €199 (override default €149)
  ↓
Tap "Salvar"
  ↓
API call: POST /properties/:id/daily-prices
  ↓
Calendar grid updates
  ↓
July 21 now shows €199 instead of €149
```

---

## Technical Architecture

### Database Schema

```sql
-- property_prices
CREATE TABLE property_prices (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  base_price DECIMAL(10,2) NOT NULL,
  weekend_price DECIMAL(10,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(property_id)
);

-- property_discounts
CREATE TABLE property_discounts (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  discount_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', etc.
  percentage INT CHECK (percentage >= 0 AND percentage <= 100),
  min_nights INT DEFAULT 1,
  conditions JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- property_availability
CREATE TABLE property_availability (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  min_nights INT DEFAULT 1,
  max_nights INT DEFAULT 365,
  advance_notice_days INT DEFAULT 0,
  notice_for_same_day TIME DEFAULT '00:00',
  preparation_days INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(property_id)
);

-- property_daily_prices
CREATE TABLE property_daily_prices (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id),
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(property_id, date)
);
```

### API Endpoints

**Prices:**
- `GET /api/properties/:id/prices`
- `POST /api/properties/:id/prices`
- `PUT /api/properties/:id/prices`

**Discounts:**
- `GET /api/properties/:id/discounts`
- `POST /api/properties/:id/discounts`
- `PUT /api/properties/:id/discounts/:discountId`
- `DELETE /api/properties/:id/discounts/:discountId`

**Availability:**
- `GET /api/properties/:id/availability`
- `PUT /api/properties/:id/availability`

**Daily Prices:**
- `GET /api/properties/:id/daily-prices?month=2026-07`
- `POST /api/properties/:id/daily-prices`
- `DELETE /api/properties/:id/daily-prices/:date`

**Calculation:**
- `POST /api/properties/:id/calculate-price` → { checkInDate, checkOutDate } → { baseTotal, discountApplied, finalTotal, breakdown }

---

## Success Metrics

### Epic A (Pricing)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Average stay length | +15% | Weekly discount incentivizes 7+ night stays |
| Revenue per booking | +5-10% | Optimized pricing captures more value |
| Config setup time | <5 min per property | Easy discounts → more hosts use feature |
| API latency | <200ms | Price calc must be instant in booking flow |

### Epic B (Calendar Redesign)

| Metric | Target | Rationale |
|--------|--------|-----------|
| Mobile usability score | +20% | Cleaner UI = better experience |
| Calendar page load (mobile) | <2s | Current calendar is slow with 8+ properties |
| Host session duration | +10% | Better UX = longer engagement |
| Support tickets (calendar) | -30% | Clearer layout = fewer confusion tickets |

---

## Timeline

### Phase 1: Epic A (Week 1-4)
- **Week 1:** A1 (Schema + Backend)
- **Week 2:** A2 (Manager UI) + A4 (Discount logic)
- **Week 3:** A3 (Calendar manager) + A5 (Booking integration)
- **Week 4:** Testing, refinement, deployment

### Phase 2: Epic B (Week 5-7)
- **Week 5:** B1 (Responsive foundation) + B2/B3 (Card list + Sidebar)
- **Week 6:** B4 (Detailed calendar) + B5/B6 (Config panel + Menu)
- **Week 7:** B7 (Bottom nav) + Testing, refinement, deployment

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Complex discount precedence logic | High | Thorough unit tests + edge case validation |
| Performance with 8+ properties on mobile | High | Optimize queries, implement lazy loading |
| Booking flow integration delays | High | Coordinate early with booking team, use feature flags |
| Mobile responsive issues | Medium | Early QA on real devices (iOS + Android) |
| User adoption of discount feature | Medium | In-app onboarding + host education |

---

## Open Questions / Decisions

1. **Discount precedence:** Confirmed = weekly discount wins if <28 nights, monthly if ≥28 nights ✅
2. **Weekend price:** Optional field (future flexibility) ✅
3. **Mobile-first priority:** 90% mobile = justify any web polish trade-offs ✅
4. **Reservation visibility:** Show guest names on calendar ✅
5. **Future discounts:** "Excellent guest", "Last minute", "Advance" marked as future (disabled, Story A2) ✅

---

## Notes for @sm (Story Creator)

1. **Sequencing:** Epic A → Epic B (Epic A needed for B's integration)
2. **Story granularity:** Each story A1-A5 + B1-B7 is independently testable
3. **Quality gates:** All stories require CodeRabbit review + unit tests before merge
4. **Mobile-first testing:** Allocate extra time for responsive testing (mobile + tablet + desktop)
5. **Coordination:** Story A5 depends on existing booking flow — coordinate early

---

## Appendix: Wireframes (Text-based)

*(See attached screenshots in Messages for full Airbnb-style mobile/web mockups)*

### Mobile - Card List
```
┌─────────────────────────────┐
│ Calendários            🔍   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │[Photo] Prop 1           │ │
│ │ Studio Amalia           │ │
│ │ ●•••••• •••••• ••••●•   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │[Photo] Prop 2           │ │
│ │ Casa do Moinho          │ │
│ │ ••●●●• •••••• •••••●●   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Web - 3-Column Layout
```
┌─────────────────────────────────────┐
│ ≡  Calendários [🔍]                 │
├──────────┬──────────────────┬────────┤
│ Props    │ Calendar         │ Config │
│ ☐ Prop1  │ Julho ◄ ►        │Preços  │
│ ☐ Prop2  │ [Grid 7x4]       │Descontos
│ ☐ Prop3  │ João (5-9)       │Disponib
└──────────┴──────────────────┴────────┘
```

---

**Status:** Ready for @sm story creation  
**Approvals Pending:** @po (Story validation)  
**Target Sprint Start:** 2026-07-28

