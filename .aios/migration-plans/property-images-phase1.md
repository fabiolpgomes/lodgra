# Migration Plan: Property Images Phase 1 Optimization

**Workflow**: property-images-enhancement (Phase 1)
**Created**: 2026-03-25
**Owner**: @data-engineer (Dara)
**Timeline**: 1-2 hours total

---

## Overview

**Objective**: Eliminate N+1 query pattern for loading property images with variants

**Scope**:
- Add missing database index
- Document storage path convention
- Update application code (handed to @dev)

**Risk Level**: 🟢 **LOW** (non-breaking schema change + code-only optimization)

---

## Phase 1 Migration Tasks

### Task 1.1: Create Foreign Key Index

**Migration File**: `supabase/migrations/20260326_01_add_property_images_index.sql`

**SQL**:
```sql
-- Add missing index on foreign key for performance
CREATE INDEX IF NOT EXISTS idx_image_variants_property_image_id
  ON public.image_variants(property_image_id);

-- Analyze table to update statistics
ANALYZE public.image_variants;
```

**Why Now**:
- Improves all queries on image_variants (current N+1 and future optimized)
- Foreign keys should always have indexes in PostgreSQL
- Non-breaking: can be added anytime

**Safety**:
- ✅ Idempotent (`IF NOT EXISTS`)
- ✅ No data modification
- ✅ No RLS policy changes
- ✅ Easy rollback (DROP INDEX)

**Deployment**:
```bash
supabase migration up
# Or manual: psql $DATABASE_URL -f supabase/migrations/20260326_01_...sql
```

---

### Task 1.2: Verify RLS Policies Post-Index

**No Migration Needed** — Index doesn't affect RLS

**Verification**:
```sql
-- Check image_variants RLS is still working
SELECT * FROM image_variants
WHERE property_image_id IN (
  SELECT id FROM property_images
  WHERE organization_id = current_user_id::uuid
);
-- Should return only authorized variants
```

---

### Task 1.3: Create Storage Convention Documentation

**File**: `.aios-core/data/property-images-storage-convention.md`

**Content** (standard to enforce across codebase):

```markdown
# Property Images Storage Path Convention

## Standard Format

```
property-images/{organization_id}/{property_id}/{image_id}/
  ├── original.webp    # Original uploaded (max 1200x1500)
  ├── original.jpg     # JPEG fallback
  ├── thumb.webp       # 200x200 (thumbnails, grid)
  ├── thumb.jpg
  ├── mobile.webp      # 600x800 (mobile viewer)
  ├── mobile.jpg
  ├── tablet.webp      # 800x1000 (tablet viewer)
  ├── tablet.jpg
  ├── desktop.webp     # 1200x1500 (desktop viewer)
  └── desktop.jpg
```

## Benefits

1. **Org Isolation**: Path includes organization_id for multi-tenancy
2. **Predictable**: Can construct URL without database query
3. **Scalable**: Property/image nesting prevents bucket root congestion
4. **Versioning**: Easy to add new variants in future

## Usage

### Constructing URL
```javascript
const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images`;
const url = `${baseUrl}/${org_id}/${property_id}/${image_id}/${variant_type}.${format}`;
// Example: .../bhylz.../prop123.../img456.../mobile.webp
```

### RLS Protection
- Supabase Storage policies enforce org isolation
- Only authenticated users can list paths
- Shared signed URLs expire after 1 hour

## Migration Strategy

Existing images (pre-convention) stored under old paths:
- `{property_id}/{image_id}.{ext}`

Backfill strategy (post-Phase 1):
- Run async job to copy old → new paths
- Update `original_storage_path` references
- Delete old paths (30 day retention)
```

---

## Migration Execution Plan

### Step 1: Pre-Migration Checklist

**Before running migration**:

```bash
# 1. Create backup
supabase db push --dry-run

# 2. Verify no locks
SELECT * FROM pg_stat_activity WHERE state != 'idle';

# 3. Check deployment window (low traffic)
# Home Stay: Off-peak: 2-4 AM UTC (9-11 PM São Paulo)
```

### Step 2: Create Migration File

```bash
supabase migration new add_property_images_index
```

**File created**: `supabase/migrations/20260326_01_add_property_images_index.sql`

### Step 3: Apply Migration

**Local Testing**:
```bash
supabase migration up
```

**Verify Index Created**:
```sql
SELECT * FROM pg_indexes
WHERE tablename = 'image_variants'
  AND indexname = 'idx_image_variants_property_image_id';
-- Should return 1 row
```

**Check Performance**:
```sql
EXPLAIN ANALYZE
SELECT * FROM image_variants
WHERE property_image_id = 'test-id-uuid';
-- Index Scan should replace Seq Scan
```

### Step 4: Deploy to Production

```bash
supabase link --project-ref brjumbfpvijrkhrherpt
supabase migration push
```

**Monitoring**:
- ✅ Check query times in CloudSQL/Supabase metrics
- ✅ Verify index usage (pg_stat_user_indexes)
- ✅ Monitor disk space (index adds ~5-10MB)

---

## Rollback Plan

### Quick Rollback (If Issues Found)

```sql
-- Drop the index (1 second)
DROP INDEX IF EXISTS idx_image_variants_property_image_id;

-- Revert to previous migration
supabase migration down
```

**Impact**: Minimal
- Queries revert to full table scan (slow, but functional)
- RLS policies unaffected
- No data loss

### Zero-Downtime Rollback

If index causes unexplained slowness:

1. **Keep index** (cost is minimal)
2. **Revert code** to N+1 pattern
3. **Investigate** why optimization didn't help
4. **Re-apply** after root cause found

---

## Testing Strategy

### Unit Tests (Post-Migration)

**1. Index Existence**
```sql
SELECT COUNT(*) FROM pg_indexes
WHERE indexname = 'idx_image_variants_property_image_id';
-- Expected: 1
```

**2. Query Performance**
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM image_variants
WHERE property_image_id = 'sample-uuid';
-- Expected: Index Scan (not Seq Scan)
```

**3. RLS Enforcement**
```sql
-- Test as user with limited access
SELECT COUNT(*) FROM image_variants iv
JOIN property_images pi ON iv.property_image_id = pi.id
WHERE pi.organization_id = 'other-org-id';
-- Expected: 0 (RLS blocks)
```

### Integration Tests (Code Level)

**After @dev updates code**:

- [ ] Edit page loads 50 images in < 100ms
- [ ] Gallery displays all variants correctly
- [ ] No N+1 queries visible in Network tab
- [ ] RLS policies still enforced (can't access other org images)

### Load Test

```sql
-- Simulate edit page load for large property
EXPLAIN ANALYZE
SELECT
  pi.*,
  array_agg(iv.* ORDER BY iv.variant_type) AS variants
FROM property_images pi
LEFT JOIN image_variants iv ON iv.property_image_id = pi.id
WHERE pi.property_id = 'large-property-id'
GROUP BY pi.id
ORDER BY pi.display_order;
```

---

## Timeline & Responsibilities

| Task | Owner | Duration | Status |
|------|-------|----------|--------|
| 1.1 Create index migration | @data-engineer | 10 min | Ready |
| 1.2 Verify RLS | @data-engineer | 5 min | Ready |
| 1.3 Document convention | @data-engineer | 10 min | Ready |
| **Phase 1 DB Total** | | **25 min** | |
| 2.1 Update reloadGallery() | @dev | 15 min | Pending |
| 2.2 Update getImageUrl() | @dev | 10 min | Pending |
| 2.3 Test gallery | @dev | 20 min | Pending |
| **Phase 1 Code Total** | | **45 min** | |
| 3.1 Deploy & Monitor | @devops | 10 min | Pending |
| **PHASE 1 COMPLETE** | | **~1.5 hours** | |

---

## Deployment Checklist

### Pre-Deployment (Production)

- [ ] Migration file created and tested locally
- [ ] Index size estimated (< 50MB)
- [ ] Backup taken (`pg_dump`)
- [ ] Code changes ready (waiting for @dev)
- [ ] Performance baselines recorded
- [ ] Rollback plan documented

### Deployment Window

**Recommended**: Tuesday-Thursday, 2-4 AM UTC (off-peak)
- Home Stay users: 9-11 PM São Paulo time
- Minimal login activity
- Support team on call

### Post-Deployment (1 hour monitoring)

- [ ] Index created successfully
- [ ] No unexpected lock waits
- [ ] Query times improved
- [ ] RLS policies enforced
- [ ] User sessions healthy
- [ ] Error rates normal

---

## Success Criteria

✅ **Phase 1 Complete When**:

1. **Index Created**: `pg_indexes` shows idx_image_variants_property_image_id
2. **Query Optimized**: EXPLAIN shows Index Scan, not Seq Scan
3. **Code Updated**: @dev implements array_agg approach
4. **Performance Target**: Edit page < 100ms for 50 images
5. **Testing Passed**: All validation checks complete
6. **RLS Verified**: Multi-tenancy isolation confirmed

---

## Appendix: Migration File Template

**Filename**: `supabase/migrations/20260326_01_add_property_images_index.sql`

```sql
-- Property Images Phase 1: Add Missing Foreign Key Index
-- Resolves N+1 query pattern for variant loading
-- Status: Non-breaking schema change

-- Create index on foreign key for performance
CREATE INDEX IF NOT EXISTS idx_image_variants_property_image_id
  ON public.image_variants(property_image_id);

-- Update table statistics for query planner
ANALYZE public.image_variants;

-- Comment for documentation
COMMENT ON INDEX idx_image_variants_property_image_id IS
  'Foreign key index for efficient variant lookups. ' ||
  'Created 2026-03-25 as part of Phase 1 optimization ' ||
  '(property-images-enhancement workflow)';
```

---

**Status**: ✅ **Migration Plan Complete**

**Next Step**: Hand off to @dev for code implementation (Task 2.1-2.3)

— Dara, arquitetando dados 🗄️
