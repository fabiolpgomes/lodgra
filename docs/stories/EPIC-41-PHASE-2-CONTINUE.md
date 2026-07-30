# Epic 41 Phase 2 - Continuação (Próxima Sessão)

**Última atualização:** 2026-07-30  
**Status:** PAUSED (98.88% complete, 30 tests remaining)  
**Assignee:** @dev

---

## Current Status

| Métrica | Valor |
|---------|-------|
| **Tests Passing** | 2722/2753 (98.88%) |
| **Tests Fixed (This Session)** | 4 (Booking Webhooks Phase 1) |
| **Tests Remaining** | 30 (1.12%) |
| **Build Status** | ✅ Passing |
| **TypeCheck** | ✅ Passing |
| **Lint** | ✅ Passing |

---

## What Was Fixed (This Session)

### Booking Webhooks - Phase 1 ✅ COMPLETE (9/9 tests)
- Fixed `request.text()` and `request.json()` mocking in test-request.ts
- Fixed webhook signature validation (base64 encoding mismatch)
- Added payload validation (empty body, invalid JSON, missing event_id)
- Fixed HTTP status codes (400 for client errors, 500 for server errors)
- Added UUID generation for request_id
- Mocked webhookManager.validateBookingSignature correctly
- All tests passing

---

## Remaining 30 Failing Tests (Priority Order)

### Group 1: Booking Integration Tests (14 tests) — MEDIUM PRIORITY
**File:** `src/lib/integrations/booking/__tests__/integration*.test.ts`

**Problem:** Mock for Supabase `channel_listings` table with joins
- Tests expect data from channel_listings with JOIN to channels table
- Current mock returns hardcoded data, doesn't handle .eq() conditions properly
- Mock structure: `.select().eq().eq().single()` not working correctly

**Quick Fix:**
```typescript
// Instead of complex mock, return static data that satisfies queries
const channelListingMock = {
  id: 'channel_listing_123',
  channel_id: 'ch_123',
  organization_id: 'org_123',
  property_listing_id: 'listing_123',
  channels: { name: 'booking' }
}
```

**Estimated Fix Time:** 45 min

---

### Group 2: iCal Route Tests (5 tests) — MEDIUM PRIORITY
**File:** `src/__tests__/api/ical/route.test.ts`

**Problem:** Complex Supabase mock chaining
- Handler uses multiple queries: properties, listings, reservations, blocks, pricing_rules
- Mock needs to handle: .select().eq().order().single()
- Each query has different return data

**Current Approach Issue:** createAdminClient() must be async, not sync

**Quick Fix:**
- Use a universal mock builder that handles all table queries
- Override specific table returns in beforeEach

**Estimated Fix Time:** 60 min

---

### Group 3: Availability Route Tests (4 tests) — MEDIUM PRIORITY
**File:** `src/__tests__/api/public/properties/availability/route.test.ts`

**Problem:** Chainable mock causing issues
- Current error: Cannot access 'query' before initialization
- Mock structure has circular reference issue

**Simple Fix:**
```typescript
const createChainQuery = (data) => ({
  select: jest.fn().mockReturnValue(this),
  eq: jest.fn().mockReturnValue(this),
  lte: jest.fn().mockReturnValue(this),
  gte: jest.fn().mockResolvedValue({ data, error: null })
})
```

**Estimated Fix Time:** 30 min

---

### Group 4: Data Export Tests (4 tests) — LOW PRIORITY
**File:** `src/__tests__/api/data-export/route.test.ts`

**Problem:** Likely similar to iCal/Availability
- Export formatting with pricing changes
- CSV/JSON schema changes

**Estimated Fix Time:** 30 min

---

### Group 5: E2E Price Preview Tests (3 tests) — LOW PRIORITY
**File:** `src/__tests__/e2e/story-41-5-price-preview.test.tsx`

**Estimated Fix Time:** 30 min

---

## Recommended Debug Strategy for Next Session

### Session Plan (2-3 hours estimated)

**Hour 1: Booking Integration (14 tests)**
1. Simplify channel_listings mock
2. Test with static organization data
3. Run: `npm test -- integrations/booking --no-coverage`
4. Fix remaining .neq() and .order() issues
5. Commit: `fix: resolve booking integration test mocks [Epic 41 Phase 2]`

**Hour 2: iCal + Availability (9 tests)**
1. Fix createAdminClient mock to be async
2. Create universal query builder
3. Test and adjust for specific table needs
4. Commit: `fix: resolve iCal and availability route tests [Epic 41 Phase 2]`

**Hour 3: Data Export + E2E (7 tests)**
1. Apply same patterns from Hour 2
2. Test edge cases
3. Final validation
4. Commit: `fix: resolve remaining route and E2E tests [Epic 41 Phase 2]`

**Final:** Run `npm test` → verify 2753/2753 passing → Deploy v4.2.0

---

## Key Learnings from This Session

1. **Mock Chainables:** Return `this` or use object ref for chainable methods
2. **Async Mocks:** Use `mockResolvedValue()` for async functions like `createAdminClient()`
3. **Signature Validation:** Booking.com uses base64, not hex for HMAC signatures
4. **Request Mocking:** Next.js routes expect `request.text()` and `request.json()` as async methods
5. **Table Joins:** Supabase mocks need to handle JOINs in select() - use nested objects

---

## Git Status

**Current Branch:** main  
**Last Commit:** fix: resolve booking webhook tests, improve availability mocks  
**Ready to Deploy:** v4.2.0 (after all tests pass)

---

## Testing Commands

```bash
# Test specific suites
npm test -- integration-simplified --no-coverage
npm test -- integrations/booking --no-coverage
npm test -- ical/route --no-coverage
npm test -- availability --no-coverage

# Full test
npm test 2>&1 | tail -20
```

---

**Status: PAUSED FOR NIGHT, RESUMING IN NEXT SESSION**

All context preserved. Ready to continue Phase 2 → Production Deployment.
