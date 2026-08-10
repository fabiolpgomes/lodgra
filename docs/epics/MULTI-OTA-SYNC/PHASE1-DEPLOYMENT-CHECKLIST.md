# Phase 1 Deployment Checklist

**Status:** ✅ Ready for Deployment  
**Date:** 2026-08-10  
**Review Status:** Architect-approved (Aria)

---

## 📋 Pre-Deployment Verification

### Schema Validation
- [x] All 9 tables defined (organizations, channels, reservations, blocks, conflicts, sources, matches, audit)
- [x] Foreign keys with RESTRICT constraints (prevent cascading deletes)
- [x] Soft-delete timestamps (deleted_at on all tables except audit_events)
- [x] Generated columns (number_of_nights)
- [x] CHECK constraints (dates, prices, statuses, completeness)
- [x] UNIQUE constraints (dedup key on reservations)

### Index Optimization
- [x] 10 indices created
- [x] Sync worker index optimized for enrichment queue (idx_sync_worker)
- [x] Calendar UI index (idx_calendar_view)
- [x] Deduplication index (idx_dedup UNIQUE)
- [x] Conflict detection index (idx_conflicts_pending)
- [x] All indices WHERE deleted_at IS NULL (except audit)
- [x] Composite indices for multi-column queries

### RLS & Security
- [x] RLS enabled on all 9 tables
- [x] Organization-scoped policies (app.current_org_id)
- [x] Soft-delete filtering in all SELECT policies
- [x] Audit trail append-only (INSERT only, no UPDATE/DELETE)
- [x] System bypass role documented (postgres superuser)
- [x] Credentials encrypted (encrypted_credentials BYTEA)

### Audit Trail & Compliance
- [x] audit_events table LOGGED (crash-safe)
- [x] 10-year retention (3650 days default)
- [x] 24-month PII tracking (pseudonimized_at field)
- [x] Audit trigger on reservations (INSERT/UPDATE)
- [x] Immutable trail (no DELETE/UPDATE policies)
- [x] Actor tracking (actor_type, actor_id, correlation_id)

### Code Quality
- [x] Migration SQL idempotent (IF NOT EXISTS)
- [x] Rollback script included (commented DOWN section)
- [x] Comments on all tables and critical columns
- [x] Consistent naming conventions (snake_case)
- [x] No hardcoded values (use DEFAULTs)

---

## 🧪 Testing & Validation

### Integration Tests
- [x] TEST 1: Cross-org isolation (Org A cannot see Org B data)
- [x] TEST 2: Soft-delete filtering (deleted rows invisible)
- [x] TEST 3: Audit trail immutability (cannot UPDATE/DELETE)
- [x] TEST 4: System bypass role (postgres sees all orgs)
- [x] TEST 5: Generated columns & constraints (number_of_nights, price checks)

### Test Execution
```sql
-- Copy entire PHASE1-TESTS-RLS.sql to Supabase SQL Editor
-- Click "Run" 
-- Expected: 5/5 tests PASS
```

---

## 🚀 Deployment Steps

### Step 1: Pre-Flight Check
```bash
# Verify migration file exists
ls -lh docs/epics/MULTI-OTA-SYNC/PHASE1-MIGRATION-001.sql

# Verify backup (if production)
# pg_dump -h host -U user -d db > backup-2026-08-10.sql
```

### Step 2: Push to Supabase
```bash
# Using Supabase CLI
supabase db push --file docs/epics/MULTI-OTA-SYNC/PHASE1-MIGRATION-001.sql

# Or manual: Copy migration to Supabase SQL Editor → Run
```

### Step 3: Verify Schema
```bash
# Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

# Check indices
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'reservation%';

# Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'reservations', 'audit_events');
```

### Step 4: Run Integration Tests
```bash
# Copy entire PHASE1-TESTS-RLS.sql to Supabase SQL Editor
# Run tests
# Verify: 5/5 tests passing

-- Expected output:
-- ========================================
-- RLS ISOLATION TEST SUITE COMPLETE
-- ========================================
-- RESULTS:
--   TEST 1: Cross-org isolation ........... PASS
--   TEST 2: Soft-delete filtering ........ PASS
--   TEST 3: Audit trail immutability .... PASS
--   TEST 4: System bypass role .......... PASS
--   TEST 5: Generated columns ........... PASS
-- TOTAL: 5/5 tests passing
```

### Step 5: Test Application Connection
```javascript
// In application code
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Set organization context
await supabase.rpc('set_org', { org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });

// Query (should be org-scoped automatically)
const { data, error } = await supabase
  .from('reservations')
  .select('*');

// Verify: only returns this org's reservations
console.log(data.length); // Should be <= your org's reservation count
```

### Step 6: Monitor Audit Trail
```bash
# Verify audit trigger is working
SELECT COUNT(*) as audit_event_count FROM audit_events;

# Check recent audit events
SELECT entity_type, action, created_at FROM audit_events 
ORDER BY created_at DESC LIMIT 10;

# Verify org isolation in audit
SELECT organization_id, COUNT(*) as event_count 
FROM audit_events 
GROUP BY organization_id;
```

---

## ⚠️ Rollback Procedure

**If deployment fails:**

```bash
# Option 1: Use Supabase Migration Rollback
supabase db reset  # Resets to main schema (careful in production!)

# Option 2: Manual Rollback (execute DOWN section from PHASE1-MIGRATION-001.sql)
# See commented DOWN section in migration file
# Uncomment and execute in Supabase SQL Editor

# Option 3: Restore from Backup (if available)
psql -h host -U user -d db < backup-2026-08-10.sql
```

**Verification after rollback:**
```bash
# Confirm tables are gone
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'organization%';
-- Should return empty result
```

---

## 📊 Post-Deployment Validation

### Performance Check (1 hour after deployment)
```bash
# Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

# Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Security Check
```bash
# Verify RLS policies are enforced
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

# Test org isolation (as non-admin user)
SET app.current_org_id = 'test-org-id';
SELECT COUNT(*) FROM reservations;
-- Should return only test-org's data (or 0 if no data)
```

### Audit Trail Check
```bash
# Verify audit_events table is LOGGED (not UNLOGGED)
SELECT reloptions FROM pg_class 
WHERE relname = 'audit_events';
-- Should NOT include 'log_replication_conflicts'

# Check audit trigger
SELECT pg_get_triggerdef(oid) FROM pg_trigger 
WHERE tgname = 'trig_audit_reservations';
-- Should show trigger fires AFTER INSERT OR UPDATE
```

---

## 🎯 Success Criteria

### Must-Have Checks
- [ ] All 9 tables created successfully
- [ ] All 10 indices created successfully
- [ ] All RLS policies enabled (12 policies total)
- [ ] Audit trigger fires on INSERT/UPDATE
- [ ] 5/5 integration tests passing
- [ ] Application can query with org isolation

### Should-Have Checks
- [ ] Performance acceptable (< 100ms for sync worker queries)
- [ ] No RLS policy errors in logs
- [ ] No constraint violations
- [ ] Audit trail recording events correctly

### Could-Have Checks
- [ ] Monitor for lock contention on enrichment indices
- [ ] Set up PII pseudonimization job (24-month retention)
- [ ] Set up audit_events purge job (10-year retention)

---

## 📞 Troubleshooting

### Issue: Tables not appearing after migration
**Solution:**
1. Verify migration ran without errors (check Supabase logs)
2. Refresh browser / reconnect
3. Check if using wrong schema (default is 'public')

### Issue: RLS policies blocking all queries
**Solution:**
1. Verify `app.current_org_id` is set before querying
2. Check organization_id in your org record exists
3. Verify policy WHERE clause matches your data

### Issue: Audit trigger not creating events
**Solution:**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trig_audit_reservations';`
2. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'audit_reservation_changes';`
3. Check for INSERT errors in audit_events table

### Issue: Audit_events table showing "permission denied"
**Solution:**
1. Verify RLS policy is set to INSERT WITH CHECK
2. Verify you have INSERT permission on audit_events
3. Check if trigger is running as function owner (should be)

---

## 📅 Timeline

| Date | Task | Status |
|------|------|--------|
| 2026-08-10 | ✅ Schema designed + architect review | COMPLETE |
| 2026-08-10 | ✅ Migration + tests created | COMPLETE |
| 2026-08-11 | ⏳ Deploy to staging | PENDING |
| 2026-08-11 | ⏳ Run integration tests | PENDING |
| 2026-08-12 | ⏳ Deploy to production | PENDING |
| 2026-08-13 | ⏳ Monitor + validate | PENDING |

---

## 📝 Sign-Off

**Architect Review:** ✅ Aria (2026-08-10)  
**Schema Validation:** ✅ Dara (2026-08-10)  
**Test Coverage:** ✅ 5 integration test suites  
**Deployment Ready:** ✅ YES

---

## 🔗 Related Files

- `PHASE1-SCHEMA.sql` — Complete schema definition
- `PHASE1-MIGRATION-001.sql` — Migration UP + DOWN
- `PHASE1-RLS-POLICIES.sql` — Detailed RLS policies + test doc
- `PHASE1-TESTS-RLS.sql` — 5 integration test suites
- `PHASE1-ARCHITECTURE.md` — This document

---

**Ready to deploy. Execute Step 1-6 above, then verify success criteria. 🚀**
