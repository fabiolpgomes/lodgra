# EPIC: Dynamic Pricing + Calendar Redesign (Airbnb-Style)

**Epic ID:** 36 (Pricing & UX)  
**Status:** Draft → Ready for @po Validation  
**Created:** 2026-07-21  
**Product Manager:** Morgan (@pm)  
**Target Start:** 2026-07-28  

---

## Executive Summary

Enable **Lodgra hosts** to optimize pricing through strategic discounts (weekly/monthly) and redesign the calendar for **mobile-first** UX (90% of users). Inspired by Airbnb's pricing & calendar patterns.

**Expected Impact:**
- +15% avg stay length (via weekly discount incentive)
- +5-10% revenue per booking (optimized pricing)
- -30% support tickets (clearer calendar UX)
- +20% mobile usability score

---

## Epic Scope

### **Sub-Epic A: Dynamic Pricing** (3-4 weeks)
Hosts can set base price, weekend price, weekly/monthly discounts, and daily price overrides. Discount calculation automatically applied in booking flow.

**Deliverables:**
- Database schema (prices, discounts, availability, daily overrides)
- 5 API endpoints for CRUD operations
- Settings UI (3 tabs: Preços | Descontos | Disponibilidade)
- Discount calculation engine
- Booking flow integration (show discount breakdown)

**Stories:** A1, A2, A3, A4, A5 (see PRD for details)

---

### **Sub-Epic B: Calendar Redesign** (2-3 weeks, after Epic A)
Redesign calendar for mobile-first (card list flow) + responsive web layout (sidebar + calendar + config).

**Deliverables:**
- Mobile: Card list, detailed calendar, settings modal
- Web: Hamburger menu, sidebar properties, centered calendar, config panel
- Responsive layout (≤768px mobile, >768px web)
- Reservation display (guest names)

**Stories:** B1, B2, B3, B4, B5, B6, B7 (see PRD for details)

---

## Story Breakdown (11 Stories)

### **Epic A: Dynamic Pricing**

| # | Story | Points | Dependencies |
|---|-------|--------|--------------|
| A1 | Schema + Backend Foundation | 8 | None |
| A2 | Manager UI (3 tabs) | 5 | A1 |
| A3 | Calendar Manager (daily prices) | 5 | A1, A2 |
| A4 | Discount Calculation Logic | 8 | A1 |
| A5 | Booking UI Integration | 5 | A1, A4 |

**Sub-Epic A Total:** 31 points, 3-4 weeks

---

### **Epic B: Calendar Redesign**

| # | Story | Points | Dependencies |
|---|-------|--------|--------------|
| B1 | Responsive Layout Foundation | 5 | A5 (Epic A complete) |
| B2 | Card List (Mobile) | 5 | B1 |
| B3 | Sidebar Properties (Web) | 3 | B1 |
| B4 | Detailed Calendar (Both) | 8 | B1, B2, B3 |
| B5 | Config Panel (Web) | 3 | B1, A2 |
| B6 | Hamburger Menu (Web) | 3 | B1 |
| B7 | Bottom Navigation (Mobile) | 3 | B1 |

**Sub-Epic B Total:** 30 points, 2-3 weeks

---

## Full Epic Timeline

```
Week 1-4: Epic A (Dynamic Pricing)
├─ Week 1: A1 (Schema + Backend)
├─ Week 2: A2 (Manager UI) + A4 (Discount Logic)
├─ Week 3: A3 (Calendar Manager) + A5 (Booking Integration)
└─ Week 4: QA + Refinement

↓ (A complete)

Week 5-7: Epic B (Calendar Redesign)
├─ Week 5: B1 (Responsive Foundation) + B2/B3 (Mobile/Web)
├─ Week 6: B4 (Detailed Calendar) + B5/B6/B7 (Panels + Nav)
└─ Week 7: QA + Refinement

Total: 6-7 weeks, 61 story points
```

---

## User Flows (3 Primary)

### Flow 1: Host Sets Weekly Discount
```
Open Calendários
  → Tap Property (mobile) / Select in sidebar (web)
  → Tap ⚙️ (settings)
  → Tab: Descontos
  → Input: "Por semana" = 21%
  → Save
  → API: POST /properties/:id/discounts
  → Success
```

### Flow 2: Guest Books with Discount
```
Guest selects July 5-12 (8 nights)
  → Backend calculates: 7+ nights = weekly discount applies
  → Display:
    Base: €1,192
    Discount (21%): -€251
    ─────────────
    Total: €941
  → Confirm booking
  → Order created with discounted price
```

### Flow 3: Host Customizes Daily Price
```
Calendar view
  → Tap day (July 21)
  → Modal: "Preço para este dia"
  → Input: €199 (override €149)
  → Save
  → API: POST /properties/:id/daily-prices
  → Calendar updates (July 21 now shows €199)
```

---

## Acceptance Criteria (Epic-Level)

- [ ] All 11 stories created and assigned
- [ ] Each story has detailed AC (see PRD)
- [ ] API endpoints documented & tested
- [ ] Mobile & web layouts responsive (≤768px breakpoint)
- [ ] Discount calculation tested (7-night, 15-night, 28+ night scenarios)
- [ ] Booking flow shows discount breakdown
- [ ] Calendar displays reservations with guest names
- [ ] CodeRabbit review passed (all stories)
- [ ] Unit tests pass (80%+ coverage)
- [ ] Deployed to staging env
- [ ] @po sign-off

---

## Technical Specifications

### Database Schema
```
property_prices
├─ base_price (EUR)
├─ weekend_price (optional)

property_discounts
├─ discount_type (weekly, monthly, etc.)
├─ percentage (0-100)
├─ min_nights
├─ conditions (JSON)

property_availability
├─ min_nights
├─ max_nights
├─ advance_notice_days
├─ preparation_days

property_daily_prices
├─ date (YYYY-MM-DD)
├─ price (override)
└─ UNIQUE(property_id, date)
```

### Key Endpoints
- `GET /properties/:id/prices`
- `POST /properties/:id/prices`
- `GET/POST /properties/:id/discounts`
- `POST /properties/:id/calculate-price` → { checkInDate, checkOutDate }
- `GET/POST /properties/:id/daily-prices`

### Frontend Components
- `<SettingsTabs>` (Preços | Descontos | Disponibilidade)
- `<CalendarGrid>` (7x4 grid with prices)
- `<CardList>` (Property cards with mini calendar)
- `<ConfigPanel>` (Web-only sidebar)
- `<HamburgerMenu>` (Web-only overlay)
- `<BottomNav>` (Mobile-only)

---

## Dependencies & Risks

### Internal Dependencies
- **A1 → A2, A3, A4, A5:** All pricing stories depend on schema
- **A5 → B1:** Calendar redesign waits for booking integration complete
- **Booking flow team:** Must coordinate on A5 integration point

### External Dependencies
- None identified

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Complex discount logic | High | Unit tests + edge case validation in A4 |
| Mobile responsive issues | High | Early QA on real devices (iOS 14+, Android 11+) |
| Performance with 8+ properties | Medium | Query optimization + lazy loading in B |
| Booking flow integration delays | High | Feature flags, coordinate early with team |
| User adoption (discount feature) | Medium | In-app onboarding + host education emails |

---

## Quality Gates

### Before Story Merge
- [ ] Unit tests pass (≥80% coverage)
- [ ] CodeRabbit review approved
- [ ] No TypeScript errors
- [ ] PR checked against security checklist

### Before Epic Launch
- [ ] All 11 stories merged to main
- [ ] Staging env deployed + smoke tested
- [ ] E2E tests pass (mobile + web)
- [ ] @po sign-off
- [ ] @qa QA gate passed (7-point checklist)

---

## Success Metrics

### Epic A (Pricing)
| Metric | Target | Why |
|--------|--------|-----|
| Avg stay length increase | +15% | Weekly discount incentivizes 7+ stays |
| Revenue per booking | +5-10% | Optimized pricing captures value |
| Config setup time | <5 min | Easy UI → more hosts enable discounts |
| API latency | <200ms | Must be instant in booking |

### Epic B (Calendar)
| Metric | Target | Why |
|--------|--------|-----|
| Mobile usability score | +20% | Cleaner card list + grid |
| Calendar page load (mobile) | <2s | Current is slow with 8+ properties |
| Host engagement (session time) | +10% | Better UX = longer sessions |
| Support tickets (calendar) | -30% | Clearer layout = fewer questions |

---

## Stakeholders

| Role | Name | Involvement |
|------|------|-------------|
| **PM** | Morgan (@pm) | Created PRD, defined scope |
| **Product Owner** | Pax (@po) | Validates 10-point checklist |
| **Scrum Master** | River (@sm) | Creates 11 stories, manages sprint |
| **Dev Lead** | Dex (@dev) | Implements A1-A5, coordinates B |
| **QA** | Quinn (@qa) | QA gate (7-point checklist) |
| **DevOps** | Gage (@devops) | Handles staging deploy + production push |

---

## Pre-Launch Checklist

- [ ] PRD reviewed by @po ✅
- [ ] 11 stories created in backlog
- [ ] Story points estimated (61 total)
- [ ] Sprint scheduled (start date: 2026-07-28)
- [ ] Team capacity confirmed
- [ ] Design assets finalized (Airbnb reference images)
- [ ] API contracts documented
- [ ] Staging env ready
- [ ] Feature flags configured (if needed)

---

## Post-Launch Plan (Future)

**Phase 3 (Months 2-3):**
- Hóspedes com avaliações excelentes discount
- Reservas de última hora discount
- Reservas antecipadas discount
- Preço Inteligente (AI pricing suggestions)
- Taxas customizáveis (limpeza, animais, extras)

---

## Appendix: Airbnb Reference

This epic follows Airbnb's proven patterns:
- **Settings:** 3-tab configuration (Preços | Descontos | Disponibilidade)
- **Calendar:** Daily price grid with guest names
- **Discounts:** Weekly (7+) & Monthly (28+) tiers
- **Booking:** Show discount breakdown pre-purchase

---

## Sign-Off

- **Created by:** Morgan (@pm) — 2026-07-21
- **Approval pending:** Pax (@po) — validation
- **Ready for sprint:** Yes, after @po sign-off

---

**Next Action:** Pass to @po for 10-point validation checklist.

