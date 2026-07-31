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

### Fix Required — CORRECT CALCULATION ORDER

**Step 1: Calculate Base Price (with daily prices)**
```
Sum of daily prices for selected dates
Exemplo: R$85 + R$140 + R$85 = R$310
```

**Step 2: Apply Discounts** (if applicable)
```
Semanal (7-27 noites): -10%
Mensal (28+ noites): -20%
Exemplo: R$310 × 0.9 = R$279 (com 10% desconto)
```

**Step 3: Add Fees** (AFTER discount) ⚠️ CRITICAL
```
✅ Taxa de Limpeza (cleaning_fee) - por estadia
✅ Taxa de Animais (pet_fee) - por estadia ou por noite
✅ Outras taxas configuradas
Exemplo: R$279 + R$90 (cleaning) = R$369 TOTAL
```

**1. Update BookingWidgetDesktop.tsx**
   - [ ] Call getPriceForRange() with daily_prices breakdown
   - [ ] Apply weekly discount (7-27 nights = 10%)
   - [ ] Apply monthly discount (28+ nights = 20%)
   - [ ] ⚠️ ADD FEES AFTER DISCOUNT (not before!)
   - [ ] Validate max_nights (≤90)
   - [ ] Display breakdown:
     ```
     Acomodação: R$279
     Taxa de limpeza: R$90
     Total: R$369
     ```

**2. Update getPriceForRange.ts**
   - [ ] Return daily_prices array (for breakdown display)
   - [ ] Calculate discount percentage based on nights
   - [ ] Apply discount to subtotal
   - [ ] Return fees separately (NOT included in total)
   - [ ] BookingWidget adds fees AFTER calling this function
   - [ ] Return cancellation policy for period

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

**Pricing Calculation (Correct Order)**
- [ ] Base price: R$85/noite (from property_prices)
- [ ] Daily prices vary correctly (some days R$140, others R$85)
- [ ] 2-night booking: R$85 + R$140 = R$225 (before discount/fees)
- [ ] 7-night booking applies 10% discount ✅
- [ ] 28-night booking applies 20% discount ✅
- [ ] Fees added AFTER discount (not before!)
  - [ ] Cleaning fee (R$90) added correctly
  - [ ] Pet fee added if applicable
  - [ ] Total = Accommodation (with discount) + Fees

**Validation**
- [ ] Min nights (3) enforced - can't book fewer nights
- [ ] Max nights (90) enforced - can't book more than 90 nights
- [ ] Reserved dates blocked - can't select blocked dates

**Display & User Experience**
- [ ] Breakdown shows daily prices
- [ ] Breakdown shows discount applied (% and amount)
- [ ] Breakdown shows each fee separately
- [ ] Final total = Accommodation with discount + Fees
- [ ] Cancellation policy displays for selected period

**Booking Flow**
- [ ] Click "Reservar" button submits data correctly
- [ ] No redirect to landing page on submit
- [ ] Error messages display if validation fails
- [ ] Success message or confirmation page appears

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

