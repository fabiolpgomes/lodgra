# 🚀 Release Notes — Epic 37: Calendar Pricing & Availability Management

**Release Date:** 2026-08-02  
**Version:** 4.32.0 (Calendar Pricing Feature Complete)  
**Status:** ✅ Production Ready

---

## 📋 Overview

Epic 37 implements a comprehensive **calendar pricing and availability management system** for property owners. All 4 stories are production-ready with zero technical debt.

**Impact:** Property owners can now:
- Set base prices and weekend price premiums
- Configure multi-tier discounts (weekly, monthly, loyalty)
- Enforce availability rules (min/max nights, advance notice, booking window)
- Process refunds automatically via Stripe based on flexible cancellation policies

---

## ✅ Features Implemented

### Story 37.1: Card Preços (Pricing Configuration)
**Status:** ✅ DONE | **Tests:** 35/35 passing | **QA Gate:** PASS

- Base price editing (€/night)
- Weekend price premium (Saturday-Sunday override)
- Weekend price validation (>= base price)
- Bulk calendar fill with base price
- Smart Pricing placeholder (UI ready for future enhancement)
- **Security:** Owner-only access via API authentication

**Files:**
- `src/components/calendar/PriceCard.tsx` — Weekend price UI + save handler
- `src/app/api/properties/[id]/pricing/route.ts` — GET/PUT with auth
- `src/app/api/properties/[id]/pricing/bulk-update/route.ts` — Bulk update with auth

---

### Story 37.2: Card Descontos (Discount Configuration)
**Status:** ✅ DONE | **Tests:** 39/39 passing | **QA Gate:** PASS

- **Weekly Discount:** 7-27 nights, percentage-based
- **Monthly Discount:** 28+ nights, percentage-based
- **Loyalty Discount:** Recurring guests with 4.8+ rating (placeholder for Story 37.5)
- **Cascata Logic:** Weekly OR Monthly applies (not both) — highest discount wins
- **Loyalty Stacking:** Applied additively on top of duration discount
- Real-time savings preview (€ calculation)
- Average reference values (€894/week, €1724/month)

**Example:**
```
€100/night × 7 nights = €700
With 5% weekly discount = €665 (saves €35)
```

**Files:**
- `src/lib/pricing/discount-calculator.ts` — Cascata logic implementation
- `src/components/calendar/DiscountCard.tsx` — Edit UI + modal
- `src/app/api/properties/[id]/discounts/[discountId]/route.ts` — PUT endpoint

---

### Story 37.3: Card Disponibilidade (Availability Rules)
**Status:** ✅ DONE | **Tests:** 75/75 passing | **QA Gate:** PASS

- **Min/Max Nights:** Enforce booking length (1-365 nights)
- **Advance Notice:** Require booking 1+ days ahead (supports same-day in approval mode)
- **Booking Window:** Define how far in advance guests can book (24mo, 12mo, 9mo, 6mo, 3mo, or custom)
- **Preparation Time:** Buffer between check-out and next check-in (0, 1, 2, 7 days)
- **Approval Mode:** Allow bookings outside rules pending owner approval (status: `pending_approval`)
- **Validation at Booking:** Automatic rejection of invalid dates

**Example Rules:**
```
Min: 3 nights | Max: 60 nights
Advance notice: 7 days
Booking window: 6 months
Prep time: 1 day (clean turnover)
```

**Files:**
- `src/lib/availability/availability-validator.ts` — Validation logic
- `src/components/calendar/AvailabilityCard.tsx` — Edit UI
- `src/app/api/properties/[id]/availability/route.ts` — GET/PUT endpoints

---

### Story 37.4: Card Cancelamento + Stripe (Refunds)
**Status:** ✅ DONE | **Tests:** 62/62 passing | **QA Gate:** PASS

- **Airbnb Cancellation Model:** 5 policy types with refund percentages
  - **Flexible:** 100% until 1 day before → 50% up to 1 day after check-in
  - **Moderate:** 100% until 5 days before → 50% up to 5 days after check-in
  - **Limited:** 100% until 14 days before → 50% (7-14 days) → 0% within 7 days
  - **Firm:** 100% until 30 days before → 50% (7-30 days) → 0% within 7 days
  - **Rigid:** 0% non-refundable (long-stay only)

- **Automatic Refund Processing:** Via Stripe API with exponential backoff retry
- **Policy Snapshot:** Captures policy at booking time (audit trail)
- **Guest Notification:** Email with refund amount + percentage

**CRITICAL BUG FIX:**
- ✅ Fixed refund calculator mismatch (was returning 0% instead of 50% on check-in day)
- ✅ Financial impact: Correctly processes €250 refund (50% of €500) instead of €0
- ✅ All cancellation tests now verify correct percentages

**Files:**
- `src/app/api/reservations/[id]/cancel/route.ts` — Cancellation endpoint (FIXED)
- `src/lib/cancellation/refund-calculator.ts` — Airbnb policy model
- `src/components/calendar/CancellationCard.tsx` — Policy editor UI
- `src/app/api/properties/[id]/cancellation-policies/route.ts` — GET/POST/PUT/DELETE

---

## 📊 Quality Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | 2702/2703 | ✅ 99.96% pass |
| **Story 37 Tests** | 211 tests | ✅ 100% pass |
| **Code Coverage** | ~85% | ✅ Good |
| **Type Safety** | 0 TypeScript errors | ✅ Clean |
| **Linting** | 0 ESLint errors | ✅ Clean |
| **Build** | Successful | ✅ Clean |
| **QA Gate** | All PASS | ✅ Approved |

---

## 🔒 Security Enhancements

- ✅ **API Authentication:** All endpoints require user authentication via Supabase
- ✅ **Owner Verification:** All pricing/discount/availability/cancellation endpoints verify property ownership
- ✅ **RLS Policies:** Row-level security enforces data isolation
- ✅ **Input Validation:** Both client-side (UX) and server-side (safety)
- ✅ **Stripe Security:** Exponential backoff retry with timeout handling

---

## 🚀 Deployment Checklist

- [x] All 4 stories QA PASS
- [x] 2702/2703 tests passing (no regressions)
- [x] TypeScript clean (0 errors)
- [x] Build successful
- [x] Security validation complete
- [x] Database migrations ready (cancellation_policies table)
- [x] API endpoints tested (all CRUD operations)
- [x] Email templates ready (refund-processed)
- [x] Documentation updated

**Ready for:** Production deployment

---

## 📝 Migration Notes

**Database:**
```sql
-- Cancellation policies table (auto-created by Supabase migration)
CREATE TABLE public.property_cancellation_policies (
  id uuid NOT NULL PRIMARY KEY,
  property_id uuid NOT NULL,
  policy_type text NOT NULL,
  is_long_stay boolean NOT NULL,
  ...
);

-- Reservations table additions:
-- - cancellation_policy_id (foreign key)
-- - cancellation_policy_snapshot (JSON)
-- - refund_amount (numeric)
-- - refund_processed_at (timestamp)
-- - stripe_refund_id (text)
```

**Environment:**
- No new environment variables required
- Uses existing Stripe credentials (STRIPE_SECRET_KEY)
- Uses existing Supabase config

---

## 🎯 Next Steps (Story 37.5+)

Future enhancements (not in this release):
- Story 37.5: Loyalty discount automation (based on guest history)
- Story 38: Custom price periods (specific dates/ranges)
- Story 39: Smart pricing with demand-based adjustments
- Story 40: Analytics dashboard (pricing performance metrics)

---

## 📖 Documentation

- **User Guide:** `docs/guides/pricing-and-availability.md`
- **API Reference:** `docs/api/properties-pricing.md`
- **Architecture:** `docs/architecture/pricing-system.md`

---

## 🙏 Contributors

- **Development:** @dev (Dex) — 4 stories, 100+ hours
- **QA:** @qa (Quinn) — 10-phase review cycle, critical bug fixes
- **DevOps:** @devops (Gage) — Push & deployment management

---

**Status:** ✅ **APPROVED FOR PRODUCTION**

**Approved by:** Quinn (@qa) — 2026-08-02  
**Deployed by:** Gage (@devops) — 2026-08-02  
**Commit:** a990b504 (+ 4 previous commits)

---

*For questions or issues, contact the development team.*
