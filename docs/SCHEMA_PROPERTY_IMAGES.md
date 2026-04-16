# Property Images Schema Architecture

**Date**: 2026-03-25
**Status**: Ready for Sprint 1 deployment
**Related Migration**: `supabase/migrations/20260325_01_property_images_schema.sql`

## Overview

This document describes the database schema for property images with responsive WebP variants, organized for Supabase Storage integration.

## Design Principles

✅ **Multi-tenant isolation** - Organization-level data security via RLS
✅ **Responsive design support** - Multiple variants (thumb, mobile, tablet, desktop)
✅ **Storage efficiency** - WebP primary format (~70% size reduction)
✅ **Audit trail** - Track uploader and timestamps
✅ **Zero-downtime migration** - Backward compatible with existing `properties.photos`
✅ **Performance-first indexing** - Fast queries for galleries and SEO metadata

## Tables

### `property_images`

Core metadata about property images.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Unique identifier |
| `organization_id` | UUID | FK→organizations | Multi-tenant isolation |
| `property_id` | UUID | FK→properties | Which property this image belongs to |
| `original_filename` | TEXT | NOT NULL | Original filename (e.g., "living-room.jpg") |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0, ≥0 | Gallery order (user can reorder) |
| `alt_text` | TEXT | Optional | Accessibility + SEO |
| `is_primary` | BOOLEAN | NOT NULL, DEFAULT FALSE, UNIQUE per property | Cover photo for listing |
| `file_size_bytes` | INTEGER | Optional | Original file size for UI display |
| `mime_type` | TEXT | DEFAULT 'image/jpeg' | Original file type |
| `width` | INTEGER | NOT NULL, >0 | Original image width (px) |
| `height` | INTEGER | NOT NULL, >0 | Original image height (px) |
| `uploaded_by` | UUID | FK→auth.users, ON DELETE SET NULL | Audit: who uploaded |
| `created_at` | TIMESTAMP | DEFAULT now() | Audit: when uploaded |
| `updated_at` | TIMESTAMP | DEFAULT now() | Audit: when last modified |

**Constraints**:
- `FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE`
- `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`
- `UNIQUE(property_id, is_primary) WHERE is_primary = TRUE` - Only one primary per property
- `CHECK (display_order >= 0)` - Can't have negative order
- `CHECK (width > 0 AND height > 0)` - Valid dimensions

### `image_variants`

Generated responsive variants of images (WebP + JPEG fallbacks).

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | UUID | PK | Unique identifier |
| `property_image_id` | UUID | FK→property_images | Parent image |
| `variant_type` | VARCHAR(20) | IN ('thumb', 'mobile', 'tablet', 'desktop', 'original') | Responsive breakpoint |
| `storage_path` | TEXT | NOT NULL | Path in Supabase Storage bucket |
| `width` | INTEGER | NOT NULL, >0 | Variant width (px) |
| `height` | INTEGER | NOT NULL, >0 | Variant height (px) |
| `file_size_bytes` | INTEGER | Optional | File size of this variant |
| `format` | VARCHAR(10) | IN ('webp', 'jpeg') | Image format |
| `created_at` | TIMESTAMP | DEFAULT now() | When variant was generated |

**Constraints**:
- `FOREIGN KEY (property_image_id) REFERENCES property_images(id) ON DELETE CASCADE`
- `UNIQUE(property_image_id, variant_type, format)` - One variant per type+format per image
- `CHECK (width > 0 AND height > 0)` - Valid dimensions

**Variant Types** (responsive breakpoints):
```
thumb:    300x300px   - Mobile gallery thumbnail
mobile:   600x600px   - Mobile view (iPhone)
tablet:   1024x1024px - iPad/tablet
desktop:  1920x1920px - Desktop/large screens
original: as-uploaded - Full size backup
```

## Responsive Image Strategy

### Breakpoints

```
Mobile:   < 640px   → Use thumb or mobile variant
Tablet:   641-1024px → Use tablet variant
Desktop:  > 1024px   → Use desktop variant
```

### Formats

**Primary**: WebP
- Better compression (~70% smaller than JPEG)
- Modern browser support (94%+ globally)
- Quality: 80% (sweet spot for visual quality vs size)

**Fallback**: JPEG
- For older browsers (IE, very old Safari)
- Quality: 85% (slightly higher to compensate for format)

### Example HTML (Next.js Image component)

```tsx
<picture>
  {/* WebP for modern browsers */}
  <source
    srcSet={`${desktop_webp} 1920w, ${tablet_webp} 1024w, ${mobile_webp} 600w`}
    type="image/webp"
    media="(min-width: 640px)"
  />
  {/* JPEG fallback */}
  <source
    srcSet={`${desktop_jpeg} 1920w, ${tablet_jpeg} 1024w, ${mobile_jpeg} 600w`}
    type="image/jpeg"
    media="(min-width: 640px)"
  />
  {/* Mobile */}
  <source srcSet={`${mobile_webp}, ${mobile_jpeg}`} type="image/webp" />
  <img src={mobile_jpeg} alt={altText} />
</picture>
```

## Storage Structure (Supabase Storage)

```
Bucket: property-images

{organization_id}/
  {property_id}/
    {property_image_id}/
      original.jpg              ← Original uploaded file
      thumb.webp
      thumb.jpeg
      mobile.webp
      mobile.jpeg
      tablet.webp
      tablet.jpeg
      desktop.webp
      desktop.jpeg
```

**Path Generation**:
```typescript
const storagePath = `${organizationId}/${propertyId}/${imageId}/${variantType}.${format}`;
// Example: d47e9c12-a1b2-3c4d-e5f6-g7h8i9j0k1l2/property-123/image-456/desktop.webp
```

## RLS Policies

### property_images

| Policy | Mode | Who | Condition |
|--------|------|-----|-----------|
| `property_images_select_with_access` | SELECT | All | User's org + property access via `user_has_property_access()` |
| `property_images_select_public` | SELECT | All | Property is public (`is_public = TRUE`) |
| `property_images_insert_manager_or_admin` | INSERT | Manager+ | Org match + role ≥ manager on property |
| `property_images_update_manager_or_admin` | UPDATE | Manager+ | Org match + role ≥ manager + immutable fields protected |
| `property_images_delete_admin_only` | DELETE | Admin | Org match + role = admin on property |

### image_variants

| Policy | Mode | Who | Condition |
|--------|------|-----|-----------|
| `image_variants_select_with_access` | SELECT | All | Parent image accessible + org match |
| `image_variants_select_public` | SELECT | All | Parent property is public |
| *(No INSERT/UPDATE/DELETE)* | - | - | Server-side only (Edge Function) |

**Note**: `image_variants` INSERT/UPDATE/DELETE are handled exclusively by server-side Edge Functions, not exposed to client.

## Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_property_images_property_order` | property_images | (property_id, display_order) | Get all images for property (most common query) |
| `idx_property_images_org_property` | property_images | (organization_id, property_id) | RLS enforcement, org isolation |
| `idx_property_images_primary` | property_images | (property_id) WHERE is_primary | Find cover photo (OG image for SEO) |
| `idx_image_variants_property_image` | image_variants | (property_image_id, variant_type, format) | Fetch srcset variants |

## API Integration Points

### Image Upload

**Endpoint**: `POST /api/properties/{propertyId}/images`

1. Client uploads FormData (file + metadata)
2. Server validates (format, size, dimensions)
3. Calls Supabase Storage `upload()`
4. Triggers Edge Function `process-image-variants`
5. Edge Function:
   - Downloads original
   - Generates WebP variants (via libvips or ImageMagick)
   - Uploads all variants to Storage
   - Inserts `property_images` + `image_variants` records
6. Returns URLs for all variants

### Image Display

**Component**: `PropertyGallery.tsx`

1. Query `property_images` + `image_variants` by property_id
2. Build srcset from variants (WebP primary, JPEG fallback)
3. Render responsive `<picture>` element

### Image Reordering

**Endpoint**: `PATCH /api/properties/{propertyId}/images/reorder`

```typescript
PATCH /api/properties/prop-123/images/reorder
{
  "images": [
    { "id": "img-1", "display_order": 0 },
    { "id": "img-2", "display_order": 1 },
    { "id": "img-3", "display_order": 2 }
  ]
}
```

### Image Deletion

**Endpoint**: `DELETE /api/properties/{propertyId}/images/{imageId}`

1. Verify admin permission (RLS)
2. Delete `property_images` record (CASCADE deletes `image_variants`)
3. Delete files from Supabase Storage
4. Returns success

## Migration Safety

### Zero Downtime

✅ New tables created (no schema changes to existing tables)
✅ `properties.photos` remains unchanged
✅ No blocking operations
✅ Can be applied during business hours

### Backward Compatibility

- Existing image URLs in `properties.photos` continue to work
- New uploads go to new schema
- 6-month deprecation period before `properties.photos` removal

### Rollback

If needed, run `20260325_01_property_images_schema_rollback.sql`:

```bash
psql -d postgres://<user>:<password>@<host>:5432/<database> \
  -f supabase/migrations/20260325_01_property_images_schema_rollback.sql
```

Requires:
- No data in `property_images` table
- Or manually migrate data first

## Performance Considerations

### Query Optimization

**Get all images for property**:
```sql
SELECT pi.*,
       json_agg(json_build_object(
         'variant_type', iv.variant_type,
         'storage_path', iv.storage_path,
         'format', iv.format
       ) ORDER BY iv.variant_type) as variants
FROM property_images pi
LEFT JOIN image_variants iv ON pi.id = iv.property_image_id
WHERE pi.property_id = $1
ORDER BY pi.display_order
GROUP BY pi.id;
```

- Uses index on `(property_id, display_order)`
- Aggregates variants in single query (no N+1)
- RLS applied automatically

**Get primary image (for SEO)**:
```sql
SELECT * FROM property_images
WHERE property_id = $1 AND is_primary = TRUE
LIMIT 1;
```

- Uses filtered index on `(property_id) WHERE is_primary = TRUE`
- ~0.5ms query time

### Storage Bandwidth

**WebP compression**:
- Typical JPEG (600x600): ~80KB
- WebP variant (600x600): ~25KB (68% reduction)
- Per property (5 images × 4 variants): ~600KB vs 1.6MB (62% savings)

**CDN caching**:
- Supabase Storage uses Cloudflare CDN
- Images cached for 7 days (configurable)
- Geographic distribution (low latency worldwide)

## Development Checklist

- [ ] Migration applied: `20260325_01_property_images_schema.sql`
- [ ] Rollback tested: `20260325_01_property_images_schema_rollback.sql`
- [ ] RLS policies validated (security audit)
- [ ] Supabase Storage bucket created with auth rules
- [ ] Edge Function deployed (`process-image-variants`)
- [ ] API endpoints tested (upload, reorder, delete)
- [ ] Components updated (ImageUploadDragDrop, PropertyGallery)
- [ ] Performance baseline established
- [ ] Production data migration completed (if needed)

## Related Stories

- Sprint 1: Schema & RLS design (this document)
- Sprint 2: Backend APIs & Edge Functions
- Sprint 3: Frontend components & data migration

---

**Generated by**: Dara (Data Engineer)
**Last Updated**: 2026-03-25
