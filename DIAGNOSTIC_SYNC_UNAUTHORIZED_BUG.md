# Bug: Email Sync "Unauthorized" Error - Diagnostic Report

**Date:** 2026-07-31  
**Status:** 🔴 UNRESOLVED - Continued investigation required  
**Severity:** 🚨 CRITICAL - Email synchronization blocked

---

## Problem Statement

Email sync endpoint returns persistent **"Erro na sincronização: Unauthorized"** error even after:
- Schema column fixes deployed
- CRON_SECRET synchronized between local and Vercel
- Two Vercel deploys (standard + --force)
- ANTHROPIC_API_KEY confirmed active in production

**Test URL:** https://www.lodgra.io/pt-BR/sync  
**Error Location:** Console → installHook.js → "Erro na sincronização: Unauthorized"

---

## Investigation Summary

### ✅ Completed Fixes (Not solving the issue)

| Fix | Status | Details |
|-----|--------|---------|
| Schema columns | ✅ Fixed | Changed `sync_status` → `match_status`, removed non-existent columns |
| CRON_SECRET sync | ✅ Done | Updated in Vercel (Production, Preview, Dev) to `6b832bb7e23891ef8dcbda376bf3d264` |
| Vercel deploy | ✅ Done | Standard deploy completed (681ea1d2 commit) |
| Vercel redeploy --force | ✅ Done | Force redeploy ID: `dpl_H7v2mfU5WpQgEaZ36ZwY2ycbDvud` |
| Environment vars verified | ✅ Confirmed | Both `CRON_SECRET` and `ANTHROPIC_API_KEY` present in all environments |

### ❌ Root Cause Still Unknown

**Possible causes NOT yet ruled out:**

1. **Value mismatch in production** - Vercel env vars may not be reading the new CRON_SECRET value correctly
2. **API endpoint authorization logic** - `/api/cron/email-parser` returns 401 regardless
3. **Request header not being sent** - `Authorization: Bearer {CRON_SECRET}` not reaching endpoint
4. **Environment variable not loaded** - Process.env.CRON_SECRET undefined at runtime in production
5. **Nginx/reverse proxy issue** - Headers stripped before reaching Next.js
6. **API route not reloaded** - Old route handler still in production memory

---

## Code Review (Correct Implementation)

### `/src/app/api/cron/email-parser/route.ts` ✅
```typescript
const cronSecret = process.env.CRON_SECRET           // ✅ Correct
const anthropicKey = process.env.ANTHROPIC_API_KEY  // ✅ Correct

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })  // ✅ Logic OK
}
```

### `/src/app/api/admin/trigger-email-parser/route.ts` ✅
```typescript
const cronSecret = process.env.CRON_SECRET  // ✅ Correct
const headers: Record<string, string> = {}
if (cronSecret) {
  headers['Authorization'] = `Bearer ${cronSecret}`  // ✅ Correct
}
```

**Conclusion:** Code is correct. Issue is in production environment or request flow.

---

## Vercel Deployment Details

**Last Deploy:** 2026-07-31 21:35 UTC  
**Deployment ID:** dpl_H7v2mfU5WpQgEaZ36ZwY2ycbDvud  
**Status:** READY  
**URL Aliased:** https://www.lodgra.io ✓

**Environment Variables Set:**
- ✅ CRON_SECRET (Production, Preview, Development)
- ✅ ANTHROPIC_API_KEY (Production, Preview, Development)
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ All other required vars present

---

## Next Steps for Tomorrow

### Option 1: Direct Debugging (Recommended)
1. Add request logging to `/api/cron/email-parser` to see:
   - What `cronSecret` value is loaded at runtime
   - What `authHeader` is received
   - What comparison fails
2. Deploy with logging and trigger sync
3. Check Vercel logs/console output

### Option 2: Reset CRON_SECRET Value
1. Generate completely new CRON_SECRET
2. Verify it sets correctly with `vercel env ls`
3. Deploy fresh
4. Test again

### Option 3: Check Vercel Secrets Manager
1. Verify via Vercel dashboard that env vars were actually updated
2. Check if there's a sync/cache issue in Vercel's infrastructure

### Option 4: Browser Network Inspection
1. Open DevTools → Network tab
2. Click sync button
3. Inspect the request to `/api/admin/trigger-email-parser`
4. Check response status and body
5. Verify Authorization header is sent

---

## Files Modified This Session

```
src/app/api/email-extraction/process-pending/route.ts      ✅ Fixed
src/lib/email-reconciliation/sync-to-reservations.ts       ✅ Fixed
src/app/api/admin/email-sync-metrics/route.ts             ✅ Fixed
src/lib/email-reconciliation/__tests__/sync-to-reservations.test.ts  ✅ Fixed
.env.local                                                  ✅ Updated locally
Vercel Env (CRON_SECRET)                                   ✅ Updated in all 3 environments
```

---

## Test Evidence

**Before fixes:**
- toFixed() error ❌
- Schema column errors ❌
- "Unauthorized" error ❌

**After schema fixes:**
- toFixed() error ✅ FIXED
- Schema errors ✅ FIXED
- "Unauthorized" error ❌ STILL PRESENT

**After CRON_SECRET sync:**
- "Unauthorized" error ❌ STILL PRESENT

**After redeploy --force:**
- "Unauthorized" error ❌ STILL PRESENT

---

## Commits Related

- `681ea1d2` - fix: resolve critical schema column mismatches in email sync pipeline
- Multiple prior commits with CRON_SECRET and pricing fixes

---

## Session Notes

This session successfully:
1. ✅ Identified and fixed schema column mismatches
2. ✅ Synchronized CRON_SECRET between local and Vercel
3. ✅ Deployed 7 commits to production
4. ✅ Executed 2 Vercel deploys

But the root cause of "Unauthorized" remains unresolved and requires deeper investigation into:
- Production environment variable loading
- Request header propagation
- API endpoint authorization logic at runtime

**Recommendation:** Schedule focused debugging session with logging before next deployment attempt.

---

Generated: 2026-07-31 21:36 UTC
