# Revert Decision: i18n Routing Architecture (2026-04-05)

**Status:** ✅ Executed | **Commit:** `6a8d254` (revert from `5aa5f22`)  
**Duration:** 48 hours of attempts → Architectural root cause identified → Reverted to stable

---

## Decision

After 48 hours of incremental fixes to routing and authentication issues, the root cause was identified as **architectural, not configuration**.

**Decision:** Revert to commit `6a8d254` (stable state before aggressive i18n routing)

---

## Root Cause Analysis

### What Failed
The i18n Epic implementation (commits `d7acebf` → `3d84a66+`) forced all routes through `[locale]/` prefixed segments:

```
❌ BAD (attempted)
/ → redirect to /pt/ or /en/ based on Accept-Language
/login → /pt/login
/calendar → /pt/calendar
/dashboard → /pt/dashboard (+ separate /[locale]/dashboard/page.tsx)
```

### Why It Failed
1. **Middleware routing conflict:** The `intlMiddleware` was redirecting requests to locale routes BEFORE auth checks could execute
2. **Authenticated user lockout:** Redirect chains created 403 errors on locale-prefixed routes
3. **AuthLayout incompatibility:** Components expected global routes but got locale-prefixed ones
4. **Industry pattern violation:** Netflix, Airbnb, Amazon ALL keep root (`/`) globally accessible

### Symptoms (User Reported)
- ✅ Incognito/unauthenticated: Landing page works
- ❌ Normal auth: Blank page or 403 Forbidden
- ❌ Click "Login": Shows "Algo correu mal" instead of login form
- ❌ Authenticated users cannot access dashboard/calendar

### Timeline
```
d7acebf     — i18n.1 infrastructure (middleware, next-intl) ✅
50b090f     — i18n.2 translations (121 keys) ✅
6a1244e     — i18n.3 multi-currency (EUR/BRL/USD) ✅
6a8d254     — QA Results, all tests passing ✅ [STABLE STATE]

3d84a66     — hotfix: locale-aware login page ❌ (first break)
c4a04d7     — automatic locale redirect in middleware ❌
f3894cf     — implement locale-based routing (THE KILLER) ❌
c4312d2     — Revert hotfix (incomplete) ❌
7198f30     — LocaleSelector (i18n.4) ❌
... 16 more fixes/attempts ...
5aa5f22     — emergency: restore landing page as root ❌ (still broken)
```

---

## What Was Preserved ✅

- **i18n.1 Infrastructure:** Middleware, next-intl setup, locale detection logic
- **i18n.2 Translations:** All 121 keys (PT/PT-BR/EN-US) with 11 Brazilian variants
- **i18n.3 Multi-Currency:** EUR ↔ BRL/USD forex conversion, Redis caching
- **Pricing Tiers 8.1/8.2:** Backend enforcement (limits), frontend UI (pricing cards)
- **CookieBanner Fix:** Legitimate non-i18n fix (Link vs <a> tag)

---

## What Was Removed ❌

- **i18n.4 LocaleSelector:** Locale switching component (will re-implement correctly)
- **Aggressive Locale Routing:** `[locale]/` forcing on all routes
- **All Emergency Fixes:** 21 commits of incremental patches (3d84a66 → 5aa5f22)

---

## Correct Pattern (Next Implementation)

### Industry Standard (Netflix, Airbnb, Amazon)

```
✅ GOOD (correct pattern)

/ → Always accessible (landing page)
/login → Global (no locale prefix)
/calendar → Global (no locale prefix)
/dashboard → Global (no locale prefix)

Locale detection via:
1. Accept-Language header (auto)
2. IP geolocation (auto)
3. User preference (stored in user_profiles.preferred_locale)
4. URL parameter (?lang=pt-BR) or selector UI

Localized content delivered via:
- Translation keys (next-intl in components)
- Currency formatting (EUR vs BRL vs USD)
- Date/number formatting (PT vs BR vs US)
```

### Key Principles
1. **Root always accessible** — Never force redirect to locale route
2. **Locale optional** — Detected but not required in URL
3. **Middleware non-blocking** — Sets locale context, doesn't redirect
4. **Auth before routing** — Middleware checks auth first, locale second
5. **Graceful fallback** — If locale detection fails, default to EN

---

## Next Steps

### Phase 1: Design Session (1-2 hours)
- **Participants:** @architect, @qa, @dev, @devops
- **Topics:**
  1. Root cause deep dive
  2. Industry pattern review
  3. Correct middleware implementation
  4. Test strategy for new pattern
  5. Rollout plan (avoid repeat)

### Phase 2: Re-implementation
- Create new story: **i18n.2.1: Redesigned Global i18n (Root-First Pattern)**
- Tasks:
  1. Update middleware to skip aggressive routing
  2. Implement auto-detection via Accept-Language + IP
  3. Update locale selector for optional switching
  4. Re-test pricing tier integration
  5. Full regression suite

### Phase 3: Quality Gates
- Build PASS ✅
- Lint PASS ✅
- Tests PASS ✅
- QA approval (comprehensive) ✅
- No 403/redirect loops ✅

---

## Lessons Learned

### ❌ What NOT to Do
- Don't force all routes through parametric segments without testing auth flow
- Don't assume middleware can handle both i18n AND auth sequencing
- Don't skip testing authenticated user journeys during routing changes
- Don't deploy breaking changes without comprehensive QA

### ✅ What TO Do
- Test auth flows during routing redesign (not after)
- Keep root path globally accessible (industry standard)
- Design routing WITH security/auth constraints in mind
- Get @qa approval on routing changes BEFORE implementation
- Create guardrails: pre-commit hooks to catch routing regressions

---

## Files Modified for This Decision
- `docs/REVERT_DECISION_2026_04_05.md` — This file (lesson documentation)

## Related Stories
- **Story i18n.1** — Status remains: Done ✅ (infrastructure sound)
- **Story i18n.2** — Status remains: Done ✅ (translations valid)
- **Story i18n.3** — Status remains: Done ✅ (currencies working)
- **Story i18n.4** — Status: REMOVED (will re-implement with correct pattern)
- **Story 8.1/8.2** — Status remains: Ready for Deployment (pricing tiers intact)

---

**Owner:** Fabio Gomes  
**Date:** 2026-04-05  
**Decision Type:** Architectural Revert  
**Impact:** System stability restored, 48h lesson learned, new strategy ready
