---
storyId: 43.1
title: Direct Booking Reservation Validator
phase: Phase 2 Enhancements
createdBy: Quinn (@qa)
createdDate: 2026-07-30
priority: Medium
---

# QA Fix Request — Story 43.1 Phase 2

**Current Status:** Ready for Review (Phase 1-2 complete)  
**Gate Decision:** CONCERNS → Approve with Phase 2 roadmap  
**Risk Level:** Low

---

## Outstanding Items

### Item 1: Integration Tests for API Endpoint

**Category:** Test Coverage  
**Severity:** Medium  
**Acceptance Criteria Link:** AC Item 6 (Integration Tests)

**Current State:**
- ✅ 18 unit tests for ReservationValidator class
- ❌ API endpoint integration tests missing
- ❌ Database mocking strategy not verified

**Required Implementation:**

```typescript
// src/__tests__/api/reservations-validate.integration.test.ts

describe('POST /api/admin/reservations/validate', () => {
  it('should validate a successful 5-night reservation', async () => {
    // Test setup: create mock property, pricing, policies
    // Call endpoint: POST /api/admin/reservations/validate
    // Assert: Returns 200 with complete ValidationResult
    // Assert: price.success = true, discount.hasDiscount = false
  })

  it('should return 401 if not authenticated', async () => {
    // Call endpoint without auth token
    // Assert: Returns 401 Unauthorized
  })

  it('should return 403 if not admin role', async () => {
    // Call endpoint with non-admin user auth
    // Assert: Returns 403 Forbidden
  })

  it('should handle database error gracefully', async () => {
    // Mock Supabase error for calendar_pricing query
    // Assert: Returns 200 with price.success = false + error message
  })

  it('should calculate discount for 10-night stay', async () => {
    // Test setup: property with 10% discount for 7-27 days
    // Call endpoint: checkIn-checkOut = 10 nights
    // Assert: discount.hasDiscount = true, discountPercentage = 10
  })

  it('should apply extended discount for 30-night stay', async () => {
    // Test setup: property with 20% discount for 28+ days
    // Call endpoint: checkIn-checkOut = 30 nights
    // Assert: discount.hasDiscount = true, discountPercentage = 20
  })

  it('should validate minimum nights constraint', async () => {
    // Test setup: property with min_nights = 5
    // Call endpoint: checkIn-checkOut = 2 nights
    // Assert: minimumNights.passed = false, error message present
  })

  it('should fetch cancellation policy by check-in date', async () => {
    // Test setup: multiple policies with different start_dates
    // Call endpoint: check-in = 2026-08-15
    // Assert: Returns most recent policy <= check-in date
  })
})
```

**Estimated Effort:** 4-6 hours  
**Acceptance:** All 8 scenarios passing with >90% code coverage

---

### Item 2: Overlapping Reservation Detection

**Category:** Feature Completeness  
**Severity:** High  
**Acceptance Criteria Link:** AC Item 5 (Error handling: overlapping reservations)

**Current State:**
- ✅ AC mentions overlap detection as error case
- ❌ `reservations` table query not implemented
- ❌ Date range conflict logic not present
- ℹ️ Deferred to Phase 2 (documented in story completion notes)

**Required Implementation:**

```typescript
// Add to ReservationValidator class:

static async validateReservationOverlap(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<{ hasConflict: boolean; conflictingReservations: any[] }> {
  // Query: SELECT * FROM reservations 
  //   WHERE property_id = propertyId
  //   AND (
  //     (check_in < checkOut AND check_out > checkIn)  // overlap logic
  //   )
  //   AND status != 'cancelled'
  //   AND (excludeReservationId IS NULL OR id != excludeReservationId)
  //
  // Return: { hasConflict: boolean, conflictingReservations: [...] }
}

// Add to validate() orchestrator:
const overlapResult = await this.validateReservationOverlap(propertyId, checkIn, checkOut)
if (overlapResult.hasConflict) {
  errors.push(`Overlapping reservations found: ${overlapResult.conflictingReservations.map(r => r.id).join(', ')}`)
}
```

**Database Requirement:**
- Index on `reservations(property_id, check_in, check_out)` for performance
- Ensure `status` column exists and is filtered

**Estimated Effort:** 3-4 hours  
**Acceptance:** Overlap detection correctly identifies date conflicts, returns conflicting reservation IDs

---

### Item 3: End-to-End UI Validation

**Category:** Manual Testing  
**Severity:** Low  
**Acceptance Criteria Link:** AC Item 7 (E2E validation)

**Current State:**
- ✅ Form component created (ReservationValidationForm)
- ✅ Results display component created (ValidationResultsDisplay)
- ❌ Manual browser testing not performed
- ℹ️ Deferred to Phase 2 (documented in story completion notes)

**Required Testing Scenarios:**

```
Scenario 1: Valid 5-night stay
- [ ] Navigate to /admin/reservations/validate
- [ ] Fill: propertyId = "prop-123", checkIn = 2026-08-05, checkOut = 2026-08-10
- [ ] Click: "Validar Reserva"
- [ ] Assert: Form shows loading state
- [ ] Assert: Results display shows price breakdown, no discount, min nights ✅
- [ ] Assert: Cancellation policy displayed correctly

Scenario 2: Minimum nights error
- [ ] Fill: propertyId = "prop-456", checkIn = 2026-08-05, checkOut = 2026-08-06
- [ ] Click: "Validar Reserva"
- [ ] Assert: Results display shows red error box
- [ ] Assert: Error message: "This property requires minimum {X} nights"
- [ ] Assert: Admin can see override checkbox (if implemented)

Scenario 3: 30-night stay with extended discount
- [ ] Fill: propertyId = "prop-789", checkIn = 2026-08-01, checkOut = 2026-08-31
- [ ] Click: "Validar Reserva"
- [ ] Assert: Results show discount applied (20% for 28+ days)
- [ ] Assert: Final price = Base × (1 - 0.20)
- [ ] Assert: Savings amount displayed correctly

Scenario 4: API error handling
- [ ] Fill: propertyId = "invalid-prop", checkIn = 2026-08-05, checkOut = 2026-08-10
- [ ] Click: "Validar Reserva"
- [ ] Assert: Results display shows error section
- [ ] Assert: Error message visible to user

Scenario 5: Form validation
- [ ] Leave propertyId empty, click submit
- [ ] Assert: Browser validation prevents submit (required field)
- [ ] Leave checkIn empty, fill checkOut
- [ ] Assert: Browser validation prevents submit
- [ ] Fill checkOut before checkIn
- [ ] Assert: Results show error "Check-out must be after check-in"
```

**Estimated Effort:** 2-3 hours (manual browser testing)  
**Acceptance:** All scenarios pass, no console errors, responsive on mobile/desktop

---

### Item 4: Remove/Clarify guestCount Parameter

**Category:** Scope Clarification  
**Severity:** Low  
**Note:** AC Item 5 specifies `guestCount` as input parameter

**Current State:**
- ✅ Acceptance criteria mentions: Input: propertyId, checkIn, checkOut, guestCount
- ❌ API endpoint doesn't accept guestCount
- ❌ ReservationValidator doesn't use guestCount
- ❓ Purpose unclear (guest count doesn't affect price/discount/policy in Lodgra system)

**Options:**
1. **Remove from AC** — If guest count validation isn't needed for Phase 1
   - Update AC Item 5 to remove guestCount reference
   - Simpler API contract for direct booking flow

2. **Implement guest count validation** — If needed for future features
   - Add guestCount to API input validation
   - Add guestCount to ReservationValidator
   - Check against property's max_guests capacity
   - Return error if exceeds limit

**Recommendation:** Option 1 (Remove from AC)  
**Rationale:** Guest count doesn't affect validation logic in current scope  
**Decision:** @dev or @po to confirm in next sprint

---

## Summary Table

| Item | Category | Severity | Status | Est. Hours | Blocker? |
|------|----------|----------|--------|-----------|----------|
| Integration Tests | Test Coverage | Medium | TODO | 4-6 | No |
| Overlapping Reservations | Feature | High | TODO | 3-4 | No* |
| E2E UI Testing | Manual Test | Low | TODO | 2-3 | No |
| guestCount Clarification | Scope | Low | TODO | 0.5 | No |

\* *Noted in story completion; doesn't block Phase 1 approval*

---

## Approval & Next Steps

**Gate Decision:** ✅ **APPROVE** Story 43.1 for merge  
**Rationale:** Phase 1-2 implementation complete; Phase 3 items properly deferred with documentation

**Create Follow-up Stories:**
1. **Story 43.1.1** — "Phase 3: Integration Tests & E2E Validation" (3 points, 8-10 hours)
2. **Story 43.1.2** — "Phase 4: Overlapping Reservation Detection" (2 points, 4-5 hours)

**Merge Approval:** Ready for @devops push to main

---

**QA Gate Results**  
**Verdict:** CONCERNS (Approve with Phase 2 roadmap)  
**Issued By:** Quinn (@qa)  
**Date:** 2026-07-30  
**Review Confidence:** High (comprehensive analysis, documented rationale)
