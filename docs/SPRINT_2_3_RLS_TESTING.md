# Sprint 2.3: RLS Policy Testing Guide

**Date**: 2026-03-25
**Status**: Ready for Manual Testing After Policy Configuration
**Scope**: Verify all 4 RLS policies work correctly

---

## Prerequisites

1. ✅ Edge Function deployed (process-image-variants ACTIVE)
2. ✅ RLS policies configured in Supabase Dashboard (policies 1-4)
3. ⏳ CDN caching enabled (optional for this test)
4. Test credentials and project access

---

## Test Setup

Export environment variables (replace with your values):

```bash
export SUPABASE_URL="https://brjumbfpvijrkhrherpt.supabase.co"
export ANON_KEY="your-anon-key"
export SERVICE_KEY="your-service-role-key"
export ORG_ID="your-test-org-id"
export PROP_ID="your-test-property-id"
export TEST_FILE="test-image.jpg"

# Create test file
echo "test" > $TEST_FILE
```

---

## Test 1: Manager Upload Policy ✅

**Purpose**: Verify managers can upload images to their organization's properties

```bash
# Test: Manager uploads image
curl -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -F "file=@$TEST_FILE" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 200 OK, file created
# Error: 403 Forbidden if role is not manager/admin
```

**Verification**:
```sql
-- Check file was created
SELECT * FROM storage.objects
WHERE bucket_id = 'property-images'
AND name LIKE '%test-image%';
```

---

## Test 2: User View Organization Images ✅

**Purpose**: Verify users can view images from their organization

```bash
# Test: User views image from their org
curl -X GET \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 200 OK, file contents returned
# Error: 403 Forbidden if user not in organization
```

**Verification**:
```sql
-- Verify user's organization matches property's organization
SELECT user_org.organization_id, prop.organization_id
FROM user_profiles user_org
JOIN properties prop ON true
WHERE prop.id = '$PROP_ID'::uuid;
```

---

## Test 3: Public Property Access ✅

**Purpose**: Verify unauthenticated users can view images from public properties

```bash
# Test: Public user views image (no auth token)
curl -X GET \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 200 OK if property.is_public = true
# Error: 403 Forbidden if property is private
```

**Verification**:
```sql
-- Check property is public
SELECT id, name, is_public FROM properties
WHERE id = '$PROP_ID'::uuid;
```

---

## Test 4: Admin Delete Policy ✅

**Purpose**: Verify admin can delete images

```bash
# Test: Admin deletes image
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_KEY" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 200 OK, file deleted
# Error: 403 Forbidden if role is not admin
```

**Verification**:
```sql
-- Verify file was deleted
SELECT * FROM storage.objects
WHERE bucket_id = 'property-images'
AND name LIKE '%test-image%';

-- Should return: (no rows)
```

---

## Test 5: Negative Test Cases ❌

### Non-Manager Cannot Upload

```bash
# Test: Viewer role tries to upload (should fail)
curl -X POST \
  -H "Authorization: Bearer $VIEWER_KEY" \
  -F "file=@$TEST_FILE" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 403 Forbidden
```

### User Cannot View Other Organization's Images

```bash
# Test: User from Org A tries to view Org B's images (should fail)
curl -X GET \
  -H "Authorization: Bearer $ORG_A_KEY" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_B_ID/$PROP_B_ID/$TEST_FILE"

# Expected: 403 Forbidden
```

### Unauthenticated Cannot Upload

```bash
# Test: Upload without auth token (should fail)
curl -X POST \
  -F "file=@$TEST_FILE" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 403 Forbidden
```

### Non-Admin Cannot Delete

```bash
# Test: Manager tries to delete (should fail - only admin can)
curl -X DELETE \
  -H "Authorization: Bearer $MANAGER_KEY" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Expected: 403 Forbidden (only admin allowed)
```

---

## Test 6: Image Variants Table Integration

**Purpose**: Verify Edge Function creates variant records

```sql
-- After upload, verify Edge Function processed the image
SELECT id, property_image_id, variant_type, storage_path, created_at
FROM image_variants
WHERE property_image_id IN (
  SELECT id FROM property_images
  WHERE property_id = '$PROP_ID'::uuid
)
ORDER BY created_at DESC;

-- Expected: 5 records (thumb, mobile, tablet, desktop, original)
```

---

## Test 7: CDN Cache Headers (Optional)

**Purpose**: Verify CDN caching is configured after enabling

```bash
# Check cache headers on variant response
curl -I \
  -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/storage/v1/object/property-images/$ORG_ID/$PROP_ID/$TEST_FILE"

# Look for response headers:
# Cache-Control: max-age=31536000, public, immutable
# X-Cache: MISS (first request)
# X-Cache: HIT (subsequent requests)
```

---

## Troubleshooting

### Issue: "403 Forbidden" on all requests

**Possible causes**:
1. RLS policies not configured
2. Policies are disabled (toggle in dashboard)
3. User role/organization_id not set correctly in JWT

**Solution**:
```sql
-- Verify policies are enabled
SELECT policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- All 4 policies should appear with enabled status
```

### Issue: "User cannot view other org images" test fails

**Problem**: Policy is too permissive

**Solution**:
1. Check policy statement includes org isolation
2. Verify path_tokens[2] correctly extracts property_id
3. Confirm property_organization_id join is correct

---

## Success Criteria

✅ **All tests pass when**:
- [x] Manager upload succeeds
- [x] User view succeeds for own org
- [x] Public view succeeds without auth
- [x] Admin delete succeeds
- [x] Non-manager upload fails
- [x] Cross-org view fails
- [x] Unauthenticated upload fails
- [x] Non-admin delete fails
- [x] Image variants table populated
- [x] Cache headers present (if CDN enabled)

---

## Next Steps

1. Configure 4 RLS policies in Supabase Dashboard
2. Run tests 1-7 above
3. Document results
4. If all tests pass: Enable CDN caching
5. Run staging E2E tests
6. Tag v2.1.0 release
7. Deploy to production

---

**Status**: Ready for Testing
**Estimated Time**: 30 minutes (dashboard config) + 15 minutes (testing)
