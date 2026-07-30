# E2E Test Plan — Story 43.1.1

**Date:** 2026-07-30  
**Tester:** @dev (Dex) - Autonomous E2E Validation  
**Environment:** localhost:3000 (dev server)  
**Browser:** Chrome/Safari (latest)

---

## Pre-Test Setup

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Keep available for test data setup
# (Use Supabase dashboard to verify test data if needed)
```

**Wait for:** "Ready in X.XXs" message in terminal

---

## Test Data Fixtures

| Property | Min Nights | Avg Price/Night | Discounts |
|----------|-----------|-----------------|-----------|
| prop-123 | 2 | €100 | None |
| prop-456 | 5 | €80 | 10% (7-27 days) |
| prop-789 | 3 | €60 | 20% (28+ days) |

**Verification:** Check in Supabase dashboard → calendar_pricing, property_discounts tables

---

## Scenario 1: Valid 5-Night Stay (No Discount)

**Setup:**
- URL: http://localhost:3000/admin/reservations/validate
- Property: prop-123
- Check-in: 2026-08-05
- Check-out: 2026-08-10

**Steps:**
1. [ ] Page loads with form (3 inputs visible)
2. [ ] Fill propertyId = "prop-123"
3. [ ] Fill checkIn = "2026-08-05"
4. [ ] Fill checkOut = "2026-08-10"
5. [ ] Click "Validar Reserva" button

**Expected Results:**
- [ ] Form shows loading state (spinner visible)
- [ ] Results display appears below form
- [ ] Period card shows: "5 noites"
- [ ] Base Price card shows: "€500 EUR"
- [ ] Final Price card shows: "€500 EUR" (no discount applied)
- [ ] Discount section NOT visible (hasDiscount = false)
- [ ] Minimum Nights section shows: "✅ OK" (green)
- [ ] Cancellation Policy section shows policy name + terms
- [ ] No errors or warnings in red boxes
- [ ] Browser console: No errors (F12 → Console tab)

**Acceptance:** ✅ PASS if all above verified

---

## Scenario 2: Minimum Nights Error

**Setup:**
- Property: prop-456 (requires 5 minimum nights)
- Check-in: 2026-08-05
- Check-out: 2026-08-06 (only 1 night)

**Steps:**
1. [ ] Clear form fields
2. [ ] Fill propertyId = "prop-456"
3. [ ] Fill checkIn = "2026-08-05"
4. [ ] Fill checkOut = "2026-08-06"
5. [ ] Click "Validar Reserva"

**Expected Results:**
- [ ] Results display shows red error box at top
- [ ] Status shows: "❌ Validação com problemas"
- [ ] Error message visible: "This property requires minimum 5 nights"
- [ ] Minimum Nights section shows: "❌ Erro" (red background)
- [ ] Minimum Nights section shows: "Requerido: 5 noites" / "Selecionado: 1 noite"
- [ ] Final Price: €80 (calculated but validation fails)
- [ ] Browser console: No errors

**Acceptance:** ✅ PASS if red error box appears with correct message

---

## Scenario 3: Extended Discount (30 Nights)

**Setup:**
- Property: prop-789 (20% discount for 28+ days)
- Check-in: 2026-08-01
- Check-out: 2026-08-31 (30 nights)

**Steps:**
1. [ ] Clear form fields
2. [ ] Fill propertyId = "prop-789"
3. [ ] Fill checkIn = "2026-08-01"
4. [ ] Fill checkOut = "2026-08-31"
5. [ ] Click "Validar Reserva"

**Expected Results:**
- [ ] Period card shows: "30 noites"
- [ ] Base Price card shows: "€1800 EUR" (30 × €60)
- [ ] Discount section visible (green background)
- [ ] Discount section shows: "✅ Desconto Aplicado"
- [ ] Discount section shows: "Tipo: Estadia Estendida"
- [ ] Discount section shows: "Percentual: 20%"
- [ ] Discount section shows: "Economia: €360"
- [ ] Final Price card shows: "€1440 EUR" (€1800 × 0.80)
- [ ] Minimum Nights: "✅ OK" (30 ≥ 3)
- [ ] Cancellation Policy displayed
- [ ] Browser console: No errors

**Acceptance:** ✅ PASS if discount calculation correct (€1800 → €1440)

---

## Scenario 4: API Error Handling

**Setup:**
- Property: "invalid-prop" (non-existent)
- Check-in: 2026-08-05
- Check-out: 2026-08-10

**Steps:**
1. [ ] Clear form fields
2. [ ] Fill propertyId = "invalid-prop"
3. [ ] Fill checkIn = "2026-08-05"
4. [ ] Fill checkOut = "2026-08-10"
5. [ ] Click "Validar Reserva"

**Expected Results:**
- [ ] Results display appears
- [ ] Red error section at top with "❌ Validação com problemas"
- [ ] Error message(s) displayed explaining issue
- [ ] API returned 200 (not 500 error)
- [ ] Form remains usable (can retry)
- [ ] Browser console: No JavaScript errors (warnings OK)

**Acceptance:** ✅ PASS if graceful error handling shown

---

## Scenario 5: Form Validation

**Setup:** Fresh form page

**Test 5.1: Required Field — Property ID**
- [ ] Leave propertyId empty
- [ ] Fill checkIn = "2026-08-05"
- [ ] Fill checkOut = "2026-08-10"
- [ ] Attempt to submit
- [ ] Result: Form prevents submit (browser validation)

**Test 5.2: Required Field — Check-in**
- [ ] Fill propertyId = "prop-123"
- [ ] Leave checkIn empty
- [ ] Fill checkOut = "2026-08-10"
- [ ] Attempt to submit
- [ ] Result: Form prevents submit

**Test 5.3: Date Logic — Checkout Before Checkin**
- [ ] Fill propertyId = "prop-123"
- [ ] Fill checkIn = "2026-08-10"
- [ ] Fill checkOut = "2026-08-05" (before checkin)
- [ ] Click "Validar Reserva"
- [ ] Result: Red error displayed: "Check-out must be after check-in"

**Acceptance:** ✅ PASS if all form validations working

---

## Responsiveness Testing

**Desktop (Chrome/Safari):**
- [ ] Form displays full width with proper spacing
- [ ] Results grid (3 columns) displays correctly
- [ ] All text readable, no truncation
- [ ] No horizontal scroll needed

**Mobile (Chrome DevTools 375px width):**
- [ ] Form stacks vertically
- [ ] Results grid (1 column on mobile) displays
- [ ] All inputs accessible
- [ ] No horizontal overflow
- [ ] Buttons clickable with thumb

**Acceptance:** ✅ PASS if responsive on both viewport sizes

---

## Browser Console Check

**Steps:**
1. [ ] Open DevTools (F12)
2. [ ] Go to Console tab
3. [ ] Perform all 5 scenarios above
4. [ ] Check for any errors/warnings

**Expected:**
- [ ] No red error messages
- [ ] No XSS warnings
- [ ] No network errors (HTTP 401/500)
- [ ] Warnings OK (third-party scripts)

**Acceptance:** ✅ PASS if console clean

---

## Summary Checklist

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Valid 5-night stay | ⬜ | Price: €500, no discount |
| 2. Min nights error | ⬜ | Shows red error for 1 night on 5-min property |
| 3. Extended discount | ⬜ | Calculates €1440 (20% off €1800) |
| 4. API error | ⬜ | Graceful error handling for invalid property |
| 5. Form validation | ⬜ | Required fields, date logic work |
| Desktop responsive | ⬜ | Full width, 3-column grid |
| Mobile responsive | ⬜ | 1-column grid, no overflow |
| Console clean | ⬜ | No errors/warnings |

---

## Sign-Off

**Tester:** _____________________  
**Date:** _____________________  
**Pass/Fail:** ⬜ PASS / ⬜ FAIL

**Notes:**
```
[Test notes and observations]
```

---

**Next Steps if FAIL:**
1. Document issue in GitHub Issue
2. Link to story 43.1.1
3. Assign to @dev for fix
4. Re-run E2E after fix

**Next Steps if PASS:**
1. Mark story 43.1.1 as "Ready for Review"
2. Notify QA for gate review
3. Proceed to 43.1.2 (Overlapping Reservations)
