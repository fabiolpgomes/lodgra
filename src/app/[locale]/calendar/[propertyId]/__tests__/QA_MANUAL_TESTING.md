# Manual QA Testing: Calendar Integration (Phase 2)

**Test Date:** 2026-08-01  
**Tester:** QA Team  
**Platform:** iOS/Android (90% traffic) + Desktop

---

## 📋 Test Cases

### SECTION 1: Day Click Interactions

#### Test 1.1: Single Day Click → Price Modal
- [ ] Navigate to calendar page
- [ ] Click on empty day (no reservation)
- [ ] **Expected:** Modal opens with action menu (💰 Preço | 🔒 Bloquear)
- [ ] **Actual:** ___________
- [ ] **Status:** ✅ / ❌
- [ ] **Notes:** ___________

#### Test 1.2: Enter Price & Save
- [ ] Click "Definir Preço" action
- [ ] Enter price: €120
- [ ] Tap "Salvar Preço"
- [ ] **Expected:** 
  - [ ] API call to `/api/properties/{id}/pricing/bulk-update`
  - [ ] Modal closes
  - [ ] Day shows new price
- [ ] **Status:** ✅ / ❌

#### Test 1.3: Price Validation
- [ ] Click day → "Definir Preço"
- [ ] Try entering: 0
- [ ] **Expected:** Save button disabled
- [ ] Try entering: -50
- [ ] **Expected:** Save button disabled
- [ ] Enter: 150
- [ ] **Expected:** Save button enabled
- [ ] **Status:** ✅ / ❌

#### Test 1.4: Block Dates
- [ ] Click day → "Bloquear Datas"
- [ ] Confirm warning message
- [ ] Tap "Bloquear Datas"
- [ ] **Expected:** Day marked as blocked (🔒 icon)
- [ ] Click blocked day again
- [ ] **Expected:** Option to "Desbloquear" appears
- [ ] **Status:** ✅ / ❌

---

### SECTION 2: Period Selection

#### Test 2.1: Select Multiple Days (7-27 nights)
- [ ] Click first empty day
- [ ] **iOS:** Drag to last day (7 days apart)
- [ ] **Android:** Tap first, then Shift+Tap last
- [ ] **Expected:** 7 days highlighted
- [ ] Right-click → "Definir Preço"
- [ ] Enter €100
- [ ] **Expected:** API called with `startDate` and `endDate`
- [ ] **Status:** ✅ / ❌

#### Test 2.2: Bulk Price Update (28+ nights)
- [ ] Select 28-night period
- [ ] Open price modal
- [ ] Enter €200
- [ ] Save
- [ ] **Expected:** All 28 days get €200
- [ ] **Calculation shown:** €200 × 28 = €5,600
- [ ] **Status:** ✅ / ❌

---

### SECTION 3: Settings Cards Integration

#### Test 3.1: All 5 Cards Visible
- [ ] Scroll settings sidebar
- [ ] **Expected:** See all cards:
  - [ ] 💰 Preços (Base price + Fill calendar)
  - [ ] 📊 Descontos (Weekly/Monthly/Loyalty)
  - [ ] 📅 Disponibilidade (Min/Max/Notice)
  - [ ] 🔄 Cancelamentos (Flex/Moderate/Firm)
  - [ ] 💳 Taxas (Fees list)
- [ ] **Status:** ✅ / ❌

#### Test 3.2: Price Card
- [ ] Enter base price: €150
- [ ] Tap "Salvar"
- [ ] **Expected:** API saves successfully
- [ ] Tap "Preencher Calendário"
- [ ] **Expected:** All empty days get €150
- [ ] **Status:** ✅ / ❌

#### Test 3.3: Discount Card
- [ ] Navigate to Descontos tab
- [ ] Set Weekly: 10%
- [ ] Set Monthly: 20%
- [ ] Set Loyalty: 5%
- [ ] Save
- [ ] **Expected:** API saves all 3 discount types
- [ ] **Display shows:**
  - [ ] Desconto Semanal: 10% | Economia: €89
  - [ ] Desconto Mensal: 20% | Economia: €172
  - [ ] Desconto Fidelidade: 5%
- [ ] **Status:** ✅ / ❌

#### Test 3.4: Availability Card
- [ ] Navigate to Disponibilidade tab
- [ ] Set: Min 2, Max 30, Notice 1 day
- [ ] Toggle "Permitir < 1 dia" ON
- [ ] Set Window: 12 months
- [ ] Save
- [ ] **Expected:** All settings saved
- [ ] **Status:** ✅ / ❌

---

### SECTION 4: Pricing Calculation (Complete Flow)

#### Test 4.1: 7-Night Stay with Discount
**Setup:**
- Base price: €100
- Weekly discount: 10%
- No loyalty

**Calculation:**
- €100 × 7 = €700
- -10% = €630
- **Expected total:** €630

**Test:**
- [ ] Select 7-day period
- [ ] Open price modal
- [ ] Check calculation shown
- [ ] **Status:** ✅ / ❌

#### Test 4.2: 28-Night Stay (Exclusive Discount)
**Setup:**
- Base price: €100
- Weekly discount: 10%
- Monthly discount: 20%
- Loyalty: 5%

**Expected behavior:**
- Should use MONTHLY only (20%), NOT weekly (10%)
- €100 × 28 = €2,800
- -20% = €2,240
- -5% loyalty (on €2,240) = €106.80
- **Final:** €2,133.20

**Test:**
- [ ] Select 28-day period
- [ ] Open modal
- [ ] Verify "Desconto Mensal" is shown (not Weekly)
- [ ] Verify loyalty applied AFTER monthly
- [ ] **Status:** ✅ / ❌

#### Test 4.3: With Fees
**Setup:**
- Base price: €100
- 7 nights
- Fees: Limpeza €50, WiFi €10

**Expected:**
- €100 × 7 = €700
- + €50 + €10 = €760

**Test:**
- [ ] Add fees in Taxas card
- [ ] Select 7-day period
- [ ] Open price modal
- [ ] Verify calculation: €700 + €60 = €760
- [ ] **Status:** ✅ / ❌

---

### SECTION 5: Mobile Responsiveness

#### Test 5.1: iPhone Layout
**Viewport:** iPhone 12 Pro (390×844)
- [ ] Calendar takes full width (100vw)
- [ ] No horizontal scroll
- [ ] Settings sidebar scrollable
- [ ] Modal appears full-screen
- [ ] All buttons tap-friendly (44px+)
- [ ] **Status:** ✅ / ❌
- [ ] **Issues:** ___________

#### Test 5.2: Android Layout
**Viewport:** Pixel 6 (412×915)
- [ ] Calendar responsive
- [ ] Touch interactions work (no tap delay)
- [ ] Modals show correctly
- [ ] Settings cards stack vertically
- [ ] **Status:** ✅ / ❌
- [ ] **Issues:** ___________

#### Test 5.3: Tablet Layout
**Viewport:** iPad (768×1024)
- [ ] 2-column layout (calendar | settings)
- [ ] Both visible simultaneously
- [ ] Settings sidebar fixed height
- [ ] Modal centered (90vw max)
- [ ] **Status:** ✅ / ❌

---

### SECTION 6: Error Handling

#### Test 6.1: Network Error on Save
- [ ] Disable network (Offline mode)
- [ ] Try saving price
- [ ] **Expected:** Error message: "Erro ao salvar"
- [ ] Check modal stays open (doesn't auto-close)
- [ ] Re-enable network
- [ ] Try save again
- [ ] **Expected:** Success
- [ ] **Status:** ✅ / ❌

#### Test 6.2: Invalid Input
- [ ] Enter negative price (-10)
- [ ] **Expected:** Save button disabled
- [ ] Enter zero (0)
- [ ] **Expected:** Save button disabled
- [ ] Enter decimal (99.99)
- [ ] **Expected:** Save button enabled
- [ ] **Status:** ✅ / ❌

#### Test 6.3: Missing Property
- [ ] Navigate to: `/calendar/invalid-id`
- [ ] **Expected:** Error message with fallback
- [ ] No crashes
- [ ] **Status:** ✅ / ❌

---

### SECTION 7: Performance

#### Test 7.1: Page Load Time
- [ ] Open DevTools → Performance tab
- [ ] Navigate to calendar
- [ ] **Target:** < 2 seconds
- [ ] **Actual:** _________ seconds
- [ ] **Status:** ✅ / ❌

#### Test 7.2: Modal Open Time
- [ ] Measure from click to modal visible
- [ ] **Target:** < 200ms
- [ ] **Actual:** _________ ms
- [ ] **Status:** ✅ / ❌

#### Test 7.3: Save Operation
- [ ] Measure from click to confirmation
- [ ] **Target:** < 1 second
- [ ] **Actual:** _________ ms
- [ ] **Status:** ✅ / ❌

---

## 📊 Summary

| Category | Total | Pass | Fail | N/A |
|----------|-------|------|------|-----|
| Day Click | 4 | _ | _ | _ |
| Period Selection | 2 | _ | _ | _ |
| Settings Cards | 4 | _ | _ | _ |
| Pricing | 3 | _ | _ | _ |
| Mobile | 3 | _ | _ | _ |
| Errors | 3 | _ | _ | _ |
| Performance | 3 | _ | _ | _ |
| **TOTAL** | **22** | _ | _ | _ |

**Pass Rate:** _____% ✅
**Critical Issues:** _____
**Minor Issues:** _____

---

## 🐛 Issues Found

### Critical (Blocks Release)
1. ___________
2. ___________

### High Priority
1. ___________
2. ___________

### Medium Priority
1. ___________

### Low Priority
1. ___________

---

## ✅ Sign-off

- [ ] All critical tests passed
- [ ] Mobile responsiveness verified
- [ ] Performance targets met
- [ ] Error handling working
- [ ] Ready for production deployment

**Tester Name:** ___________  
**Date:** ___________  
**Signature:** ___________
