# Production Monitoring Plan — Overnight 2026-07-29 → 2026-07-30

**Deployment:** v4.2.0 (Epic 41 - Loyalty & Discounts)  
**Start Time:** 2026-07-29 ~17:00 UTC  
**Monitoring Period:** Overnight (8-12 hours)  
**Resume Time:** 2026-07-30 Morning  

---

## Critical Endpoints to Monitor

### Epic 40 (Manual Review) — Must Stay Green
- `POST /api/reservations/[id]/cancel` — Guest cancellation
- `GET /api/admin/review/[id]` — Manager review page
- `POST /api/admin/review/[id]/decision` — Decision submission

### Epic 41 New Endpoints — New in Production
- `GET /api/guests/[id]/loyalty-score` — Loyalty calculation
- `GET /api/guests/[id]/tier` — Tier lookup
- `POST /api/reservations/calculate-price` — Price preview

### Dashboard
- `/dashboard/loyalty` — Loyalty dashboard

---

## What to Check Tomorrow Morning

### Phase 1: Production Logs (5 min)
```bash
# Check Vercel logs for v4.2.0 deployment
# Look for:
1. Build completed successfully ✅
2. No critical errors in first 30 min
3. No spike in error rate
4. No 500 errors in Epic 41 endpoints
```

### Phase 2: Endpoint Verification (10 min)

**Test each endpoint:**

```bash
# Loyalty Score
GET https://www.lodgra.io/api/guests/[sample-id]/loyalty-score
→ Should return { guest_id, loyalty_score, breakdown }

# Tier
GET https://www.lodgra.io/api/guests/[sample-id]/tier
→ Should return { current_tier, loyalty_score, base_discount, next_tier }

# Calculate Price
POST https://www.lodgra.io/api/reservations/calculate-price
Body: { base_price: 200, loyalty_discount_percent: 10, check_in, check_out, nights_total }
→ Should return { base_price, final_price, discount_breakdown, applied_rules }
```

### Phase 3: Dashboard Check (5 min)
- Navigate to `/dashboard/loyalty`
- Should load without errors
- Should display tier distribution
- Should show top loyal guests

### Phase 4: Epic 40 Regression Check (10 min)

**Manual Review Flow:**
1. Create test serious_issue cancellation
2. Verify review email sent to manager
3. Check review page loads
4. Submit decision (APPROVED/PARTIAL/DENIED)
5. Verify decision email sent to guest
6. Check refund processing

**Refund Calculation:**
1. Create test reservation with loyalty discount
2. Verify RefundCalculator applies correct discount
3. Check final price calculation

---

## Success Criteria for Morning Check

| Check | Expected | Pass? |
|-------|----------|-------|
| Deployment logs | No critical errors | [ ] |
| Error rate | < 0.1% | [ ] |
| Loyalty-score endpoint | 200 OK | [ ] |
| Tier endpoint | 200 OK | [ ] |
| Calculate-price endpoint | 200 OK | [ ] |
| Dashboard | Loads + displays data | [ ] |
| Epic 40 cancellation | Works end-to-end | [ ] |
| Epic 40 review flow | Works end-to-end | [ ] |
| Refund calculation | Correct discounts | [ ] |

---

## If Issues Found Tomorrow

### Scenario 1: Endpoints Return 500 Errors
- Check Vercel logs for exception
- If database connectivity: check Supabase status
- If missing env var: verify deployment secrets
- Rollback to v4.1.0 if critical

### Scenario 2: Pricing Calculation Wrong
- Check DiscountCalculator logic (Story 41.3)
- Verify tier lookup working
- Test with known scenarios (e.g., gold member, early-bird)

### Scenario 3: Dashboard Empty/Broken
- Check GET /api/dashboard/loyalty/stats endpoint
- Verify database queries return data
- Check component props/state

### Scenario 4: Epic 40 Regression
- Check manual review email sending
- Verify Stripe refund processing
- Review logs for auth/session issues

---

## Resume Plan (Tomorrow Morning)

**9:00 AM - Phase 1-4 Verification (30 min)**
1. Review Vercel deployment logs
2. Test all 6 endpoints
3. Check dashboard
4. Test Epic 40 flow

**9:30 AM - Phase 2 Debug (3-4 hours)**
1. Start @dev with EPIC-41-PHASE-2-DEBUG-STATUS.md context
2. Fix remaining 34 tests systematically
3. Target: 2753/2753 passing by noon

**1:00 PM - Final Deployment**
1. QA review of fixes
2. Deploy v4.2.1 or v4.3.0
3. Final monitoring

---

## Key Files for Reference

- Production Status: This file
- Debug Status: `/docs/stories/EPIC-41-PHASE-2-DEBUG-STATUS.md`
- Release Info: GitHub Release v4.2.0
- Logs Location: Vercel dashboard

---

**MONITORING OVERNIGHT. RESUME TOMORROW MORNING WITH FULL STATUS CHECK.**

All systems documented and ready for continuation.
