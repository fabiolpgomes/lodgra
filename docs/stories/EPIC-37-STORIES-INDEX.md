# EPIC 37: Calendar Pricing & Availability — Stories Index

**Status:** Core Delivery Complete / Optional Follow-Up Remains
**Model:** Airbnb Host Dashboard (Exactly Replicated)  
**Timeline:** 2–3 weeks  
**Total Size:** 38h  
**Developer:** @dev (Dex)

---

## 📚 Stories List

| # | Story | Size | Priority | Status | File |
|---|-------|------|----------|--------|------|
| **37.1** | Card Preços (Funcional) | 8h | P1 | Ready for Production | [37.1-card-precos-funcional.md](./37.1-card-precos-funcional.md) |
| **37.2** | Card Descontos (Funcional) | 6h | P1 | Done | [37.2-card-descontos-funcional.md](./37.2-card-descontos-funcional.md) |
| **37.3** | Card Disponibilidade (Funcional) | 6h | P1 | Done | [37.3-card-disponibilidade-funcional.md](./37.3-card-disponibilidade-funcional.md) |
| **37.4** | Card Cancelamento + Stripe | 12h | P1 | Ready for Production | [37.4-card-cancelamento-stripe.md](./37.4-card-cancelamento-stripe.md) |
| **37.5** | Loyalty Discount (Auto) | 6h | P2 | Ready for Dev (Optional) | [37.5-loyalty-discount-automatico.md](./37.5-loyalty-discount-automatico.md) |

---

## 🎯 Development Sequence

**Recommended order (dependencies):**

```
37.1 (Preços)
    ↓
37.2 (Descontos) — depends on 37.1 pricing base
    ↓
37.3 (Disponibilidade) — independent but complements
    ↓
37.4 (Cancelamento + Stripe) — depends on all above
    ↓
37.5 (Loyalty) — optional, depends on 37.2
```

**Parallel tracks possible:**
- 37.1 & 37.3 can be done in parallel
- 37.2 & 37.3 can be done in parallel
- 37.5 can start once 37.2 is done

---

## 📊 Epic Overview

### What Gets Built

✅ **Configuration Panel (Settings Sidebar)**
- 4 interactive cards (Preços, Descontos, Disponibilidade, Cancelamentos)
- Edit modals for each setting
- Save/load from database (not hardcoded)
- Mobile tabs + Desktop cards

✅ **Pricing Engine**
- Base price + weekend multiplier
- Duration discounts (weekly 7+, monthly 28+)
- Loyalty discounts (repeat customers)
- Daily price overrides
- Calculation cascade

✅ **Availability Rules**
- Min/max nights enforcement
- Advance notice validation
- Booking period limits
- Preparation time between guests
- Approval mode for last-minute bookings

✅ **Cancellation Policies (Airbnb Model)**
- 4 policy types for short-stay (<28 nights): Flexível, Moderada, Limitada, Firme
- 5 policy types for long-stay (28+ nights): Flexível, Moderada, Limitada, Firme, Rígida
- Non-refundable option with discount (-10%)
- Automatic refund calculation on cancellation
- Stripe refund processing (no manual entry)

✅ **Loyalty Program**
- Automatic identification of repeat customers
- Rating-based eligibility (4.8+ required, 3+ reviews)
- Additional discount on top of duration discounts
- Prominent display during booking
- Notification in confirmation email

---

## 🔧 Technical Highlights

### Database Changes
```
NEW TABLE: property_cancellation_policies
MODIFIED: reservations (add cancellation_policy_id, snapshot, refund_amount, stripe_refund_id)
EXISTING TABLES ENHANCED: property_prices, property_discounts, property_availability, daily_prices
```

### API Endpoints (All CRUD)
```
GET/PUT  /api/properties/[id]/pricing
GET/PUT  /api/properties/[id]/discounts
GET/PUT  /api/properties/[id]/availability
GET/POST/PUT/DELETE  /api/properties/[id]/cancellation-policies  [NEW]
GET  /api/guests/[id]/loyalty-status  [NEW]
POST  /api/reservations/[id]/cancel  [ENHANCED]
```

### Core Libraries (Calculation Engines)
```
pricing-calculator.ts        — apply discounts, fees
refund-calculator.ts         — determine refund % by policy
availability-validator.ts    — check booking eligibility
loyalty-calculator.ts        — identify + calculate loyalty discount
```

### Frontend Components
```
PriceCard.tsx                — connects to API, edit modal
DiscountCard.tsx             — connects to API, edit modal
AvailabilityCard.tsx         — connects to API, edit modal
CancellationCard.tsx         — connects to API, edit modal
SettingsSidebar.tsx          — orchestrates all 4 cards + tabs
```

---

## 🧪 Testing Coverage

- **Unit:** Calculators (pricing, refund, loyalty, availability) — 40+ tests
- **Integration:** API endpoints, database save/load — 20+ tests
- **E2E:** Full booking flow (search → reserve → cancel) — 5+ scenarios

**Target:** 100% coverage on calculation logic, 80%+ overall

---

## 📈 Acceptance Gates

**Before marking story DONE:**
1. All AC met (checklist in each story)
2. Tests passing (unit + integration + e2e)
3. CodeRabbit review (CRITICAL issues fixed)
4. Manual testing (dev demos feature in browser)
5. File List updated (all new/modified files documented)

**Before marking EPIC DONE:**
1. Core stories 37.1–37.4 must be delivered and revalidated
2. @qa conducts full QA pass on the cancellation and pricing paths
3. Design validation (UI matches Airbnb screenshots)
4. Stripe testing (sandbox → staging → production flow)
5. Documentation updated (user guide + dev docs)

---

## 🎓 Key Resources

### References
- [Airbnb Cancellation Policies](https://www.airbnb.com/help/article/379/)
- [Airbnb Pricing Guide](https://www.airbnb.com/help/article/1716/)
- [Stripe Refunds API](https://stripe.com/docs/api/refunds)

### Code Precedents
- `src/lib/pricing/pricing-calculator.ts` (existing pricing logic)
- `src/app/api/billing/refunds/route.ts` (Stripe integration pattern)
- `src/components/calendar/PriceCard.tsx` (component pattern)

### Diagnostic
- [Full Diagnostic Report](./diagnostic_calendar_pricing_2026_07_28.md)

---

## 📞 Team

- **Epic Owner:** @aios-master (Orion)
- **Dev Lead:** @dev (Dex)
- **QA Lead:** @qa (Quinn)
- **PM Liaison:** @pm (Morgan)

---

## 🚀 Next Steps

1. **@dev:** Review all 5 stories + EPIC-37.md
2. **@dev:** Create implementation plan (task breakdown)
3. **@dev:** Start with Story 37.1 (Preços)
4. **@qa:** Prepare QA checklist for Epic 37
5. **@pm:** Brief stakeholders on timeline

---

## 📋 Checklist for Launch

- [ ] All stories reviewed by @dev
- [ ] Database migrations prepared (not yet applied)
- [ ] TypeScript types drafted
- [ ] API endpoints stubbed
- [ ] Frontend components confirmed
- [ ] Test suite scaffolded
- [ ] Stripe sandbox configured
- [ ] Design approved (vs Airbnb reference)

---

*Created: 2026-07-28*  
*Model: Airbnb Host Dashboard*  
*Status: CORE DELIVERY COMPLETE, OPTIONAL FOLLOW-UP REMAINS*
