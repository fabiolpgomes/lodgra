# Débito Técnico: Auth requireRole + Consent Route Tests

**Severidade:** HIGH  
**Impact:** 19 test failures (2 test suites)  
**Root Cause:** Unknown (pre-existing, not related to Story 35.1)  
**Files Affected:**
- `src/__tests__/lib/auth/requireRole.test.ts` (8 failures)
- `src/app/api/consent/__tests__/route.test.ts` (11 failures)

**Discovery Date:** 2026-06-18  
**Discovered During:** Story 35.1 (AI Search Visibility) Phase 1  
**Status:** BACKLOG (not blocking Story 35.1)  
**Estimate to Fix:** 2-3 hours  

---

## Diagnostic Steps

```bash
# Run with verbose output to see actual failures
npm run test -- src/__tests__/lib/auth/requireRole.test.ts --verbose
npm run test -- src/app/api/consent/__tests__/route.test.ts --verbose
```

---

## Notes

- These failures are **pre-existing** (confirmed they have no dependency on Story 35.1 changes)
- Likely caused by recent changes to auth layer or consent flow
- Not blocking any current development
- Should be resolved within next sprint

---

## Next Owner

- @qa (for diagnosis and analysis)
- @dev (for implementation of fix)

---
