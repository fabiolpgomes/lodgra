# 26 Remaining Tests - Exact Fix Guide

**Status:** 2726/2753 passing (99.02%)  
**Remaining:** 26 tests across 4 suites  
**Created:** 2026-07-30  

---

## Suite 1: Booking Integration (14 tests)
**Files:**
- `src/lib/integrations/booking/__tests__/integration-simplified.test.ts` (7 tests)
- `src/lib/integrations/booking/__tests__/integration.test.ts` (7 tests)

### Root Cause
The `syncBookingReservation()` function makes complex Supabase queries with:
- `.select('id, channel_id, ..., channels!inner(name)').eq().eq().single()` - nested JOINs
- Multiple conditional queries via `Promise.all()`
- Mock chainable return values not matching actual Supabase API

### Solution Approach
1. **Option A (Recommended):** Replace tests with simpler unit tests that mock Supabase at a higher level
   - Mock individual query results instead of chaining behavior
   - Use `jest.fn().mockResolvedValue()` for each query type
   - Create separate test file: `reservation-sync-unit.test.ts`

2. **Option B:** Fix existing mocks by implementing proper chainable mock
   - Create a universal mock that tracks table name through chain
   - Return appropriate data based on final `.single()` or `.order()` call
   - Use the `src/__tests__/mocks/supabase-admin-mock.ts` helper

### Exact Steps
```bash
# Use Option B - Fix with universal mock
npm test -- integration-simplified --no-coverage

# Expected: 7 tests should pass
# If not: Debug mock's .single() return based on table parameter
```

**Time estimate:** 45 min

---

## Suite 2: iCal Routes (5 tests)
**File:** `src/__tests__/api/ical/route.test.ts`

### Root Cause
The route handler uses `createAdminClient()` (returns sync object) but test mocks it as async.
Line in handler:
```typescript
const adminClient = createAdminClient()  // Expects sync
```

But mock does:
```typescript
mockCreateAdminClient.mockResolvedValue()  // Returns Promise
```

### Solution
```typescript
// Change this:
mockCreateAdminClient.mockResolvedValue(mockSupabaseClient as never)

// To this:
mockCreateAdminClient.mockReturnValue(mockSupabaseClient as never)
```

**File:** `src/__tests__/api/ical/route.test.ts:45`

**Time estimate:** 5 min

---

## Suite 3: Data Export (1 test)
**File:** `src/app/api/user/data-export/__tests__/route.test.ts`

### Root Cause
Test mocks individual query chains but route handler uses `Promise.all()` with conditional queries:
```typescript
[propertiesResult, reservationsResult, ...] = await Promise.all([
  organizationId ? adminClient.from('properties').select(...) : Promise.resolve({ data: [] }),
  organizationId ? adminClient.from('reservations').select(...) : Promise.resolve({ data: [] }),
  ...
])
```

Chainable mock returns `Promise` on `.single()` but route expects direct `.then()` support.

### Solution
Make chainable mock implement `Thenable` interface:
```typescript
const query: any = {
  then: async (resolve) => resolve({ data: resolveData, error: null }),
  select: jest.fn().mockReturnThis(),
  // ... other methods
}
```

**File:** `src/app/api/user/data-export/__tests__/route.test.ts:40`

**Time estimate:** 10 min

---

## Suite 4: E2E Price Preview (3 tests)
**File:** `src/__tests__/e2e/story-41-5-price-preview.test.tsx`

### Root Cause
Unknown - need to run and debug:
```bash
npm test -- story-41-5-price-preview --no-coverage
```

### Investigation Steps
1. See what specific assertions fail
2. Check if it's component rendering, API mocking, or state management
3. Likely causes:
   - Mock of `calculatePrice` API endpoint
   - Mock of React component hooks (useState, useEffect)
   - Redux/Context store initialization

**Time estimate:** 30 min (investigation) + 15 min (fix)

---

## iCal Route Details (5 tests)

### Current Error
```
TypeError: Cannot access 'query' before initialization
```

### Fix Details
1. Line 45: Change `mockResolvedValue` → `mockReturnValue`
2. Line 71: Update mock for properties table to return proper data
3. Lines 99-186: Verify all test mocks use direct `.single()` returns not async `.order()`

### Tests Expected to Pass
```
✓ should return valid .ics file with correct token
✓ should return 401 when token is invalid
✓ should return 401 when token is missing from query params
✓ should return 404 when property does not exist  
✓ should return empty calendar when property has no listings
✓ should return 500 when database query fails
✓ should generate calendar with multiple reservations
✓ should set correct Content-Disposition header for download
```

---

## Universal Mock Helper
Created: `src/__tests__/mocks/supabase-admin-mock.ts`

Usage:
```typescript
import { createSupabaseAdminMock } from '@/__tests__/mocks/supabase-admin-mock'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => createSupabaseAdminMock({
    channel_listings: { id: '123', organization_id: 'org_1' },
    organizations: { id: 'org_1', plan: 'starter' },
  })),
}))
```

---

## Summary Table

| Suite | Tests | Time | Difficulty | Status |
|-------|-------|------|-----------|--------|
| Booking Integration | 14 | 45 min | HIGH | Needs mock redesign |
| iCal Routes | 5 | 15 min | MEDIUM | Simple mock fix |
| Data Export | 1 | 10 min | MEDIUM | Thenable interface |
| E2E Price Preview | 3 | 45 min | HIGH | Unknown cause |
| **Total** | **26** | **2h 10m** | - | - |

---

## Next Session Action Plan

1. **Start with iCal (5 tests, 15 min)** - Highest ROI
   - Change `mockResolvedValue` → `mockReturnValue`
   - Verify all chainable mocks return `this`

2. **Move to Data Export (1 test, 10 min)** - Quick win
   - Add `Thenable` interface to mock
   - Test and verify

3. **Debug E2E (3 tests, 45 min)** - Unknown cause
   - Run tests to see specific failures
   - Check React/Redux mocking

4. **Finally tackle Booking Integration (14 tests, 45 min)** - Most complex
   - Consider if integration tests add value vs complexity
   - May want to split into simpler unit tests

---

**Estimated time to 100%:** 2-2.5 hours  
**Confidence:** 85% (Booking Integration may need redesign)

