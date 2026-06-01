# Database Index Verification — Story 32.1

## ⚠️ QA Blocker: Email Index Verification Required

**Story:** 32.1 (API identify-org)  
**Issue:** AC5.2 requires verification that `user_profiles.email` is indexed  
**Status:** PENDING DBA VERIFICATION

---

## SQL Query to Run

Connect to **Staging Supabase** (`wrqjpyyopwgyqluqkcga`) and execute:

```sql
-- Check if email index exists
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
  AND indexdef LIKE '%email%'
ORDER BY indexname;
```

---

## Expected Result: ✅ PASS

If index exists, output should show:

```
         indexname          | tablename | indexdef
────────────────────────────┼───────────┼──────────────────────────────────────
 idx_user_profiles_email    | user_profiles | CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email)
```

---

## If Index is Missing: ❌ FAIL

If no results are returned, create the index:

```sql
-- Create email index for identify-org endpoint
CREATE INDEX idx_user_profiles_email 
ON public.user_profiles(email);

-- Verify creation
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
  AND indexdef LIKE '%email%';
```

---

## Performance Impact

**Without index:**
- Query time: ~500ms+ (full table scan on 10k+ rows)
- Violates AC5.1 requirement (< 200ms p95)

**With index:**
- Query time: ~50-100ms (B-tree lookup)
- Meets AC5.1 requirement
- Scales to millions of rows

---

## Verification Checklist

### Staging Environment
- [ ] DBA verified email index exists on staging database
- [ ] Query time tested and confirmed < 200ms

### Production Environment  
- [ ] DBA verified email index exists on production database
- [ ] Query time tested and confirmed < 200ms

### Sign-off
- [ ] DBA Team: _________________________ Date: _______
- [ ] DevOps (@github-devops): _________________ Date: _______

---

## How to Access Supabase

1. Go to: https://supabase.com/dashboard
2. Select project: `wrqjpyyopwgyqluqkcga` (Staging)
3. Click: **SQL Editor** (top menu)
4. Paste query above
5. Click **Run** button

---

## Next Steps

1. **DBA Team:** Run verification query ↑
2. **If missing:** Create index using SQL above
3. **Dev Team:** Update this document with result
4. **QA Team:** Mark concern resolved
5. **DevOps:** Proceed with production promotion

---

**Created:** 2026-05-31  
**Story:** 32.1 (API identify-org)  
**Component:** POST /api/auth/identify-org
