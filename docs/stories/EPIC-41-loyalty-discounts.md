# EPIC 41: Loyalty & Discounts — Dynamic Pricing & Guest Tier System

**Epic ID:** 41  
**Theme:** Revenue Growth + Guest Retention  
**Duration:** 3-5 days (YOLO mode)  
**Start Date:** 2026-07-29 (after Story 41.0 completion)  
**Target Completion:** 2026-08-02  
**Assignee:** @dev (Dex)  
**Mode:** YOLO (Fully Autonomous)  

---

## Epic Vision

Transform Lodgra from a *risk-mitigation platform* (refunds) into a *growth engine* (loyalty + dynamic pricing). Enable hosts to:
- Reward repeat guests with loyalty discounts
- Offer dynamic tier-based pricing (bronze/silver/gold/platinum)
- Boost revenue through upsells (early-bird, last-minute, extended stay)
- Reduce cancellations via guest engagement

**Revenue Impact:** 15-25% margin improvement projected (based on industry benchmarks)

---

## Story Structure (5-6 Stories)

### Story 41.1: Loyalty Score System (3 pts)
**Acceptance Criteria:**
- [x] Calculate guest loyalty score (0-100)
  - Booking history: +5 pts per completed stay
  - No cancellations: +10 pts per stay (bonus)
  - Referrals: +15 pts per successful referral
  - Duration: Capped at 100 pts
- [x] Store score in reservations table
- [x] API endpoint: GET `/api/guests/{id}/loyalty-score`
- [x] 8+ unit tests

**Files:**
- `src/lib/loyalty/loyalty-calculator.ts` (LoyaltyCalculator class)
- `src/app/api/guests/[id]/loyalty-score/route.ts`
- `src/__tests__/lib/loyalty-calculator.test.ts`

---

### Story 41.2: Guest Tier System (3 pts)
**Acceptance Criteria:**
- [x] Define 4 tiers: Bronze (0-25), Silver (26-50), Gold (51-75), Platinum (76-100)
- [x] Each tier has discount baseline:
  - Bronze: 0% (baseline)
  - Silver: 5% discount
  - Gold: 10% discount
  - Platinum: 15% discount
- [x] Store tier mapping in properties table (or tier_config JSON)
- [x] API endpoint: GET `/api/guests/{id}/tier` with discount
- [x] 6+ unit tests

**Files:**
- `src/lib/loyalty/tier-system.ts` (TierCalculator class)
- `src/app/api/guests/[id]/tier/route.ts`
- `src/__tests__/lib/tier-system.test.ts`

---

### Story 41.3: Dynamic Discount Calculator (5 pts)
**Acceptance Criteria:**
- [x] Build on RefundCalculator pattern
- [x] Calculate final price with:
  - Base price (from property pricing)
  - Loyalty discount (tier-based) — applied first
  - Seasonal modifiers (if exists)
  - Last-minute discount (7 days or less): -10%
  - Extended stay (7+ nights): -5%
  - Early-bird (30+ days advance): -5%
- [x] Never go below 50% of base price (floor)
- [x] API endpoint: POST `/api/reservations/calculate-price`
  - Input: guest_id, property_id, check_in, check_out, nights
  - Output: base_price, loyalty_discount, seasonal_adj, final_price, breakdown
- [x] 15+ integration tests

**Files:**
- `src/lib/pricing/discount-calculator.ts` (DiscountCalculator class)
- `src/app/api/reservations/calculate-price/route.ts`
- `src/__tests__/api/discount-calculator-integration.test.ts`

---

### Story 41.4: Guest Tier UI Card (3 pts)
**Acceptance Criteria:**
- [x] Display tier card on guest reservation details
  - Current tier (Bronze/Silver/Gold/Platinum)
  - Loyalty score progress bar (0-100)
  - Current discount %
  - Next tier unlock (e.g., "5 more stays to Gold tier")
- [x] Mobile-first design (similar to GuestCancellationCard)
- [x] Show loyalty perks (e.g., "Gold members get 10% off")
- [x] 8+ E2E tests

**Files:**
- `src/components/loyalty/GuestTierCard.tsx` (new)
- `src/app/[locale]/reservations/[id]/page.tsx` (integrate)
- `src/__tests__/e2e/story-41-4-tier-card.test.ts`

---

### Story 41.5: Dynamic Price Preview (4 pts)
**Acceptance Criteria:**
- [x] When guest selects dates on property calendar:
  - Show real-time price breakdown
  - Base price: €200
  - Loyalty discount (tier): -€20 (10%)
  - Early-bird (30+ days): -€10
  - **Final: €170**
- [x] Update on date selection change
- [x] Show in property details + booking flow
- [x] Mobile-responsive tooltip
- [x] 10+ E2E tests

**Files:**
- `src/components/calendar/PriceBreakdownTooltip.tsx` (new)
- `src/app/[locale]/properties/[id]/page.tsx` (integrate)
- `src/__tests__/e2e/story-41-5-price-preview.test.ts`

---

### Story 41.6: Loyalty Dashboard (3 pts)
**Acceptance Criteria:**
- [x] New page: `/dashboard/loyalty`
- [x] Show:
  - Top 10 guests by loyalty score
  - Tier distribution (how many Bronze/Silver/Gold/Platinum)
  - Revenue impact (est. discount cost vs. repeat booking value)
  - Churn risk (guests not returning)
- [x] Simple charts (loyalty tier distribution)
- [x] 6+ unit tests

**Files:**
- `src/app/dashboard/loyalty/page.tsx` (new)
- `src/app/api/dashboard/loyalty/stats/route.ts` (new)
- `src/__tests__/api/loyalty-dashboard.test.ts`

---

## Implementation Strategy

### Phase 1: Core Calculation (Stories 41.1 - 41.3)
- Build loyalty score + tier system (replicates RefundCalculator pattern)
- Integration tests validate all discount combinations
- API endpoints ready for frontend

### Phase 2: UI Integration (Stories 41.4 - 41.5)
- Tier card + price preview on reservation pages
- E2E tests validate guest experience

### Phase 3: Analytics (Story 41.6)
- Dashboard shows loyalty metrics
- Data-driven decisions for future optimization

---

## Technical Approach

### Reuse RefundCalculator Pattern
```typescript
// Similar to RefundCalculator
class LoyaltyCalculator {
  static calculateScore(bookingHistory: Booking[]): number { }
}

class TierCalculator {
  static calculateTier(score: number): Tier { }
}

class DiscountCalculator {
  static calculate(input: DiscountInput): DiscountResult { }
}
```

### Database Changes
- Add `loyalty_score` column to guests table
- Add `tier_config` JSON to properties table
- Track `discount_amount` in reservations table

### Testing Strategy
- Unit tests for each calculator
- Integration tests for combined logic
- E2E tests for guest experience

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Test Coverage | 90%+ |
| Code Quality | 0 CRITICAL issues (CodeRabbit) |
| Performance | <100ms for price calculation |
| Mobile UX | Touch-friendly (44+px buttons) |
| Accessibility | WCAG AA compliant |

---

## Dependencies

✅ **Already Complete:**
- RefundCalculator pattern (Story 40.2)
- Mobile UI patterns (Story 40.3)
- Email system (Story 29)

🔄 **In Progress:**
- Story 41.0 (zero technical debt)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Discount floor logic errors | Medium | High | Extensive unit tests |
| Mobile UX complexity | Low | Medium | Follow Story 40.3 pattern |
| Database migration | Low | High | Test in staging first |
| Performance at scale | Low | Medium | Index on guest_id, loyalty_score |

---

## YOLO Execution Checklist

- [ ] Story 41.0 (zero debt) complete
- [ ] All 6 stories drafted
- [ ] @dev begins with 41.1 (loyalty score)
- [ ] 3-5 day sprint, daily commits
- [ ] CodeRabbit validation on each story
- [ ] Final QA gate before merge
- [ ] Production deployment

---

**Epic Status:** READY FOR DEV  
**Created:** 2026-07-29  
**Expected Completion:** 2026-08-02
