# QA Fix Request — Story 27.3

**Story:** Google My Business Integration (Reviews)  
**Status:** BLOCKING  
**Severity:** MAJOR (2 issues)  
**Assigned to:** @dev (Dex)  
**Date:** 2026-05-16  
**Gate Decision:** FAIL (pending fix)  

---

## Issue Summary

Two acceptance criteria (AC2, AC6) not fully implemented. Story violates functional requirements and must be fixed before re-review.

---

## 🔴 BLOCKER #1: AC2 Source Filtering — Vrbo Missing

**Severity:** MAJOR  
**File:** `src/lib/feeds/review-aggregator.ts`  
**Line:** 36  
**AC:** AC2 — "Filter reviews by source: Booking.com, Airbnb, **Vrbo** only"

### Current State
```typescript
const ALLOWED_SOURCES = ['booking', 'airbnb']  // ❌ Vrbo missing
```

### Problem
- Story explicitly specifies three sources: Booking.com, Airbnb, Vrbo
- Implementation only allows booking + airbnb
- Any Vrbo review is silently filtered out and lost
- **Violates AC2 specification**

### Fix Required

**Step 1:** Update ALLOWED_SOURCES in `/src/lib/feeds/review-aggregator.ts` line 36:
```typescript
const ALLOWED_SOURCES = ['booking', 'airbnb', 'vrbo']  // ✅ Add vrbo
```

**Step 2:** Add test case in `/src/__tests__/feeds/google-feed-reviews.test.ts`:
```typescript
it('should include vrbo in allowed sources', () => {
  const mockReviews = [
    { rating: 4.5, source: 'booking' },
    { rating: 4.3, source: 'airbnb' },
    { rating: 4.7, source: 'vrbo' },  // ✅ Should pass
    { rating: 4.0, source: 'google' }, // Should fail
  ]
  
  const allowedSources = ['booking', 'airbnb', 'vrbo']
  const filtered = mockReviews.filter((r) => allowedSources.includes(r.source))
  expect(filtered).toHaveLength(3)
  expect(filtered.some((r) => r.source === 'vrbo')).toBe(true)
})
```

**Step 3:** Verify tests pass:
```bash
npm test -- src/__tests__/feeds/google-feed-reviews.test.ts
# Expected: 15 tests passing (14 existing + 1 new Vrbo test)
```

---

## 🟡 MAJOR #2: AC6 Incomplete — Updated_since Only Filters Properties

**Severity:** MAJOR  
**File:** Review aggregation query logic  
**AC:** AC6 — "Feed updates incrementally when **new reviews** are ingested"

### Current State
- `updated_since` parameter filters by property `updated_at` timestamp
- New reviews added to existing properties don't trigger feed update
- Feed won't show newly-added reviews if the property itself hasn't been modified

### Problem
- Story intent: "Feed updates incrementally when new reviews are ingested"
- Current behavior: Feed only updates when properties change
- **Incomplete implementation of AC6**

### Fix Options

**RECOMMENDED: Option A (Simple Documentation)**
Update story Dev Notes to clarify the actual behavior:

1. Edit `/docs/stories/27.3.story.md` Dev Notes section:
```markdown
**AC6 Implementation Note:**
- `updated_since` filters by property update timestamp (from 27.2)
- Reviews are freshly fetched for each property returned by the feed
- New reviews appear on next feed generation for that property
- Real-time review sync is handled by separate process (out of scope per Story Notes)
```

2. Update test comment in `/src/__tests__/feeds/google-feed-reviews.test.ts`:
```typescript
it('should use updated_since for property filtering (reviews fetched fresh per property)', () => {
  const since = '2026-05-01T00:00:00Z'
  const params = new URLSearchParams(`updated_since=${since}`)
  expect(params.get('updated_since')).toBe(since)
  // Note: reviews are freshly fetched for each property returned
  // New reviews appear on next feed generation if property is included
})
```

**ALTERNATIVE: Option B (Full Implementation)**
If strict "new reviews trigger feed update" is required:

Modify `aggregatePropertyReviews()` signature:
```typescript
export async function aggregatePropertyReviews(
  propertyId: string,
  sinceDate?: string  // Add optional date filter
): Promise<PropertyReviewsAggregate | null> {
  // ... existing code ...
  let query = supabase
    .from('property_reviews')
    .select('...')
    .eq('property_id', propertyId)
    .gte('rating', MIN_RATING)
    .in('source', ALLOWED_SOURCES)
  
  if (sinceDate) {
    query = query.gte('review_date', sinceDate)  // Filter by review date
  }
  
  return query.limit(5).order('review_date', { ascending: false })
}
```

Then pass `updated_since` through feed generator to review queries.

### Recommendation
**Implement Option A** — simpler, aligns with Story Notes that real-time sync is out of scope. Document the limitation clearly.

---

## Validation Checklist

**Before re-submission, verify:**

- [ ] Add 'vrbo' to ALLOWED_SOURCES in review-aggregator.ts
- [ ] Add Vrbo test case to google-feed-reviews.test.ts
- [ ] Run tests: `npm test -- src/__tests__/feeds/google-feed-reviews.test.ts`
- [ ] Verify: **15 tests passing** (was 14)
- [ ] Run linting: `npm run lint` (0 errors)
- [ ] Document AC6 behavior in story Dev Notes
- [ ] Run CodeRabbit: `coderabbit --prompt-only -t uncommitted`
- [ ] Verify CodeRabbit shows 0 CRITICAL/MAJOR issues before resubmit

---

## Re-Submission Instructions

Once all fixes are complete:

1. **Commit changes:**
```bash
git add src/lib/feeds/review-aggregator.ts \
        src/__tests__/feeds/google-feed-reviews.test.ts \
        docs/stories/27.3.story.md
git commit -m "fix(story-27.3): add vrbo to allowed sources, clarify AC6 behavior

- Add 'vrbo' to ALLOWED_SOURCES (AC2 compliance)
- Add test case for vrbo filtering
- Document AC6 limitation: updated_since filters properties, not reviews
- 15 tests passing, CodeRabbit clean"
```

2. **Run full validation:**
```bash
npm test -- src/__tests__/feeds/google-feed-reviews.test.ts
npm run lint
coderabbit --prompt-only -t uncommitted
```

3. **Notify QA:** Story 27.3 ready for re-review

---

## Timeline & Effort

- **Estimated Time:** 15-20 minutes
- **Complexity:** Simple (1 constant change + 1 test + 1 doc update)
- **Blocking Release:** YES — AC2 must be fixed

---

**Created by:** Quinn (QA Agent)  
**Date:** 2026-05-16  
**Status:** Awaiting @dev implementation  
**Re-review:** Scheduled after fixes submitted
