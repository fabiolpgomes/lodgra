# Schema Snapshot: property-images-baseline

**Created**: 2026-03-25
**Purpose**: Baseline snapshot before Phase 1 optimization (variant loading N+1 fix)
**Status**: Pre-optimization state

---

## Current Schema State

### property_images Table

```sql
CREATE TABLE public.property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_storage_path text NOT NULL,
  alt_text text,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Existing indexes
CREATE INDEX idx_property_images_property_id ON property_images(property_id);
CREATE INDEX idx_property_images_organization_id ON property_images(organization_id);
CREATE INDEX idx_property_images_display_order ON property_images(property_id, display_order);
```

### image_variants Table

```sql
CREATE TABLE public.image_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_image_id uuid NOT NULL REFERENCES property_images(id) ON DELETE CASCADE,
  variant_type varchar(20) NOT NULL,  -- 'thumb', 'mobile', 'tablet', 'desktop', 'original'
  storage_path text NOT NULL,
  width integer,
  height integer,
  format varchar(10) NOT NULL,  -- 'webp', 'jpeg'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(property_image_id, variant_type, format)
);

-- Existing indexes
CREATE INDEX idx_image_variants_property_image_id ON image_variants(property_image_id);

-- MISSING: No composite index for common query patterns
```

### RLS Policies

**property_images**:
```sql
-- SELECT: User can see images for properties they have access to
CREATE POLICY "view_images_for_accessible_properties"
ON property_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_has_property_access($1, property_id)
  ) AND organization_id = get_user_organization_id()
);

-- INSERT/UPDATE/DELETE: Owner or property manager
```

**image_variants**:
```sql
-- SELECT: Inherited through property_images access
CREATE POLICY "view_variants_via_property_access"
ON image_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM property_images pi
    WHERE pi.id = property_image_id
      AND EXISTS (SELECT 1 FROM user_has_property_access(property_id))
  )
);
```

---

## Current Query Pattern (N+1 Problem)

**Application Code** (`src/app/properties/[id]/edit/page.tsx:46-87`):

```typescript
async function reloadGallery(id: string) {
  // Query 1: Load all images
  const { data: imagesResult } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', id)
    .order('display_order')

  // Queries 2..N+1: Load variants for each image
  if (imagesResult && imagesResult.length > 0) {
    const imagesWithVariants = await Promise.all(
      imagesResult.map(async (image) => {
        const { data: variants } = await supabase
          .from('image_variants')
          .select('*')
          .eq('property_image_id', image.id)
          .order('variant_type')

        return { ...image, variants: variants || [] }
      })
    )
    setGalleryImages(imagesWithVariants)
  }
}
```

**Performance Baseline**:
- 1 images query + N variant queries = N+1 total
- Example (50 images): 51 roundtrips, ~2.5s latency
- Index missing on `image_variants(property_image_id)` forces full table scan

---

## Proposed Optimizations (Phase 1)

### 1. Add Missing Foreign Key Index
```sql
CREATE INDEX IF NOT EXISTS idx_image_variants_property_image_id
ON image_variants(property_image_id);
```

**Impact**: Improves all queries on image_variants (current and future)

### 2. Deploy Array Aggregation Query
Replace N+1 with single SQL query using `array_agg()`:

```sql
SELECT
  pi.*,
  COALESCE(
    array_agg(iv.* ORDER BY iv.variant_type) FILTER (WHERE iv.id IS NOT NULL),
    ARRAY[]
  ) AS variants
FROM property_images pi
LEFT JOIN image_variants iv ON iv.property_image_id = pi.id
WHERE pi.property_id = $1
GROUP BY pi.id
ORDER BY pi.display_order;
```

**Code Change**: Update `reloadGallery()` to use optimized query

---

## Rollback Plan

If optimization causes issues:

1. **Revert code** to original N+1 approach
2. **Keep index** (beneficial for performance regardless)
3. **No schema changes** needed for rollback (index is non-breaking)

---

## Testing Strategy

### Before → After Comparison

| Scenario | Current | Optimized | Target |
|----------|---------|-----------|--------|
| 10 images | ~500ms | ~50ms | ✓ |
| 50 images | ~2.5s | ~150ms | ✓ |
| 100 images | ~5s | ~250ms | ✓ |

### Validation Checklist

- [ ] Edit page loads in < 100ms (50 images)
- [ ] Gallery displays all images correctly
- [ ] Drag-to-reorder still works
- [ ] Delete images still functional
- [ ] RLS policies still enforced
- [ ] No N+1 queries in network tab

---

## Migration Files Affected

None (code-only optimization for Phase 1, step 1).

**Future**: Index creation will be in migration `20260326_XX_add_property_images_index.sql`

---

**Status**: ✅ Baseline snapshot created. Ready for Phase 1 implementation.
