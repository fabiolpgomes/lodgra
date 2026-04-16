# Storage RLS Policies Configuration Guide

**Date**: 2026-03-25
**Status**: Configuration Steps for Supabase Dashboard
**Scope**: property-images bucket access control

---

## Overview

The `property-images` bucket requires RLS (Row-Level Security) policies to enforce:
- ✅ Managers can upload images
- ✅ Users can view images for their organization's properties
- ✅ Public access for public properties
- ✅ Admin-only management of storage

---

## Configuration Steps

### Step 1: Navigate to Storage RLS

1. Open Supabase Dashboard
2. Go to **Storage** → **property-images**
3. Click **Policies** tab
4. Click **Add New Policy**

---

### Step 2: Manager Upload Policy

**Name**: `Allow managers to upload images`

**Statement**:
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' IN ('admin', 'manager')
AND (auth.jwt() ->> 'organization_id')::uuid = (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

**Operations**:
- ✅ INSERT

**Description**: Allows admin and manager roles to upload images to their organization's properties.

---

### Step 3: User View Own Org Policy

**Name**: `Allow users to view organization images`

**Statement**:
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' IS NOT NULL
AND (auth.jwt() ->> 'organization_id')::uuid IN (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

**Operations**:
- ✅ SELECT

**Description**: Allows authenticated users to view images for properties in their organization.

---

### Step 4: Public Property Access

**Name**: `Allow public access for public properties`

**Statement**:
```sql
(bucket_id = 'property-images')
AND (
  SELECT is_public FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
) = true
```

**Operations**:
- ✅ SELECT

**Description**: Allows public (unauthenticated) access to images of public properties.

---

### Step 5: Admin Management Policy

**Name**: `Allow admins to delete images`

**Statement**:
```sql
(bucket_id = 'property-images')
AND auth.jwt() ->> 'role' = 'admin'
AND (auth.jwt() ->> 'organization_id')::uuid = (
  SELECT organization_id FROM properties
  WHERE properties.id = (path_tokens[2])::uuid
)
```

**Operations**:
- ✅ DELETE

**Description**: Allows admin role to delete images from their organization's storage.

---

## Verification Checklist

After configuring all policies, verify:

- [ ] **Manager can upload**: `PUT /storage/v1/object/property-images/{org}/{prop}/{id}.jpg`
- [ ] **User can view**: `GET /storage/v1/object/property-images/{org}/{prop}/{id}.jpg`
- [ ] **Public can view**: Same GET above, while logged out
- [ ] **Admin can delete**: `DELETE /storage/v1/object/property-images/{org}/{prop}/{id}.jpg`

---

## Testing in Supabase SQL Editor

```sql
-- Check if policy is working
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%property%';
```

---

## Troubleshooting

**Issue**: "Permission denied" when uploading

**Solution**: Verify:
1. User has manager+ role
2. Organization ID matches property's organization
3. Policy statement references correct path tokens
4. Policy is enabled (toggle in dashboard)

**Issue**: Public access not working

**Solution**:
1. Verify property.is_public = true
2. Remove auth requirement from policy (use OR condition)
3. Test with browser (bypass CORS in dev)

---

## Notes

- `path_tokens` in Supabase: array of path segments
  - `path_tokens[1]` = organization_id
  - `path_tokens[2]` = property_id
  - `path_tokens[3]` = file_name
- All paths must follow format: `{org_id}/{prop_id}/{filename}`
- Policies are checked in order (all must pass for operation to succeed)

---

**Status**: Ready for Dashboard Configuration
**Next**: Configure 5 policies above, then test access patterns
