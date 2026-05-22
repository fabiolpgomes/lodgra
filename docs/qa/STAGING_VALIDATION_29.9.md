# Staging Validation Plan — Story 29.9 (Photo Upload Enhancements)

**Status:** Scheduled for 2026-05-23 to 2026-05-24  
**Story:** 29.9 — Photo Upload Enhancements (Realtime, HEIC, LCP Optimization)  
**Production Deployed:** 2026-05-22  
**Agent:** @qa (Quinn)

---

## Validation Scope

This document outlines the post-merge validation checklist for deferred acceptance criteria (AC1.6, AC1.7, AC2.7, AC3.5/AC3.6) that require integration testing, manual testing, and Lighthouse metrics collection.

---

## Tier 2: Integration Tests (Environment-Dependent)

### AC1.6 — Photos appear within 1 second of upload

**Test Type:** Integration / Manual Performance  
**Environment:** Staging  
**Duration:** 10 minutes

**Steps:**
```
1. Open staging → Cleaner Portal (Manager Dashboard)
2. Open second browser → Uploader (Cleaner view)
3. Upload photo from Cleaner view
4. Observe Manager Dashboard
5. Verify photo appears in gallery within 1s (check browser console Network tab for latency)
```

**Expected Result:**
- Photo visible in manager gallery < 1000ms from upload completion
- Supabase Realtime subscription active (check console logs: "✅ Realtime connected")
- No polling fallback triggered (check for "⚠️ Realtime disconnected" message)

**Pass Criteria:**
- ✅ First photo appears < 1s
- ✅ Realtime status shows SUBSCRIBED
- ✅ Console clean (no errors)

---

### AC1.7 — Concurrent multi-user uploads work correctly

**Test Type:** Integration / Concurrency  
**Environment:** Staging  
**Duration:** 15 minutes

**Setup:**
- Browser A: Manager Dashboard
- Browser B: Uploader (Cleaner 1)
- Browser C: Uploader (Cleaner 2)
- Browser D: Uploader (Cleaner 3)

**Steps:**
```
1. All browsers open to same cleaning task
2. Browser B: Upload photo #1
3. Browser C: Upload photo #2 (while B's upload in progress)
4. Browser D: Upload photo #3 (while B and C in progress)
5. Observe Browser A (Manager)
```

**Expected Result:**
- All 3 photos appear in Manager gallery
- Order preserved (photo 1, 2, 3 in time-sorted order)
- No duplicates or missing photos
- Realtime handles concurrent subscriptions without conflicts

**Pass Criteria:**
- ✅ All 3 photos appear in correct order
- ✅ No duplicates
- ✅ < 2s latency per upload
- ✅ No console errors

---

### AC2.7 — iOS HEIC upload testing

**Test Type:** Manual Device Test  
**Environment:** iOS device + staging  
**Duration:** 20 minutes  
**Device:** iPhone (HEIC capture native format)

**Prerequisites:**
- iOS device with camera
- Access to staging environment (WiFi or 4G)
- Lodgra app/web access

**Steps:**
```
1. Open Lodgra on iOS device → Cleaner Portal
2. Navigate to photo upload
3. Open Camera Roll
4. Select a photo in HEIC format (native iPhone format)
5. Upload via Lodgra uploader
6. Switch to Manager Dashboard (Browser)
7. Verify photo displays
```

**Expected Result:**
- HEIC file accepted (no rejection message)
- HEIC converted to JPEG before upload (heic2any library)
- Photo quality preserved (≥80% quality setting)
- Manager sees photo without format issues
- No console errors related to HEIC conversion

**Pass Criteria:**
- ✅ iOS photo uploads without error
- ✅ HEIC converted successfully
- ✅ Manager sees photo in gallery
- ✅ Image quality acceptable (no visible degradation)
- ✅ Console clean

---

## Tier 3: Performance Metrics (Lighthouse)

### AC3.5 — LCP score < 2.5s

**Test Type:** Lighthouse Audit  
**Environment:** Staging  
**Duration:** 10 minutes

**Setup:**
```bash
# Run Lighthouse on staging cleaning-photos page
npx lighthouse https://staging.lodgra.io/cleaner/tasks/[task-id]/photos --view
```

**Expected Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s ✅
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

**Why These Matter:**
- LCP: Image optimization (blur placeholder + Next.js Image component) should improve LCP
- FID: Interaction responsiveness
- CLS: Layout stability during image load

**Pass Criteria:**
- ✅ LCP < 2.5s (target met)
- ✅ No visual layout shifts
- ✅ Images load progressively (blur → full resolution)

---

### AC3.6 — Image lazy loading behavior

**Test Type:** Manual Browser DevTools  
**Environment:** Staging  
**Duration:** 10 minutes

**Steps:**
```
1. Open staging → Cleaning Photos Gallery
2. Open Browser DevTools → Network tab
3. Filter by image requests
4. Scroll through gallery slowly
5. Observe image loading pattern
```

**Expected Pattern:**
- Visible images load immediately
- Off-screen images load on scroll (not pre-loaded)
- Network waterfall shows staggered image loads
- No "lazy load" images load before scroll

**Pass Criteria:**
- ✅ Images in viewport load first (priority)
- ✅ Off-screen images defer until scroll
- ✅ No wasted bandwidth on off-screen images
- ✅ Performance smooth (no jank during scroll)

---

## Validation Schedule

| Date | Task | Owner | Status |
|------|------|-------|--------|
| 2026-05-23 | AC1.6 + AC1.7 (Realtime latency & concurrency) | @qa | Scheduled |
| 2026-05-23 | AC3.5 + AC3.6 (Lighthouse + lazy loading) | @qa | Scheduled |
| 2026-05-24 | AC2.7 (iOS HEIC upload) | @qa | Scheduled |
| 2026-05-24 | Compile results → QA Results section | @qa | Pending |

---

## Results Section (to be filled during validation)

```yaml
qa_results_staging:
  ac1_6_realtime_latency:
    passed: pending
    latency_ms: pending
    notes: pending

  ac1_7_concurrent_uploads:
    passed: pending
    max_concurrent: pending
    notes: pending

  ac2_7_ios_heic:
    passed: pending
    device: pending
    heic_conversion_quality: pending
    notes: pending

  ac3_5_lighthouse_lcp:
    passed: pending
    lcp_score_s: pending
    fid_score_ms: pending
    cls_score: pending
    notes: pending

  ac3_6_lazy_loading:
    passed: pending
    pattern_observed: pending
    notes: pending

summary:
  all_passed: pending
  blockers: pending
  approved_for_production_use: pending
```

---

## Escalation Path

If any AC fails:
1. Document failure details in Results section
2. Create Story 29.10 (Follow-up: AC fixes + optimization)
3. Return code to @dev for fixes
4. Re-validate in staging

---

## Production Monitoring (Post-Merge)

Once staging validation passes and production is live:

**Monitor Realtime Performance:**
- Server logs: Connection lifecycle (join/leave events)
- Client logs: Photo load time (from API call to render)
- Alert threshold: > 2s latency spike

**Monitor User Feedback:**
- HEIC support: Any issues reported by iOS users
- Image quality: Any reports of degraded images
- Performance: Any reports of slow gallery loads

---

*Validation Plan created: 2026-05-22*  
*Expected completion: 2026-05-24*
