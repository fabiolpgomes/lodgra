# 🌊 Phase 2 Stories Ready for Sprint Planning
**Created by:** River (Scrum Master)  
**Date:** 2026-06-11 | **Status:** ✅ Ready for Assignment

---

## 📋 Summary

**3 formal stories created** from ARCH-001 Phase 2 backlog items:

| Story | Priority | Effort | Status |
|-------|----------|--------|--------|
| PHASE-2-AC14 | HIGH | 1-2h | ✅ Ready |
| PHASE-2-AC12 | HIGH | 2-3h | ✅ Ready |
| PHASE-2-TESTING | MEDIUM | 9-14h | ✅ Ready |
| **TOTAL** | — | **13-21h** | ✅ Ready |

---

## 🎯 Story 1: PHASE-2-AC14 — Role Enum Type

**File:** `/docs/stories/PHASE-2-AC14.story.md`

**Quick Summary:**
- Create TypeScript enum for user roles (`admin`, `gestor`, `viewer`)
- Replace magic strings with type-safe enum
- Improves type safety, enables IDE autocomplete
- **Unblocks:** AC12 (should use new enum)

**Breakdown:**
- 10 Acceptance Criteria
- Create enum: 15 min
- Update 3 files: 20 min
- Testing: 15 min
- **Total: 1-1.5 hours**

**Files to Modify:**
- `src/lib/auth/role-types.ts` (NEW)
- `src/app/api/stripe/webhook/route.ts`
- `src/app/auth/callback/route.ts`
- `src/app/api/users/route.ts`

**Next Story:** AC12 (depends on this)

---

## 🎯 Story 2: PHASE-2-AC12 — Centralize Role Logic

**File:** `/docs/stories/PHASE-2-AC12.story.md`

**Quick Summary:**
- Extract `createUserProfile()` helper function
- Eliminate duplication across 3 creation flows
- Single source of truth for profile creation
- Improves maintainability

**Breakdown:**
- 14 Acceptance Criteria
- Create helper: 30 min
- Refactor webhook: 20 min
- Refactor callback: 20 min
- Refactor users API: 15 min
- Testing: 20 min
- **Total: 1.5-2 hours**

**Files to Modify:**
- `src/lib/auth/create-user-profile.ts` (NEW)
- `src/app/api/stripe/webhook/route.ts`
- `src/app/auth/callback/route.ts`
- `src/app/api/users/route.ts`

**Dependencies:** Must have AC14 completed first (uses new enum)

---

## 🎯 Story 3: PHASE-2-TESTING — Test Suite

**File:** `/docs/stories/PHASE-2-TESTING.story.md`

**Quick Summary:**
- Create comprehensive test suite (E2E + Unit + Integration)
- Cover all 3 creation scenarios
- Test plan limits, RLS isolation, role validation
- Achieve >80% coverage

**Breakdown:**
- 19 Acceptance Criteria
- E2E setup: 1h
- E2E tests (3 scenarios): 3-4h
- Plan limit tests: 1h
- RLS isolation tests: 2-3h
- Role validation tests: 1-2h
- Coverage: 1h
- **Total: 9-14 hours**

**Can be split into 2 sub-stories:**

**Phase A (4-6h):**
- E2E test setup
- E2E scenario 1 (Stripe)
- E2E scenario 2 (Signup)
- Plan limit tests

**Phase B (5-8h):**
- E2E scenario 3 (Admin creates)
- RLS integration tests
- Role validation tests
- Coverage validation

**Recommended:** Run in parallel with AC14+AC12 OR split into Phase A+B

---

## 📊 Sprint Planning Guide

### Recommended Timeline

**Sprint 1 (Next Sprint):**
- [ ] PHASE-2-AC14 (1-2h) — HIGH PRIORITY
- [ ] PHASE-2-AC12 (2-3h) — HIGH PRIORITY (depends on AC14)
- [ ] Subtotal: 3-5 hours

**Sprint 2 (Following Sprint):**
- [ ] PHASE-2-TESTING (9-14h) — MEDIUM PRIORITY
- [ ] Or run PHASE-2-TESTING in parallel if team has capacity

**Or Aggressive (1 Sprint):**
- [ ] PHASE-2-AC14 (1-2h)
- [ ] PHASE-2-AC12 (2-3h) — parallel after AC14 starts
- [ ] PHASE-2-TESTING Phase A (4-6h) — parallel
- [ ] Total: 7-11h in 1 sprint (if feasible)

### Dependencies
```
PHASE-2-AC14
    ↓
PHASE-2-AC12

PHASE-2-TESTING (can run in parallel)
```

---

## ✅ Story Quality Checklist

Each story includes:
- ✅ Clear title and description
- ✅ 10+ Acceptance Criteria (testable)
- ✅ Well-defined scope (IN/OUT)
- ✅ File list with changes
- ✅ Dependencies mapped
- ✅ Testing strategy detailed
- ✅ Implementation notes (step-by-step)
- ✅ Complexity assessment
- ✅ Quality gates defined
- ✅ Definition of Done

---

## 📁 All Phase 2 Stories

Located in: `/docs/stories/`

```
docs/stories/
├── PHASE-2-AC14.story.md      (1-2h, HIGH)
├── PHASE-2-AC12.story.md      (2-3h, HIGH)
└── PHASE-2-TESTING.story.md   (9-14h, MEDIUM)
```

**Total Files:** 3 stories
**Total Effort:** 13-21 hours
**All are READY for assignment**

---

## 🚀 Next Steps

### For @pm (Morgan)
- Review stories for alignment with roadmap
- Prioritize which sprint to schedule

### For @po (Pax)
- Validate stories for completeness
- Ensure AC are testable
- Prioritize in backlog

### For @dev (Dex)
- Review stories when sprint assigned
- Ask questions if AC unclear
- Create feature branches per story

### For @qa (Quinn)
- Validate test plans in Phase 2-TESTING
- Plan QA gate review schedule

---

## 📊 Workflow Status

| Step | Agent | Status |
|------|-------|--------|
| 1. Architect validate | @architect | ✅ DONE (95% pass) |
| 2. PO approve | @po | ✅ DONE (10/10) |
| 3. Create stories | @sm | ✅ DONE (3 stories) |
| 4. Sprint planning | @pm + @po | 🔄 Next |
| 5. Story assignment | @sm | 🔄 Next |
| 6. Development | @dev | ⏳ Waiting |
| 7. QA review | @qa | ⏳ Waiting |

---

## 📋 File References

**ARCH-001 Artifacts:**
- `/docs/stories/ARCH-REVIEW-USER-CREATION-SECURITY.md` (closed)
- `/ARCHITECTURE-VALIDATION-REPORT.md` (95% pass, approved)
- `/PO-FINAL-APPROVAL.md` (10/10 validation)

**Phase 2 Stories:**
- `/docs/stories/PHASE-2-AC14.story.md` (1-2h)
- `/docs/stories/PHASE-2-AC12.story.md` (2-3h)
- `/docs/stories/PHASE-2-TESTING.story.md` (9-14h)

**Summary:**
- `/PHASE-2-STORIES-READY.md` (this document)

---

## 🎯 Ready for Backlog Integration

These stories are:
- ✅ Complete and detailed
- ✅ Ready to assign to developers
- ✅ Have clear AC and scope
- ✅ Include testing strategy
- ✅ Include implementation notes
- ✅ Ordered by dependency

**Next Action:** Add to sprint backlog and assign to @dev when ready.

---

**Stories created and ready for assignment** ✅

— River, removendo obstáculos 🌊
