# Phase 2 → Production Deployment Checklist

**Status:** Ready for final validation  
**Date:** 2026-08-01  
**Version:** Phase 2 (E2E + Performance + Integration Complete)

---

## Pre-Deployment Validation

### Code Quality
- [ ] All TypeScript type checks pass (`npm run typecheck`)
- [ ] All ESLint rules pass (`npm run lint`)
- [ ] No console errors in browser console
- [ ] CodeRabbit review passed (0 CRITICAL issues)
- [ ] All imports are absolute paths (`@/...`)

### Testing
- [ ] All unit tests pass (`npm test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Performance tests pass (< 2s page load, < 200ms modal open)
- [ ] Manual QA testing complete (see QA_MANUAL_TESTING.md)
- [ ] Edge cases tested (network errors, invalid input, etc.)

### Mobile-First Validation
- [ ] iPhone 12 Pro (390×844): ✅ Full width, no scroll, touch-friendly
- [ ] Pixel 6 (412×915): ✅ Responsive, touch latency < 300ms
- [ ] iPad (768×1024): ✅ 2-column layout, both visible
- [ ] No horizontal scrolling on any viewport
- [ ] All buttons 44px+ tap target

### Integration Points
- [ ] Calendar component loads correctly
- [ ] Settings sidebar renders all 5 cards
- [ ] Day click modal opens
- [ ] Price save API call works
- [ ] Block dates API call works
- [ ] Modal closes after save
- [ ] Calendar refreshes after API save
- [ ] Selection clears after operation

### API Endpoints
- [ ] `GET /api/properties/[id]` returns propertyId
- [ ] `POST /api/properties/[id]/pricing/bulk-update` saves price
- [ ] `POST /api/properties/[id]/calendar/block-dates` blocks dates
- [ ] `GET /api/properties/[id]/availability/settings` returns availability config
- [ ] `POST /api/properties/[id]/availability/settings` saves settings
- [ ] All endpoints return proper error codes (400, 403, 404, 500)

### Data Validation
- [ ] Base price: positive number, < 10,000
- [ ] Discounts: 0-100%, mutually exclusive (weekly XOR monthly)
- [ ] Loyalty: cascades after volume discount
- [ ] Min/max nights: 1-365, min ≤ max
- [ ] Advance notice: only 0, 1, 2, 7 days
- [ ] Availability window: only 3, 6, 9, 12, 24 months
- [ ] Fees: positive amount, required name

### Browser Compatibility
- [ ] Chrome/Edge 120+: ✅
- [ ] Firefox 122+: ✅
- [ ] Safari 17+: ✅
- [ ] Mobile Safari (iOS 17+): ✅
- [ ] Chrome Mobile (Android 13+): ✅

---

## Deployment Steps

### 1. Create Feature Branch
```bash
git checkout -b deploy/epic43-phase2
```

### 2. Verify Current State
```bash
git status  # Should be clean
npm run typecheck  # Should pass
npm run lint  # Should pass
npm test  # Should pass
```

### 3. Run Full Test Suite
```bash
npm run test:e2e  # E2E tests
npm test -- performance  # Performance tests
npm test -- manual  # Manual test guide
```

### 4. Build for Production
```bash
npm run build
# Check build output for errors/warnings
# Check bundle size (should be reasonable)
```

### 5. Final Manual Testing
```bash
npm run dev  # Start dev server
# Open http://localhost:3000/[locale]/calendar/test-property-id
# Run through QA_MANUAL_TESTING.md checklist
```

### 6. Create Production PR
```bash
gh pr create \
  --title "feat: Epic 43 Phase 2 - Complete Calendar Integration" \
  --body "$(cat <<'EOF'
## Summary
Complete implementation of Epic 43 Phase 2: Calendar + Settings integration with E2E tests and performance optimization.

## What's included
- **Calendar Integration:** Day click → price modal → save flow
- **Settings Cards:** All 5 cards (Preços, Descontos, Disponibilidade, Cancelamentos, Taxas)
- **Pricing Engine:** Exclusive discounts, loyalty cascade, fee calculation
- **Availability Validation:** Min/max nights, advance notice, window-based
- **E2E Tests:** 20+ Cypress test cases covering complete flow
- **Performance Tests:** Page load < 2s, modal open < 200ms, price save < 1s
- **Mobile-First UI:** 90% of traffic is mobile, fully responsive

## Test Coverage
- ✅ 20+ E2E integration tests
- ✅ 10+ Performance tests
- ✅ Manual QA checklist (22 test cases)
- ✅ All unit tests (ReservationPriceCalculator, AvailabilityValidator)

## Mobile Validation
- ✅ iPhone 12 Pro: Full width, touch-friendly, no scroll
- ✅ Pixel 6: Responsive, touch latency optimized
- ✅ iPad: 2-column layout, both calendar + settings visible

## Key Files
- `src/components/calendar/CalendarWithSettings.tsx` - Main wrapper
- `src/components/calendar/CalendarDayClickModal.tsx` - Day click interaction
- `src/app/[locale]/calendar/[propertyId]/integrated.tsx` - Production page
- `src/lib/pricing/reservation-price-calculator.ts` - Pricing engine
- `src/app/[locale]/calendar/[propertyId]/__tests__/integration.e2e.test.ts` - E2E tests

## Ready for
- ✅ Code review
- ✅ QA testing on staging
- ✅ Performance validation
- ✅ Production deployment

## Rollback Plan
If issues arise:
1. Revert to previous calendar page
2. Review error logs
3. Fix and redeploy

🚀 Phase 2 complete. Next: Phase 3 (Real device testing + production monitoring)
EOF
)"
```

### 7. Get PR Approved & Merge
```bash
# Wait for code review
# Fix any feedback
# Merge to main
git checkout main
git pull
git branch -d deploy/epic43-phase2
```

### 8. Deploy to Production
```bash
vercel deploy --prod
# Monitor deployment
# Check build logs
# Verify page loads
```

### 9. Post-Deployment Validation
- [ ] Page loads on production URL
- [ ] Calendar renders correctly
- [ ] Day click opens modal
- [ ] Price save works end-to-end
- [ ] Settings cards display all data
- [ ] Mobile view responsive on real devices
- [ ] No console errors in production
- [ ] Performance metrics acceptable

---

## Rollback Plan

If critical issues found in production:

### Immediate Rollback
```bash
vercel rollback  # Revert to previous deployment
# OR
git revert HEAD  # Create revert commit
vercel deploy --prod  # Redeploy previous version
```

### Investigation
1. Check Vercel logs: `vercel logs`
2. Check Sentry/error monitoring
3. Check performance metrics
4. Review failed QA tests

### Remediation
1. Document issue
2. Fix in new branch
3. Add regression test
4. Redeploy

---

## Post-Deployment Monitoring

### Real User Monitoring
- [ ] Check Google Analytics for traffic
- [ ] Monitor Core Web Vitals (LCP, FID, CLS)
- [ ] Monitor error rates (Sentry/LogRocket)
- [ ] Monitor API response times

### Performance Monitoring
- [ ] Page load time: Target < 2s (P75)
- [ ] Modal open: Target < 200ms
- [ ] Price save: Target < 1s
- [ ] No memory leaks (check heap growth)

### Error Monitoring
- [ ] No 500 errors
- [ ] No API timeout (< 30s)
- [ ] No validation errors (< 5%)
- [ ] User feedback (support tickets)

### Business Metrics
- [ ] Property managers using calendar
- [ ] Average session duration
- [ ] Price update frequency
- [ ] Block dates usage
- [ ] Settings card usage

---

## Sign-off

- [ ] All pre-deployment checks passed
- [ ] Production build successful
- [ ] Post-deployment validation passed
- [ ] No critical issues found
- [ ] Monitoring in place
- [ ] Team notified

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Verified By:** ___________  
**Rollback Decision:** ✅ Keep / ❌ Rollback  
**Notes:** ___________

---

## Phase 3 Preview

After Phase 2 deployment:

1. **Real Device Testing** (2-3 hours)
   - iOS device: iPhone, iPad
   - Android devices: Multiple phones
   - Test all interactions on real hardware
   - Performance measurement on real devices

2. **User Acceptance Testing** (1-2 days)
   - Property managers test calendar
   - Settings cards feedback
   - Price update workflow
   - Block dates workflow

3. **Production Monitoring** (1 week)
   - Error rates
   - Performance metrics
   - User feedback
   - Usage patterns

4. **Optimization** (ongoing)
   - Performance tuning
   - UI/UX improvements
   - New features (drag-and-drop, bulk operations)
