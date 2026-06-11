# Story: Centralize User Profile Creation Logic
**Epic:** Architecture Cleanup — Phase 2  
**ID:** PHASE-2-AC12 | **Priority:** HIGH | **Status:** Ready  
**Date Created:** 2026-06-11 | **Estimate:** 2-3 hours

---

## 📋 Description

**Problem:**
User profile creation logic is duplicated across 3 different flows:
1. Stripe webhook (user subscribes)
2. Auth callback (self-signup)
3. Users API (admin creates team member)

Each location repeats:
- Role assignment
- Organization linking
- Property access configuration
- Audit logging

This creates:
- Risk of inconsistent behavior
- Difficulty maintaining code (3 places to update)
- No single source of truth for profile creation

**Solution:**
Extract `createUserProfile()` helper function that centralizes all profile creation logic.

**Business Value:**
- ✅ Consistent user creation across all flows
- ✅ Easier to maintain (single source of truth)
- ✅ Reduces risk of bugs in edge cases
- ✅ Enables easier testing
- ✅ Unblocks AC16-AC19 (test suite)

---

## 🎯 Acceptance Criteria

### Functional
- [ ] **AC1:** `createUserProfile()` helper created in `src/lib/auth/create-user-profile.ts`
- [ ] **AC2:** Stripe webhook uses helper
- [ ] **AC3:** Auth callback uses helper
- [ ] **AC4:** Users API uses helper
- [ ] **AC5:** All role assignments use new `UserRole` enum (from AC14)

### Behavior
- [ ] **AC6:** Webhook behavior unchanged (creates admin user)
- [ ] **AC7:** Callback behavior unchanged (creates admin first user)
- [ ] **AC8:** Users API behavior unchanged (creates specified role)
- [ ] **AC9:** Audit logging still works
- [ ] **AC10:** Organization linking still works

### Quality
- [ ] **AC11:** All tests pass
- [ ] **AC12:** No regressions
- [ ] **AC13:** CodeRabbit: 0 CRITICAL/HIGH
- [ ] **AC14:** Type checking passes

---

## 📂 Scope

### IN Scope
- ✅ Create `createUserProfile()` helper
- ✅ Update 3 creation flows to use helper
- ✅ Handle all parameters (role, org, access, etc)
- ✅ Preserve existing behavior exactly

### OUT of Scope
- ❌ Change user creation behavior
- ❌ Add new features
- ❌ Refactor role logic beyond consolidation
- ❌ Add email sending (already handled by consumers)

---

## 📂 File List

**New:**
- [ ] `src/lib/auth/create-user-profile.ts` — Helper function

**Modified:**
- [ ] `src/app/api/stripe/webhook/route.ts` — Call helper instead of inline logic
- [ ] `src/app/auth/callback/route.ts` — Call helper instead of inline logic
- [ ] `src/app/api/users/route.ts` — Call helper instead of inline logic

---

## 🔗 Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| PHASE-2-AC14 | Blocks this | 🔄 In Progress |
| ARCH-001 | Blocks this | ✅ Complete |
| PHASE-2-TESTING | Can run parallel | 🔄 Waiting |

**Note:** AC14 must be completed first (for UserRole enum).

---

## 🧪 Testing

### Unit Tests
```typescript
// src/__tests__/lib/auth/create-user-profile.test.ts
- [ ] Helper creates profile with correct role
- [ ] Helper creates organization when needed
- [ ] Helper handles existing organization
- [ ] Helper handles all role types (admin, gestor, viewer)
- [ ] Helper handles access_all_properties flag
```

### Integration Tests
- [ ] Webhook flow produces same result as before
- [ ] Callback flow produces same result as before
- [ ] Users API flow produces same result as before

### Behavior Tests
- [ ] First webhook user is admin with full access
- [ ] First signup user is admin with full access
- [ ] Team member gets specified role (viewer default)

---

## 🏗️ Implementation Notes

### Step 1: Create Helper Function

```typescript
// src/lib/auth/create-user-profile.ts
import { UserRole } from '@/lib/auth/role-types'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createUserProfile(input: {
  userId: string
  email: string
  fullName: string
  organizationId: string
  role?: UserRole | string
  accessAllProperties?: boolean
  passwordResetRequired?: boolean
}) {
  const supabase = createAdminClient()
  
  const profile = {
    id: input.userId,
    email: input.email,
    full_name: input.fullName,
    role: input.role || UserRole.VIEWER,
    access_all_properties: input.accessAllProperties || false,
    organization_id: input.organizationId,
    password_reset_required: input.passwordResetRequired ?? false,
  }
  
  return supabase
    .from('user_profiles')
    .upsert(profile, { onConflict: 'id' })
}
```

### Step 2: Update Stripe Webhook
```typescript
// Before: 15 lines of inline logic
await adminClient.from('user_profiles').upsert({...})

// After: 1 line
await createUserProfile({
  userId: inviteData?.user?.id,
  email,
  fullName: email.split('@')[0],
  organizationId: org.id,
  role: UserRole.ADMIN,
  accessAllProperties: true,
})
```

### Step 3: Update Auth Callback
```typescript
// Similar refactor
await createUserProfile({
  userId: user.id,
  email: user.email,
  fullName: user.user_metadata?.full_name || '',
  organizationId: newOrg.id,
  role: UserRole.ADMIN,
  accessAllProperties: true,
  passwordResetRequired: !isOAuthUser,
})
```

### Step 4: Update Users API
```typescript
// Similar refactor
await createUserProfile({
  userId: newUser.user.id,
  email,
  fullName,
  organizationId,
  role: role || UserRole.VIEWER,
  accessAllProperties: access_all_properties || false,
  passwordResetRequired: isProvisionalPassword,
})
```

---

## 📊 Complexity Assessment

**Complexity:** MEDIUM
- Extract common pattern
- 3 locations to update
- Need to ensure behavior stays identical
- Some edge cases to handle

**Effort Breakdown:**
- Create helper: 30 min
- Refactor webhook: 20 min
- Refactor callback: 20 min
- Refactor users API: 15 min
- Testing + CodeRabbit: 20 min
- **Total: 1.5-2 hours**

---

## 🔒 Quality Gates

### Pre-Merge
- [ ] All ACs verified
- [ ] Tests pass (npm test)
- [ ] TypeScript passes (npm run typecheck)
- [ ] Lint passes (npm run lint)
- [ ] CodeRabbit: 0 blocking issues
- [ ] No regressions in behavior

### QA Gate
- [ ] Code review: PASS
- [ ] Unit tests: PASS
- [ ] Integration tests: PASS
- [ ] No regressions: PASS
- [ ] Performance: OK
- [ ] Security: OK

---

## 📝 Definition of Done

Story is DONE when:
1. ✅ Helper function created and exported
2. ✅ All 3 creation flows use helper
3. ✅ Behavior is identical to before
4. ✅ All tests pass
5. ✅ CodeRabbit approved
6. ✅ QA gate passed
7. ✅ PR merged to main

---

## 🤝 Handoff to @dev

**Prerequisites:**
- PHASE-2-AC14 (Role Enum) must be completed first

**For Developer:**
- Ensure AC14 is merged before starting
- Create feature branch: `feature/PHASE-2-AC12-centralize-logic`
- Extract common pattern carefully
- Run tests frequently to catch regressions
- Verify behavior matches before/after

**Success Criteria:**
- All 3 flows use helper
- No behavior change
- All tests green
- CodeRabbit approves

---

## Change Log

```yaml
2026-06-11:
  - Story created from ARCH-001 Phase 2 backlog
  - Marked as HIGH priority (unblocks testing)
  - Depends on PHASE-2-AC14
  - Ready for sprint assignment
```

---

**Next Story (After This):** PHASE-2-TESTING — Test Suite

— River, removendo obstáculos 🌊
