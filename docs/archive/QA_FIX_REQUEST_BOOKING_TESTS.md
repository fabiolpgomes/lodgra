# QA Fix Request: Booking Route Tests

**Report Date:** 2026-03-27
**From:** @qa (Quinn) - Test Architect
**To:** @dev (Dex) - Developer
**Priority:** MEDIUM
**Category:** Test Mocking Update
**Sprint:** Next

---

## Issue Summary

2 tests failing in `src/__tests__/api/public/bookings/route.test.ts` due to **incomplete mock setup** for commission calculation feature added in Story 6.1 Task 2.

### Failing Tests
1. ✕ `returns 200 with checkout_url on successful booking`
2. ✕ `uses dynamic pricing from getPriceForRangePublic for Stripe amount`

### Error
```
TypeError: Cannot read properties of undefined (reading 'eq')
  at src/app/api/bookings/route.ts:222:13
```

---

## Root Cause

Story 6.1 Task 2 added commission calculation to booking creation flow:

```typescript
// src/app/api/bookings/route.ts:220-225
const { data: org, error: orgError } = await adminClient
  .from('organizations')
  .select('plan')
  .eq('id', property.organization_id)
  .single()
```

The test mocks `adminClient` but **don't include the `.eq()` method chain** for the organization query. Tests mock only the initial `.from()` call.

---

## What Needs to Be Fixed

**File:** `src/__tests__/api/public/bookings/route.test.ts`

**Lines:** ~220-225 (in test setup/mocks)

**Action:** Update mock for `adminClient` to include organization query mock

### Expected Mock Chain
```typescript
// Before (incomplete):
.from('organizations') // missing .select() → .eq() → .single()

// After (complete):
.from('organizations')
  .select('plan')
  .eq('id', expect.any(String))
  .single()
  .resolves({ data: { plan: 'professional' }, error: null })
```

---

## Acceptance Criteria

- [ ] Both failing tests now PASS
- [ ] Mock includes full `.from().select().eq().single()` chain
- [ ] Organization plan returned in mock (e.g., 'professional')
- [ ] All other booking tests still PASS (regression test)
- [ ] No linting errors introduced

---

## Implementation Notes

**Why This Matters:**
- Tests were written before commission calculation was added
- Mock setup incomplete when feature was integrated
- Tests now fail because mock doesn't handle new code path

**Implementation Strategy:**
1. Find the test setup where `adminClient` is mocked
2. Look for `.from('organizations')` mock
3. Extend mock chain to handle `.select('plan').eq(...).single()`
4. Return realistic plan data (e.g., `{ plan: 'professional' }`)
5. Run tests to verify fix

**Similar Patterns in Codebase:**
- Check how other tests mock Supabase query chains
- Look for `.select().eq().single()` patterns in other test files
- Ensure consistency with existing mock patterns

---

## Testing Verification

**Before fix:**
```bash
npm test -- src/__tests__/api/public/bookings/route.test.ts
# Result: 2 failed, 9 passed
```

**After fix:**
```bash
npm test -- src/__tests__/api/public/bookings/route.test.ts
# Expected: 11 passed (0 failed)
```

---

## Context

This is a **pre-existing test issue** (not related to Story 6.1 scope). Story 6.1 QA review found it during comprehensive testing.

**Not a blocker for Story 6.1 deployment** - commission functionality works correctly, only test mocking needs update.

---

## Questions?

- Check test file for mock setup patterns
- Reference: `src/app/api/bookings/route.ts` lines 220-225
- Similar org queries in codebase might have good mock examples

**Ready to implement?** 🛠️

— Quinn, guardião da qualidade 🛡️
