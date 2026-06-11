# Story: User Creation Flow Comprehensive Test Suite
**Epic:** Architecture Cleanup — Phase 2  
**ID:** PHASE-2-TESTING | **Priority:** MEDIUM | **Status:** InProgress  
**Date Created:** 2026-06-11 | **Estimate:** 9-14 hours | **Phase 1 Duration:** 4.5 hours

---

## 📋 Description

**Problem:**
ARCH-001 audit revealed critical testing gaps:
- No E2E tests for user creation flows
- No dedicated plan limit validation tests
- No integration tests for RLS organization isolation
- No comprehensive role validation test suite

Without these tests:
- Risk of regressions in complex flows
- Difficult to refactor with confidence
- No regression protection for future changes

**Solution:**
Create comprehensive test suite covering all 4 scenarios and critical validations.

**Business Value:**
- ✅ Protects against regressions
- ✅ Enables confident refactoring (AC14, AC12)
- ✅ Documents expected behavior
- ✅ Catches edge cases early
- ✅ Supports continuous deployment

---

## 🎯 Acceptance Criteria

### E2E Tests (Scenario Coverage)
- [x] **AC1:** E2E test for Stripe webhook → user creation → login flow
- [x] **AC2:** E2E test for self-signup → password change → dashboard access
- [ ] **AC3:** E2E test for admin creates user → invite email → new user login
- [x] **AC4:** All E2E tests use real database (not mocked)

### Unit Tests (Plan Limits)
- [x] **AC5:** Test `getPlanLimits('essencial')` returns `maxUsers: 1`
- [x] **AC6:** Test `getPlanLimits('expansao')` returns `maxUsers: 5`
- [x] **AC7:** Test `getPlanLimits('premium')` returns `maxUsers: 10+`
- [x] **AC8:** Test API rejects user creation when limit reached

### Integration Tests (RLS Isolation)
- [ ] **AC9:** Test admin of org A cannot read users from org B
- [ ] **AC10:** Test user cannot modify organization_id after creation
- [ ] **AC11:** Test RLS policies block cross-org reads
- [ ] **AC12:** Test organization isolation at database level

### Role Validation Tests
- [ ] **AC13:** Test each endpoint validates role with `requireRole()`
- [ ] **AC14:** Test viewer cannot access admin endpoints
- [ ] **AC15:** Test gestor can access dashboard (not just admin)
- [ ] **AC16:** Test role escalation is impossible

### Coverage
- [ ] **AC17:** Achieve >80% code coverage for user creation flows
- [ ] **AC18:** All critical paths covered
- [ ] **AC19:** All edge cases tested

---

## 📂 Scope

### IN Scope
- ✅ E2E tests for all 3 creation scenarios
- ✅ Unit tests for plan limits
- ✅ Integration tests for RLS isolation
- ✅ Role validation tests
- ✅ Edge case coverage

### OUT of Scope
- ❌ Change user creation behavior
- ❌ Create new test infrastructure (use existing)
- ❌ Performance tests (separate story)
- ❌ Load testing (separate story)

---

## 📂 File List

**Phase 1 - New Test Files:**
- [x] `e2e/user-creation.spec.ts` — E2E test suite
- [x] `src/__tests__/api/users-limits.test.ts` — Plan limit validation tests
- [x] `src/__tests__/lib/billing/plans.test.ts` — Modified with maxUsers tests

**Phase 2 - Integration & Role Tests (Pending):**
- [ ] `src/__tests__/flows/user-creation.test.ts` — Flow tests
- [ ] `src/__tests__/integration/rls-isolation.test.ts` — RLS tests
- [ ] `src/__tests__/auth/role-validation.test.ts` — Role tests

**Modified:**
- [ ] `jest.config.js` — Update coverage thresholds if needed

---

## 🔗 Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| PHASE-2-AC14 | Recommended | 🔄 In Progress |
| PHASE-2-AC12 | Recommended | 🔄 Waiting |
| ARCH-001 | Blocks this | ✅ Complete |

**Note:** Can run in parallel with AC14+AC12, or after both complete.

---

## 🧪 Test Structure

### E2E Tests (Playwright/Cypress)
```typescript
// e2e/user-creation.spec.ts

describe('User Creation Flows', () => {
  describe('Scenario 1: Stripe Webhook → User Creation → Login', () => {
    test('User subscribes → receives invite → sets password → login', async () => {
      // 1. Simulate Stripe checkout completion
      // 2. Verify webhook creates user with admin role
      // 3. Verify invite email sent
      // 4. User clicks email link
      // 5. User sets password
      // 6. User logs in
      // 7. User sees dashboard
    })
  })

  describe('Scenario 2: Self-Signup → Password Change → Dashboard', () => {
    test('User registers → changes password → access dashboard', async () => {
      // 1. User goes to signup page
      // 2. Fills email/password/name
      // 3. Confirms email
      // 4. System redirects to password change
      // 5. User changes password
      // 6. User sees dashboard
      // 7. Dashboard shows no properties (new org)
    })
  })

  describe('Scenario 3: Admin Creates Team Member', () => {
    test('Admin creates user → sends invite → new user logs in', async () => {
      // 1. Admin goes to members page
      // 2. Adds new user with role selection
      // 3. Invite email sent
      // 4. New user receives email
      // 5. New user sets password
      // 6. New user logs in
      // 7. Can see only assigned properties
    })
  })
})
```

### Unit Tests (Jest)
```typescript
// src/__tests__/lib/billing/plans.test.ts

describe('getPlanLimits', () => {
  test('essencial plan allows 1 user', () => {
    expect(getPlanLimits('essencial')).toEqual({
      maxUsers: 1,
      maxProperties: 1,
    })
  })

  test('expansao plan allows 3 users', () => {
    expect(getPlanLimits('expansao')).toEqual({
      maxUsers: 3,
      maxProperties: 5,
    })
  })

  test('API rejects when limit reached', async () => {
    // Create org with essencial plan (maxUsers: 1)
    // Try to create 2nd user
    // Should fail with 403 Limit reached
  })
})
```

### Integration Tests (Jest + Supabase Test Client)
```typescript
// src/__tests__/integration/rls-isolation.test.ts

describe('RLS Organization Isolation', () => {
  test('Admin of org A cannot read users from org B', async () => {
    // Create org A with user1
    // Create org B with user2
    // User1 tries to SELECT from user_profiles where org_id = B
    // Should return 0 rows (RLS blocks)
  })

  test('User cannot modify organization_id after creation', async () => {
    // Create user in org A
    // Try UPDATE user_profiles SET organization_id = B
    // Should fail (RLS blocks)
  })
})
```

---

## 📊 Complexity Assessment

**Complexity:** HIGH
- Requires E2E test setup
- Multiple complex scenarios
- Database isolation testing
- Coverage across 3 flows

**Effort Breakdown:**
- E2E test setup: 1h
- E2E tests (3 scenarios): 3-4h
- Unit tests (plan limits): 1h
- Integration tests (RLS): 2-3h
- Role validation tests: 1-2h
- Coverage validation: 1h
- **Total: 9-14 hours**

**Can be split into:**
- Phase A (4-6h): E2E + Plan tests
- Phase B (5-8h): Integration + Role tests

---

## 🏗️ Implementation Notes

### Test Environment Setup
```bash
# Required
npm install --save-dev @playwright/test
npm install --save-dev jest-environment-jsdom

# Or use existing test infrastructure
# Check: npm test output for current setup
```

### Database Seeding for Tests
```typescript
// Tests need:
// - Clean database per test
// - Test user accounts
// - Test organizations
// - Test properties

// Use: beforeEach() to reset data
```

### Mocking vs Integration
- ✅ Use real Supabase test client
- ❌ Don't mock RLS (we test RLS policies)
- ✅ Use real database for isolation tests
- ❌ Don't mock webhook (test actual flow)

---

## 🔒 Quality Gates

### Pre-Merge
- [ ] All ACs verified
- [ ] Tests pass (npm test)
- [ ] E2E tests pass
- [ ] Coverage >80%
- [ ] CodeRabbit: 0 CRITICAL/HIGH
- [ ] No flaky tests

### QA Gate
- [ ] Test coverage: PASS (>80%)
- [ ] All tests: GREEN
- [ ] E2E: GREEN
- [ ] No flakiness: VERIFIED

---

## 📝 Definition of Done

Story is DONE when:
1. ✅ All 4 test suites created
2. ✅ E2E tests cover all 3 scenarios
3. ✅ Plan limit tests pass
4. ✅ RLS isolation verified
5. ✅ Role validation tested
6. ✅ >80% coverage achieved
7. ✅ No flaky tests
8. ✅ CodeRabbit approved
9. ✅ QA gate passed
10. ✅ PR merged to main

---

## 🤝 Handoff to @dev + @qa

**For Developer:**
- Create feature branch: `feature/PHASE-2-TESTING-coverage`
- Set up test infrastructure first
- Implement tests in order (E2E → Unit → Integration)
- Ensure no flaky tests
- Run coverage check: `npm test -- --coverage`

**For QA:**
- Verify test coverage >80%
- Check E2E tests work in CI environment
- Validate RLS tests actually test RLS
- Confirm all scenarios are covered

**Success Criteria:**
- All tests green
- Coverage >80%
- No flaky tests
- E2E works in CI
- CodeRabbit approves

---

## 📋 Sub-Tasks (Optional Breakdown)

If splitting into 2 sprints:

**Sprint 1 (PHASE-2-TESTING-A):**
- [ ] E2E test setup
- [ ] E2E scenario 1 (Stripe flow)
- [ ] E2E scenario 2 (Signup flow)
- [ ] Plan limit unit tests

**Sprint 2 (PHASE-2-TESTING-B):**
- [ ] E2E scenario 3 (Admin creates user)
- [ ] RLS integration tests
- [ ] Role validation tests
- [ ] Coverage validation

---

## Change Log

```yaml
2026-06-11:
  - Story created from ARCH-001 Phase 2 backlog
  - Marked as MEDIUM priority
  - Can run in parallel with AC14+AC12
  - Ready for sprint assignment
  - Split into 2 phases if needed

2026-06-11 Phase 1 Implementation:
  - Implemented AC1-AC2: E2E tests for Stripe webhook and self-signup flows
  - Implemented AC4: All E2E tests use real database (Supabase admin client)
  - Implemented AC5-AC7: Unit tests for plan user limits (essencial: 1, expansao: 5, premium: 10)
  - Implemented AC8: Integration tests for API rejection when user limit reached
  - Created: e2e/user-creation.spec.ts (E2E test suite)
  - Created: src/__tests__/api/users-limits.test.ts (Plan limit validation)
  - Modified: src/__tests__/lib/billing/plans.test.ts (Added maxUsers tests)
  - Test Results: 1245 tests passing, 0 failures
  - Phase 1 Ready for QA review (AC3 deferred to Phase 2)
```

---

**Completes ARCH-001 Quality Assurance Cycle**

— River, removendo obstáculos 🌊
