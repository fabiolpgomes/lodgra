# Staging Environment - Setup & Testing Guide

**Date:** 2026-06-25  
**Status:** ✅ CONFIGURED  
**URL:** https://home-stay-staging.vercel.app

---

## Overview

Staging environment is now configured for QA testing before production deployment.

### Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | https://www.lodgra.io | Live users |
| Staging | https://home-stay-staging.vercel.app | QA testing (2-3 days) |
| Dev/Local | localhost:3000 | Development |

---

## What's Deployed to Staging

**Branch:** `staging`  
**Last Update:** 2026-06-25 23:15 UTC

### Epic 29 - Cleaning Portal (Bug Fixes)
- ✅ Date validation (rejeita passado)
- ✅ Time validation (rejeita hora passada)
- ✅ Template ID saved (não NULL)
- ✅ Access link gerado
- ✅ Seed items (items query fix)
- ✅ Template update (schema fix)

**Commits in staging:**
```
c93ceb5 fix: resolve remaining Epic 29 bugs - items query and schema mismatch
60b1a6a chore: trigger vercel rebuild
5e5551b fix: resolve 6 critical Epic 29 bugs - date/time validation, template ID, template update
5248c93 docs: add QA fix request for Epic 29 critical bugs
61419d4 Revert "docs: add Epic 29 deployment checklist for staging go-live"
```

---

## How to Test

### 1. Seed Templates
```bash
curl -X POST https://home-stay-staging.vercel.app/api/seed-templates-public
```

Expected response:
```json
{
  "success": true,
  "results": [
    { "name": "Template A - T0/Studio", "status": "created", "items_count": 12 },
    { "name": "Template B - T1/T2", "status": "created", "items_count": 8 },
    { "name": "Template C - T3/T4/Vivenda", "status": "created", "items_count": 9 }
  ]
}
```

### 2. Run 10 QA Test Scenarios

Follow: `docs/qa/EPIC-29-QA-TESTING-GUIDE.md`

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Dashboard Load | Loads < 2s | ⏳ |
| 2 | Create Task | Form works | ⏳ |
| 3 | Date Validation | Rejects past | ⏳ |
| 4 | Template Mgmt | Edit works | ⏳ |
| 5 | Filters | Filters work | ⏳ |
| 6 | Pagination | 20/page | ⏳ |
| 7 | Cleaner Access | Token works | ⏳ |
| 8 | Task Execution | Transitions OK | ⏳ |
| 9 | Real-time | Updates live | ⏳ |
| 10 | Error Handling | Validations | ⏳ |

### 3. Report Bugs

If you find bugs, create report in:
```
docs/qa/STAGING-BUGS-2026-06-25.md
```

---

## Timeline

```
2026-06-25 (Today)
  ✅ Staging configured
  ✅ Bug fixes deployed
  ⏳ QA starts testing (now)

2026-06-26 to 2026-06-27
  ⏳ QA completes 10 scenarios
  ⏳ Bug fixes if needed

2026-06-28+
  ⏳ Merge staging → main
  ⏳ Deploy to production
```

---

## Accessing Staging

### Option 1: Direct URL
```
https://home-stay-staging.vercel.app/pt-BR/cleaning/manage
```

### Option 2: Via CLI
```bash
# Check deployment status
vercel ls

# View logs
vercel logs --follow

# Open in browser
open https://home-stay-staging.vercel.app
```

---

## Troubleshooting

### "Build failed" in Vercel
- Check: `vercel logs`
- Solution: Run tests locally: `npm test`
- Push fix commit to `staging` branch

### "API returning errors"
- Check: `curl https://home-stay-staging.vercel.app/api/templates`
- Check: Database migrations applied
- Solution: Verify seed worked: `curl -X POST .../api/seed-templates-public`

### "Old code still running"
- Vercel may cache old build
- Solution: Force rebuild: `git commit --allow-empty && git push`

---

## QA Workflow

**Step 1:** Access staging  
**Step 2:** Seed templates  
**Step 3:** Run 10 scenarios  
**Step 4:** Report bugs or PASS  
**Step 5:** @dev fixes bugs (if any)  
**Step 6:** Repeat until PASS  

---

## Merging Back to Main

When QA PASSES:

```bash
git checkout main
git merge staging
git push origin main
```

This triggers production deployment automatically.

---

## Notes

- Staging uses **same database** as production (shared Supabase)
- Changes visible immediately after deploy
- No traffic limits or throttling
- Can test against real data

---

**Configured by:** @devops (Gage)  
**Ready for testing:** YES  
**Next step:** Run QA Testing Guide (10 scenarios)
