# EPIC 36: Dynamic Pricing + Calendar Redesign + Analytics — Stories Index

**Status:** 16 stories created ✅  
**Total Points:** 70  
**Timeline:** 8-9 weeks  
**Created by:** River (@sm)  
**Last Updated:** 2026-07-22  

---

## Stories by Phase

### PHASE 1: Dynamic Pricing + Desconto por Duração (31 points, 3-4 weeks)

| # | Story | Points | Status | Dependencies |
|---|-------|--------|--------|--------------|
| **36.1** | [Schema + Backend Foundation](36.1-schema-backend-foundation.md) | 8 | Draft | None |
| **36.2** | [Manager UI — 3-Tab Settings Panel](36.2-manager-ui-3tabs.md) | 5 | Draft | 36.1 |
| **36.3** | [Calendar Manager — Daily Price Grid](36.3-calendar-manager-daily-prices.md) | 5 | Draft | 36.1, 36.2 |
| **36.4** | [Discount Calculation Logic](36.4-discount-calculation-logic.md) | 8 | Draft | 36.1 |
| **36.5** | [Booking UI — Show Discount Breakdown](36.5-booking-ui-discount.md) | 5 | Draft | 36.4 |

**Phase 1 Subtotal:** 31 points

---

### PHASE 2: Calendar Redesign (30 points, 2-3 weeks, after Phase 1)

| # | Story | Points | Status | Dependencies |
|---|-------|--------|--------|--------------|
| **36.6** | [Responsive Layout Foundation](36.6-responsive-layout-foundation.md) | 5 | Draft | Phase 1 complete |
| **36.7** | [Card List (Mobile)](36.7-card-list-mobile.md) | 5 | Draft | 36.6 |
| **36.8** | [Sidebar Properties (Web)](36.8-sidebar-properties-web.md) | 3 | Draft | 36.6 |
| **36.13** | [Detailed Calendar (Both)](36.9-detailed-calendar-both.md) | 8 | Draft | 36.3, 36.6 |
| **36.14** | [Config Panel (Web)](36.10-config-panel-web.md) | 3 | Draft | 36.2, 36.6, 36.8 |
| **36.15** | [Hamburger Menu (Web)](36.11-hamburger-menu-web.md) | 3 | Draft | 36.6 |
| **36.16** | [Bottom Navigation (Mobile)](36.12-bottom-navigation-mobile.md) | 3 | Draft | 36.6 |

**Phase 2 Subtotal:** 30 points

---

### PHASE 3: Revenue Analytics & Pricing Automation (9 points, 2 weeks, after Phase 1)

| # | Story | Points | Status | Dependencies |
|---|-------|--------|--------|--------------|
| **36.9** | [Revenue Forecasting](36.9-revenue-forecasting.md) | 3 | Draft | 36.1, 36.4 |
| **36.10** | [Competitor Price Monitoring](36.10-competitor-price-monitoring.md) | 2 | Draft | 36.1, 36.9 |
| **36.11** | [Dynamic Pricing Automation](36.11-dynamic-pricing-automation.md) | 2 | Draft | 36.1, 36.4, 36.5 |
| **36.12** | [Booking System Integration](36.12-booking-system-integration.md) | 2 | Draft | 36.1, 36.4, 36.5, 36.11 |

**Phase 3 Subtotal:** 9 points

---

## Full Timeline

```
Sprint 1 (Week 1):      36.1 (Schema + Backend)
Sprint 2 (Week 2):      36.2 (Manager UI) + 36.4 (Discount Logic)
Sprint 3 (Week 3):      36.3 (Calendar Manager) + 36.5 (Booking UI)
                        36.9 (Revenue Forecasting) [parallel with Phase 1]
Sprint 4 (Week 4):      QA + Refinement (Phase 1)
                        36.10 (Competitor Monitoring)
                        36.11 (Dynamic Pricing)

Sprint 5 (Week 5):      36.6 (Responsive Foundation) + 36.7/36.8 (Mobile/Web)
                        36.12 (Booking Integration)

Sprint 6 (Week 6):      36.13 (Detailed Calendar) + 36.14/36.15/36.16 (Panels + Nav)
Sprint 7 (Week 7):      QA + Refinement (Phase 2)
Sprint 8 (Week 8):      Final QA + Integration testing

Total: 8 weeks, 70 points
```

---

## Story Status Tracking

**Ready for Assignment:** All 16 stories ✅

```
Phase 1 (Schema + Pricing):
[ ] 36.1 — Assigned to @dev
[ ] 36.2 — Assigned to @dev
[ ] 36.3 — Assigned to @dev
[ ] 36.4 — Assigned to @dev
[ ] 36.5 — Assigned to @dev

Phase 2 (Calendar UI):
[ ] 36.6 — Assigned to @dev
[ ] 36.7 — Assigned to @dev
[ ] 36.8 — Assigned to @dev
[ ] 36.13 — Assigned to @dev
[ ] 36.14 — Assigned to @dev
[ ] 36.15 — Assigned to @dev
[ ] 36.16 — Assigned to @dev

Phase 3 (Analytics & Automation):
[ ] 36.9 — Assigned to @dev
[ ] 36.10 — Assigned to @dev
[ ] 36.11 — Assigned to @dev
[ ] 36.12 — Assigned to @dev
```

---

## Key Dependencies

**Critical Path:**
```
36.1 (Schema)
  ├─ 36.2 (Manager UI)
  │   └─ 36.14 (Config Panel)
  ├─ 36.3 (Calendar Manager)
  │   └─ 36.13 (Detailed Calendar)
  ├─ 36.4 (Discount Logic)
  │   ├─ 36.5 (Booking UI)
  │   │   └─ 36.6 (Responsive Layout) ← BLOCKS Phase 2
  │   └─ 36.9 (Revenue Forecasting)
  │       ├─ 36.10 (Competitor Monitoring)
  │       └─ 36.11 (Dynamic Pricing)
  │           └─ 36.12 (Booking Integration)
  └─ 36.6 → 36.7/36.8/36.13/36.14/36.15/36.16
```

**Blocking Dependencies:**
- Phase 1 (36.1-36.5) must complete before Phase 2 (36.6-36.8, 36.13-36.16) starts
- Phase 1 (36.1-36.5) enables Phase 3 (36.9-36.12) to start in parallel with Phase 2

---

## Quality Gates by Story

| Phase | Gate | Stories |
|-------|------|---------|
| **Dev Phase** | CodeRabbit (light mode) | All 16 stories |
| **QA Phase** | CodeRabbit (full mode) + Functional tests | All 16 stories |
| **Phase 1** | Integration tests (pricing system) | 36.1-36.5 |
| **Phase 2** | End-to-end mobile/web testing (calendar) | 36.6-36.8, 36.13-36.16 |
| **Phase 3** | Analytics & integration testing | 36.9-36.12 |

---

## Handoff Checklist

- [x] All 16 stories created ✅
- [x] Acceptance criteria defined ✅
- [x] Dependencies mapped ✅
- [x] Points estimated (70 total) ✅
- [x] Quality gates specified ✅
- [ ] Assigned to @dev (next step)
- [ ] Sprint scheduled (2026-07-28 start)

---

## Quick Links

**Epic Documents:**
- PRD: [/docs/prd/DYNAMIC-PRICING-CALENDAR-REDESIGN-PRD.md](../prd/DYNAMIC-PRICING-CALENDAR-REDESIGN-PRD.md)
- Epic: [/docs/epics/EPIC-DYNAMIC-PRICING-CALENDAR-REDESIGN.md](../epics/EPIC-DYNAMIC-PRICING-CALENDAR-REDESIGN.md)

**Phase 1 Stories (Schema + Pricing):**
- [36.1 — Schema + Backend](36.1-schema-backend-foundation.md)
- [36.2 — Manager UI](36.2-manager-ui-3tabs.md)
- [36.3 — Calendar Manager](36.3-calendar-manager-daily-prices.md)
- [36.4 — Discount Logic](36.4-discount-calculation-logic.md)
- [36.5 — Booking UI](36.5-booking-ui-discount.md)

**Phase 2 Stories (Calendar UI):**
- [36.6 — Responsive Layout](36.6-responsive-layout-foundation.md)
- [36.7 — Card List](36.7-card-list-mobile.md)
- [36.8 — Sidebar](36.8-sidebar-properties-web.md)
- [36.13 — Detailed Calendar](36.9-detailed-calendar-both.md)
- [36.14 — Config Panel](36.10-config-panel-web.md)
- [36.15 — Hamburger Menu](36.11-hamburger-menu-web.md)
- [36.16 — Bottom Nav](36.12-bottom-navigation-mobile.md)

**Phase 3 Stories (Analytics & Automation) ✨ NEW:**
- [36.9 — Revenue Forecasting](36.9-revenue-forecasting.md)
- [36.10 — Competitor Price Monitoring](36.10-competitor-price-monitoring.md)
- [36.11 — Dynamic Pricing Automation](36.11-dynamic-pricing-automation.md)
- [36.12 — Booking System Integration](36.12-booking-system-integration.md)

---

## Next Actions

1. ✅ **River (@sm):** Create 16 stories (DONE)
   - Phase 1 & 2 stories: Created 2026-07-21
   - Phase 3 stories (36.9-36.12): Created 2026-07-22
2. **@po (Pax):** Validate Phase 3 stories (36.9-36.12)
3. **@dev (Dex):** Assign to @dev for sprint planning
4. **Sprint Planning:** Schedule for 2026-07-28
5. **Start:** Story 36.1 (Schema + Backend)

---

**Created by:** River (@sm)  
**Last Updated:** 2026-07-22 (Phase 3 stories added)  
**Status:** Ready for @po Validation ✅

