# RLS Policy Fix — Story 27.4

**Date:** 2026-05-17  
**Migration:** `20260517000001_fix_google_feed_logs_insert_policy.sql`  
**Risk Level:** LOW (Policy-only change, no data impact)

---

## Change Summary

### Problem Identified

The original INSERT policy on `google_feed_logs` (from `20260516000001`) allowed **any organization member** to INSERT logs, regardless of premium tier status:

```sql
-- OLD: Missing premium tier check
CREATE POLICY google_feed_logs_insert_policy ON public.google_feed_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = google_feed_logs.organization_id
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.organization_id = o.id
        AND up.user_id = auth.uid()
      )
      -- ❌ NO TIER CHECK
    )
  );
```

**Security Gap:**
- SELECT policy enforces `tier = 'premium'`
- INSERT policy does NOT enforce tier
- Inconsistent access control (read-only premium, write-open-to-all)

---

## Solution

Drop old policy and replace with tier-enforced version:

```sql
-- NEW: Added premium tier validation
CREATE POLICY google_feed_logs_insert_policy ON public.google_feed_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = google_feed_logs.organization_id
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.organization_id = o.id
        AND up.user_id = auth.uid()
      )
      -- ✅ NEW: Verify organization has premium properties
      AND EXISTS (
        SELECT 1 FROM public.properties pr
        WHERE pr.organization_id = o.id
        AND pr.tier = 'premium'
      )
    )
  );
```

---

## Impact Analysis

### Before Fix
- **SELECT:** Only premium tier users can read logs ✅
- **INSERT:** Any organization member can write logs ❌
- **Consistency:** BROKEN (read restricted, write open)

### After Fix
- **SELECT:** Only premium tier users can read logs ✅
- **INSERT:** Only members of orgs with premium properties can write logs ✅
- **Consistency:** UNIFIED (both restricted to premium)

### Data Impact
- **No data affected** — This is a policy change only
- **No rows deleted or modified**
- **Backward compatible** — Existing premium logs remain accessible
- **Forward compatible** — Non-premium orgs simply cannot insert new logs

---

## Rollback Plan

If needed, restore the old policy:

```sql
DROP POLICY IF EXISTS google_feed_logs_insert_policy ON public.google_feed_logs;

CREATE POLICY google_feed_logs_insert_policy ON public.google_feed_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = google_feed_logs.organization_id
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.organization_id = o.id
        AND up.user_id = auth.uid()
      )
    )
  );
```

---

## Testing Checklist

- [ ] Apply migration to staging
- [ ] Verify policy exists: `SELECT * FROM pg_policies WHERE tablename='google_feed_logs'`
- [ ] Test as premium user: INSERT should succeed
- [ ] Test as non-premium user: INSERT should fail (403 or silent fail depending on RLS behavior)
- [ ] Verify SELECT still works correctly
- [ ] Verify no regressions in 27.2, 27.3 feeds

---

## Approval

**Reviewed by:** Dara (@data-engineer)  
**Risk Assessment:** ✅ **LOW** — Policy-only, no data impact  
**Approval Status:** ✅ **APPROVED FOR DEPLOYMENT**

**Next Step:** Apply migration during next deploy cycle (before @devops push)

---
