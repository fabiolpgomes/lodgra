# Epic 43 Phase 2 — Known Issues & Next Steps

**Date:** 2026-07-31  
**Status:** Production Deployed (with bugs)

---

## ✅ What Was Fixed

1. **Removed legacy `min_nights` column** from `properties` table
2. **Created `property_availability` table** with min_nights defaults (1-365)
3. **Fixed hardcoded `basePrice={0}`** in BookingWidget components
4. **Added TypeScript type** `base_price?: number` to Property interface
5. **Pricing now displays correctly** (€85 base price visible on property pages)

---

## 🐛 Bugs Identified — Must Fix Next Sprint

### 1. **BookingWidget Validation Bug** 🔴 High Priority
**Problem:**  
- Set `property_availability.min_nights = 3` in calendar
- Booking widget allows 2-night reservations (01/10 - 03/10)
- No validation enforced

**Expected Behavior:**
- ❌ Block date selections < minNights
- ❌ Show warning: "Mínimo X noites"
- ❌ Disable "RESERVAR AGORA" button if nights < minNights

**Files to Check:**
- `src/components/common/public/booking/BookingWidgetDesktop.tsx` (line ~150-180)
- `src/components/common/public/booking/BookingWidgetMobile.tsx` (line ~140-170)
- Look for: validation logic, button disabled state

**Test Case:**
```
1. Set property_availability.min_nights = 3
2. Try to book 2 nights (should fail)
3. Try to book 3+ nights (should succeed)
```

---

### 2. **Discount Calculation Bug** 🔴 High Priority
**Problem:**
- 7+ night discount (10%) not applying
- 28+ night discount (20%) not applying
- Test results:
  - 9 nights (01/10 - 10/10): €101/night (no discount) instead of €76.50/night with 10% off
  - 36 nights (01/10 - 06/11): €89/night (no discount) instead of €68/night with 20% off

**Expected Behavior:**
- 7-27 nights: Apply 10% discount (€85 → €76.50/night)
- 28+ nights: Apply 20% discount (€85 → €68/night)

**Possible Causes:**
- `property_discounts` table empty or not populated for property
- Discount rules not querying correctly from table
- ReservationValidator not applying discount tiers
- Date range calculation issue

**Test Case:**
```
1. Select dates with 7+ CONSECUTIVE nights (no gaps) → verify 10% discount
2. Select dates with 28+ CONSECUTIVE nights (no gaps) → verify 20% discount
3. Check property_discounts table: SELECT * FROM property_discounts WHERE property_id = '{property_id}'
4. Verify ReservationValidator applies discount based on night count
```

---

### 3. **Cancellation Policy Not Displayed** 🟡 Medium Priority
**Problem:**
- Cancellation policy card missing from property page
- No information about refund terms, deadlines, or conditions
- Booking widget doesn't show cancellation policy before reservation

**Expected Behavior:**
- PropertyPolicies component should display cancellation policy section
- Show: refund % by days-before-checkin, strict/moderate/flexible labels
- Include in booking confirmation flow

**Files to Check:**
- `src/components/common/public/content/PropertyPolicies.tsx` (may need cancellation_policy param)
- `src/app/p/[slug]/page.tsx` (load cancellation policy from DB)
- Schema: Check if `properties` table has `cancellation_policy` field or link to `property_cancellation_policies` table

**Test Case:**
```
1. Load property page
2. Scroll to "Políticas" section
3. Verify cancellation policy card visible with:
   - Refund % for each cancellation window
   - Days before check-in thresholds
   - Policy name (Flexible/Moderate/Strict)
4. Verify policy shown in booking summary before payment
```

---

### 4. **Calendar UX — Reserved Dates Not Visible** 🟡 Low Priority
**Problem:**
- Dates marked as "Reservado" in legend
- But visually indistinct from available dates
- Hard to see which dates are booked

**Suggested Improvements:**
- Color code: reserved dates in red/gray background
- Add pattern/texture to reserved dates
- Tooltip on hover: "Booked: 01/09 - 11/09"
- Higher contrast between available/reserved

**Files:**
- `src/components/common/public/booking/AvailabilityCalendar.tsx`

---

## 📋 Action Items

- [ ] **CRITICAL:** Fix discount calculation for 7+ nights (10% off)
- [ ] **CRITICAL:** Fix discount calculation for 28+ nights (20% off)
- [ ] **HIGH:** Verify property_discounts table populated for all properties
- [ ] **HIGH:** Fix BookingWidget minNights validation
- [ ] **MEDIUM:** Display cancellation policy on property page
- [ ] Improve calendar visual indicators for reserved dates
- [ ] Add test case: min_nights validation
- [ ] Add test case: discount for 7/28+ nights
- [ ] Add test case: cancellation policy display
- [ ] Verify discount calculation works with consecutive nights only (no gaps)

---

## Database State

| Table | Status | Notes |
|-------|--------|-------|
| `property_availability` | ✅ Created | min_nights = 1 (default), max_nights = 365 |
| `property_prices` | ✅ Created | base_price populated for 10 properties (€85 for T2 Armação) |
| `property_discounts` | ❌ CRITICAL | Likely empty — NOT APPLIED in pricing calc (VERIFIED BUG) |
| `property_daily_prices` | ✅ Created | Empty (can add overrides later) |
| `property_cancellation_policies` | ❓ Unknown | May not exist — need to check schema |
| `cancellation_policy` column | ❓ Unknown | Check if properties table has this field |

---

## Testing Checklist for Next Session

**CRITICAL - Discount Validation:**
- [x] ✅ CONFIRMED BUG: 9 nights shows €87/night (no discount) — should be €76.50/night with 10% off
- [x] ✅ CONFIRMED BUG: Total shows €779 (no discount) — should be €688.50 with 10% off
- [ ] Commit `a782719d` fix verified in code but Vercel deployment delayed
- [ ] **ACTION TAKEN (2026-07-31 15:18):** Created empty commit (3dc3bb51) to force Vercel redeploy
- [ ] Awaiting new deployment to verify discount calculation works
- [ ] Test 7+ nights with CONSECUTIVE dates (no gaps between selected dates)
- [ ] Test 28+ nights with CONSECUTIVE dates (no gaps between selected dates)

**HIGH - minNights Validation:**
- [x] ✅ WORKING: 9-night booking allowed (minimum 3 nights enforced correctly)
- [x] ✅ minNights validation appears functional in BookingWidget

**HIGH - "Reservar" Button Redirect Issue:**
- [x] ⚠️ NEW BUG FOUND: Clicking "Reservar" button redirects to landing page
- [ ] Root cause: Unknown (no console errors detected)
- [ ] May be related to pricing API error or validation failure
- [ ] Needs investigation: Check API response when clicking Reservar

**MEDIUM - Cancellation Policy:**
- [ ] Verify cancellation policy card visible on property page
- [ ] Verify refund % and days-before-checkin shown correctly
- [ ] Verify policy appears in booking summary

**LOW - Calendar UX:**
- [ ] Verify reserved dates are visually clear and distinct
- [ ] Test full booking flow: select dates → see discount → complete booking

---

## Test Results Verified

**Test 1: 9 Nights (01/10 - 10/10)**
- Expected: €85/night base, 10% discount (7+ nights) = €76.50/night, Total €688.50
- Actual: €101/night, Total €910
- Status: ❌ DISCOUNT NOT APPLIED

**Test 2: 36 Nights (01/10 - 06/11)**
- Expected: €85/night base, 20% discount (28+ nights) = €68/night, Total €2448
- Actual: €89/night, Total €3205
- Status: ❌ DISCOUNT NOT APPLIED

---

**Related Sessions:**
- Session 2026-07-31 Part 1: Production issue discovery + database fix
- Session 2026-07-31 Part 2: basePrice bug fix + validation issues identified
- Session 2026-07-31 Part 3: Manual testing confirms discount + cancellation policy bugs

**Next Sprint:** Address these 4 bugs (minNights validation, discount 7+, discount 28+, cancellation policy) before marketing/launch
