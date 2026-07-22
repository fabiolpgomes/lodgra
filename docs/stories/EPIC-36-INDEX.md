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

Sprint 5 (Week 5):      36.6 (Responsive Foundation) + 36.7/36.8 (Mobile/Web)
Sprint 6 (Week 6):      36.9 (Calendar) + 36.10/36.11/36.12 (Panels + Nav)
Sprint 7 (Week 7):      QA + Refinement (Epic B)

Total: 7 weeks, 61 points
```

---

## Story Status Tracking

**Ready for Assignment:** All 12 stories ✅

```
[ ] 36.1 — Assigned to @dev
[ ] 36.2 — Assigned to @dev
[ ] 36.3 — Assigned to @dev
[ ] 36.4 — Assigned to @dev
[ ] 36.5 — Assigned to @dev
[ ] 36.6 — Assigned to @dev
[ ] 36.7 — Assigned to @dev
[ ] 36.8 — Assigned to @dev
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
  │   └─ 36.10 (Config Panel)
  ├─ 36.3 (Calendar Manager)
  │   └─ 36.9 (Detailed Calendar)
  ├─ 36.4 (Discount Logic)
  │   └─ 36.5 (Booking UI)
  │       └─ 36.6 (Responsive Layout) ← BLOCKS Epic B
  └─ 36.6 → 36.7/36.8/36.9/36.11/36.12
```

**Blocking Dependency:** Epic A (36.1-36.5) must complete before Epic B (36.6-36.12) can start.

---

## Quality Gates by Story

| Phase | Gate | Stories |
|-------|------|---------|
| **Dev Phase** | CodeRabbit (light mode) | All 12 stories |
| **QA Phase** | CodeRabbit (full mode) + Functional tests | All 12 stories |
| **Epic A** | Integration tests with Story A5 | 36.1-36.5 |
| **Epic B** | End-to-end mobile/web testing | 36.6-36.12 |

---

## Handoff Checklist

- [x] All 12 stories created ✅
- [x] Acceptance criteria defined ✅
- [x] Dependencies mapped ✅
- [x] Points estimated (61 total) ✅
- [x] Quality gates specified ✅
- [ ] Assigned to @dev (next step)
- [ ] Sprint scheduled (2026-07-28 start)

---

## Quick Links

**Epic Documents:**
- PRD: [/docs/prd/DYNAMIC-PRICING-CALENDAR-REDESIGN-PRD.md](../prd/DYNAMIC-PRICING-CALENDAR-REDESIGN-PRD.md)
- Epic: [/docs/epics/EPIC-DYNAMIC-PRICING-CALENDAR-REDESIGN.md](../epics/EPIC-DYNAMIC-PRICING-CALENDAR-REDESIGN.md)

**Story Files (A1-A5):**
- [36.1 — Schema + Backend](36.1-schema-backend-foundation.md)
- [36.2 — Manager UI](36.2-manager-ui-3tabs.md)
- [36.3 — Calendar Manager](36.3-calendar-manager-daily-prices.md)
- [36.4 — Discount Logic](36.4-discount-calculation-logic.md)
- [36.5 — Booking UI](36.5-booking-ui-discount.md)

**Story Files (B1-B7):**
- [36.6 — Responsive Layout](36.6-responsive-layout-foundation.md)
- [36.7 — Card List](36.7-card-list-mobile.md)
- [36.8 — Sidebar](36.8-sidebar-properties-web.md)
- [36.9 — Detailed Calendar](36.9-detailed-calendar-both.md)
- [36.10 — Config Panel](36.10-config-panel-web.md)
- [36.11 — Hamburger Menu](36.11-hamburger-menu-web.md)
- [36.12 — Bottom Nav](36.12-bottom-navigation-mobile.md)

---

## Next Actions

1. ✅ **River (@sm):** Create 11 stories (DONE)
2. **@dev (Dex):** Assign to @dev for sprint planning
3. **Sprint Planning:** Schedule for 2026-07-28
4. **Start:** Story 36.1 (Schema + Backend)

---

**Created by:** River (@sm)  
**Validated by:** @po (Pax)  
**Ready for Development:** Yes ✅

