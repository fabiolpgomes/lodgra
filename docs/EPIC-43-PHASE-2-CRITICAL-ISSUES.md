# Epic 43 Phase 2 — CRITICAL ISSUES REPORT

**Date:** 2026-07-31 15:40 UTC
**Status:** 🚨 BLOCKING PRODUCTION

---

## Issue #1: Incorrect Pricing (€130/noite instead of €85)

### Symptom
- Property page shows base price of **€130/noite** instead of **€85/noite**
- Test case: 2-night booking (01/10 - 03/10) shows total €260 instead of €170
- Affects: Desktop BookingWidget calculation
- **ROOT CAUSE IDENTIFIED:** BookingWidget ignores daily prices from database and uses wrong calculation
  - Database HAS correct data (prices vary by day: R$85, R$140, R$85...)
  - BookingWidget is NOT reading daily_prices table
  - Using only basePrice and applying wrong multiplier

### Test URL
```
https://algarve-home-stay.lodgra.io/p/t2-armacao-de-pera-praia-dos-pescadores?checkIn=2026-10-01&checkOut=2026-10-03
```

### Expected vs Actual
| Metric | Expected | Actual |
|--------|----------|--------|
| Base Price | €85/night | €130/night |
| Calculation | €85 × 2 = €170 | €130 × 2 = €260 |
| Error | — | +€90 (52% overcharge) |

### Root Cause Analysis

**Possible causes:**
1. Database corruption: property_prices table has wrong value (€130 instead of €85)
2. Calculation error: CleaningFee (€90) is being added to each night instead of per-stay
3. Component logic: BookingWidget multiplying price twice
4. ISR cache: Stale cache serving wrong values

### Investigation Steps — COMPLETED ✅

**Finding:** Database has correct daily prices configured!
- Screenshot shows calendar with varying prices: R$85, R$140, R$85...
- Descontos card correctly shows: Semanal 10%, Mensal 20%
- Disponibilidade card correctly shows: 3-90 noites

**ROOT CAUSE:** BookingWidget NOT using daily_prices
- [ ] BookingWidgetDesktop.tsx reads only `basePrice` prop
- [ ] Missing: call to getPriceForRange() with daily prices
- [ ] Missing: discount calculation (10% semanal, 20% mensal)
- [ ] Missing: max_nights validation (90 noites limit)
- [ ] Missing: cancellation policy display for period

### Fix Required
1. **Update BookingWidgetDesktop.tsx**
   - Call API endpoint that returns daily_prices breakdown
   - Apply weekly discount (7-27 nights = 10%)
   - Apply monthly discount (28+ nights = 20%)
   - Validate max_nights (≤90)
   
2. **Update getPriceForRange.ts**
   - Return daily_prices array (not just total)
   - Include discount calculation per day
   - Return cancellation policy for period

---

## Issue #2: "Reservar" Button Causes Page Redirect

### Symptom
- Clicking "RESERVAR AGORA" button redirects to landing page (`algarve-home-stay.lodgra.io/`)
- No error message displayed
- No console errors detected
- Affects: Booking flow completion

### Test URL
```
https://algarve-home-stay.lodgra.io/p/t2-armacao-de-pera-praia-dos-pescadores?checkIn=2026-10-01&checkOut=2026-10-03
[Click "RESERVAR AGORA" button]
→ Redirects to: https://algarve-home-stay.lodgra.io/
```

### Possible Root Causes
1. **Price Calculation API Error (500):** getPriceForRange.ts throws error during booking
2. **Validation Error (400):** minNights validation failing silently
3. **Data Mutation Error:** BookingWidget state corruption on submit
4. **Redirect Logic Error:** Button click handler misconfigured
5. **API Rate Limiting:** Request blocked due to rate limit

### Investigation Steps
- [ ] Add Network tab monitoring to capture request/response
- [ ] Check Vercel logs for 500 errors during booking attempt
- [ ] Verify BookingWidgetDesktop.tsx line ~300-350 (submit handler)
- [ ] Check if error event handler silently redirects
- [ ] Verify API endpoint exists: `/api/bookings/create` or `/api/reservations`
- [ ] Check middleware/redirects in vercel.json or next.config.js

---

## Impact Assessment

| Component | Impact | Severity |
|-----------|--------|----------|
| Pricing Display | Overcharges users by 52% | 🔴 CRITICAL |
| Booking Flow | Breaks reservation process | 🔴 CRITICAL |
| Trust | Users see wrong price then error | 🔴 CRITICAL |
| Revenue | Potential billing disputes | 🔴 CRITICAL |

---

## Deployment Status

- ✅ Commit a782719d (discount fix) deployed
- ✅ Commit 3dc3bb51 (force redeploy) sent
- ❌ Pricing still incorrect (€130 instead of €85)
- ❌ Booking button still broken

**Next Vercel deployment may fail if these issues not fixed in code**

---

## Recommended Actions

### IMMEDIATE (Next 30 minutes)
1. [ ] Stop production traffic to booking widget
2. [ ] Verify database: `SELECT base_price FROM property_prices`
3. [ ] Check if cleaningFee is being added per-night instead of per-stay
4. [ ] Add network logging to capture booking API error

### SHORT-TERM (Next 1 hour)
1. [ ] Fix price calculation logic
2. [ ] Fix booking button error handling
3. [ ] Add proper error messages for booking failures
4. [ ] Manual test booking flow end-to-end

### QA CHECKLIST
- [ ] Base price displays as €85/noite (not €130)
- [ ] 2-night booking shows €170 total (not €260)
- [ ] 7-night booking applies 10% discount
- [ ] 28-night booking applies 20% discount
- [ ] Click "Reservar" completes booking (no redirect)
- [ ] Error message displays if booking fails

---

## Files to Review

1. `src/components/common/public/booking/BookingWidgetDesktop.tsx` (lines 100-350)
2. `src/components/common/public/booking/BookingWidgetMobile.tsx` (lines 100-300)
3. `src/lib/pricing/getPriceForRange.ts` (entire file)
4. `src/app/p/[slug]/page.tsx` (lines 100-150, data fetching)
5. Database schema: `property_prices`, `property_availability` tables

---

## References
- Session 2026-07-31 Part 4: Production testing discovers pricing & booking issues
- Epic 43 Phase 2 Documentation: `/docs/EPIC-43-PHASE-2-KNOWN-ISSUES.md`
- Pricing Fix Commit: a782719d ("fix: repair pricing calculation and minNights validation")
- Force Redeploy: 3dc3bb51 ("trigger: force Vercel redeploy")

