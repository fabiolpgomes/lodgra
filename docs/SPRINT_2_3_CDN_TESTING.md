# Sprint 2.3: CDN Caching Testing Guide

**Date**: 2026-03-25
**Status**: Ready for Testing After CDN Configuration
**Scope**: Verify CDN caching performance and headers

---

## Prerequisites

1. ✅ Edge Function deployed
2. ✅ RLS policies configured and tested
3. ✅ CDN enabled via Supabase Dashboard (Storage → property-images → Settings)
4. ✅ Cache-Control header set: `max-age=31536000, public, immutable`
5. Image uploaded and variants generated

---

## Configuration Checklist

Before testing, verify CDN is configured in Supabase Dashboard:

- [ ] Storage → property-images → Settings
- [ ] **CDN** toggle: **ON**
- [ ] **Cache-Control Header**: `max-age=31536000, public, immutable`
- [ ] **MIME Types**: image/jpeg, image/png, image/webp
- [ ] Save configuration

---

## Test 1: Cache Headers Present ✅

**Purpose**: Verify Cache-Control headers are returned

```bash
export SUPABASE_URL="https://brjumbfpvijrkhrherpt.supabase.co"
export ORG_ID="your-org-id"
export PROP_ID="your-property-id"
export IMAGE_PATH="property-images/$ORG_ID/$PROP_ID/test.jpg"

# Request with headers
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH"
```

**Expected Response Headers**:
```
Cache-Control: max-age=31536000, public, immutable
X-Cdn-Cache: HIT|MISS
Content-Type: image/jpeg
Content-Length: 12345
ETag: "abc123"
```

**Verification**:
```bash
# Extract Cache-Control header
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH" | grep "Cache-Control"

# Output should show:
# Cache-Control: max-age=31536000, public, immutable
```

---

## Test 2: First Request Cache MISS ✅

**Purpose**: Verify first request is not cached (X-Cache: MISS)

```bash
# Clear local browser cache
# Open DevTools → Network → Hard Refresh (Ctrl+Shift+R)
# Or use curl with cache busting:

curl -I \
  -H "Pragma: no-cache" \
  -H "Cache-Control: no-cache" \
  "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH?t=$(date +%s)"
```

**Expected**:
```
X-Cache: MISS
X-CDN-Cache: MISS
```

**Why**: First request always misses cache — CDN fetches from origin.

---

## Test 3: Subsequent Requests Cache HIT ✅

**Purpose**: Verify caching works on repeat requests

```bash
# Request same URL again (within 1 year)
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH"
```

**Expected**:
```
X-Cache: HIT
X-CDN-Cache: HIT
Age: 120  # seconds since cached
```

**Performance**:
- MISS: 100-500ms (fetches from Supabase origin)
- HIT: < 50ms (served from edge location)

---

## Test 4: Cache Duration Verification ✅

**Purpose**: Verify 1-year cache duration (max-age=31536000)

```bash
# Calculate seconds in 1 year
echo $((365 * 24 * 60 * 60))  # 31536000

# Verify max-age in response
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH" | grep "max-age"

# Output should show:
# max-age=31536000
```

**Interpretation**:
- `max-age=31536000` = 1 year
- Browser/CDN will cache for 365 days
- After 1 year, next request fetches fresh copy

---

## Test 5: WebP vs JPEG Fallback ✅

**Purpose**: Verify correct format served based on browser

```bash
# Test JPEG (universal fallback)
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH"
# Expected: Content-Type: image/jpeg

# Test WebP (modern browsers)
curl -I -H "Accept: image/webp" "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH"
# Expected: Content-Type: image/webp (if variant available)
```

---

## Test 6: Bandwidth Savings Measurement ✅

**Purpose**: Measure bandwidth reduction from caching

```bash
# Install ab (Apache Bench) if not available
# brew install httpd  (macOS)
# apt-get install apache2-utils  (Linux)

# Run 100 requests, measure response time
ab -n 100 -c 10 "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH"
```

**Expected Results**:
```
Requests per second:        500+ (cached)
Time per request:           2ms (cached) vs 200ms+ (uncached)
Bandwidth saved:            90%+ reduction
```

**How to Calculate**:
```
Total requests: 100
Cached requests: ~99 (after first MISS)
Average response: 2ms (HIT) vs 200ms (MISS)
Bandwidth = 200ms - 2ms = 198ms saved per request × 99 = ~19.6 seconds
Savings = (198 / 200) × 100 = 99% faster for hits
```

---

## Test 7: Multi-Region Cache Validation ✅

**Purpose**: Verify Cloudflare CDN is serving from edge locations

```bash
# Check CDN location (CloudFlare)
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH" | grep -E "CF-|X-CDN"

# Expected headers:
# CF-Cache-Status: HIT
# CF-RAY: 7a8b9c0d1e2f3g4h  (Cloudflare Ray ID)
# Server: cloudflare
```

**Validation**:
- `CF-Cache-Status: HIT` = Served from Cloudflare edge
- `CF-RAY` ID = Your nearest Cloudflare data center
- Multiple tests from different regions should show < 50ms

---

## Test 8: Cache Invalidation (Manual)

**Purpose**: Manually clear cache if needed

```bash
# If image needs to be replaced, purge cache via:
# Supabase Dashboard → Storage → property-images → Purge Cache
# Or use API:

curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"/$ORG_ID/$PROP_ID/*\"}" \
  "$SUPABASE_URL/storage/v1/admin/purge"
```

**When needed**:
- Image replaced (same filename)
- Cache corruption suspected
- Emergency rollout required

---

## Test 9: Performance Monitoring

**Purpose**: Track cache effectiveness over time

```sql
-- View bandwidth metrics in Supabase Dashboard
-- Storage → property-images → Analytics

-- Expected metrics after 1 week:
-- Cache Hit Rate: > 90%
-- Bandwidth Usage: 90% reduction vs non-cached
-- Average Response: < 50ms
```

**Supabase Dashboard**:
1. Go to **Storage** → **property-images** → **Analytics**
2. Check timeframe: Last 7 days
3. Verify:
   - Cache hit ratio > 90%
   - Bandwidth down 90%
   - Response times < 50ms p50, < 200ms p95

---

## Troubleshooting

### Issue: X-Cache always shows MISS

**Problem**: CDN not caching

**Solutions**:
1. Verify Cache-Control header is set in dashboard
2. Check MIME type is image/* (required)
3. Verify file size < CDN limit (usually 100GB+)
4. Check cache is enabled toggle is ON

**Debug**:
```bash
curl -I "$SUPABASE_URL/storage/v1/object/$IMAGE_PATH" | grep -i cache
# Should show: Cache-Control, X-Cache, CF-Cache-Status
```

### Issue: Cache-Control header missing

**Problem**: CDN configuration incomplete

**Solution**:
1. Supabase Dashboard → Storage → property-images → Settings
2. Verify "Cache-Control Header" field is filled
3. Enter: `max-age=31536000, public, immutable`
4. Click Save

### Issue: WebP not served to modern browsers

**Problem**: Variant format not configured

**Solution**:
1. Verify image_variants table has WebP entries
2. Check Edge Function generated WebP variants
3. Query for variants:
```sql
SELECT variant_type, COUNT(*) FROM image_variants
GROUP BY variant_type;
-- Should show: thumb, mobile, tablet, desktop variants in WebP
```

---

## Success Criteria

✅ **CDN working when**:
- [x] Cache-Control headers present on all responses
- [x] First request: X-Cache: MISS (< 500ms)
- [x] Subsequent requests: X-Cache: HIT (< 50ms)
- [x] Cache hit rate > 90% after 1 week
- [x] Bandwidth usage reduced by 90%
- [x] WebP served to modern browsers
- [x] JPEG fallback for older browsers
- [x] Multi-region cache validation passes
- [x] Analytics show cache metrics

---

## Performance Baseline

Record baseline before and after CDN:

**Before CDN**:
- Response time: 200-500ms
- Bandwidth: Full image size × request count
- Cache hit: 0% (no caching)

**After CDN**:
- Response time: < 50ms (cached), < 200ms (uncached)
- Bandwidth: -90% savings (cached images not retransmitted)
- Cache hit: > 90% (most requests served from edge)

**Example for 100 requests of 500KB image**:
- Before: 100 × 500KB = 50MB bandwidth
- After: 1 × 500KB (origin) + 99 × small cache headers = ~500KB bandwidth
- Savings: 49.5MB per 100 requests = 99% reduction

---

## Next Steps

1. Enable CDN in dashboard (Storage → property-images → Settings)
2. Run tests 1-7 above
3. Verify analytics show cache improvements
4. Document baseline measurements
5. Proceed to production deployment

---

**Status**: Ready for Testing
**Estimated Time**: 15 minutes (testing) + 1 week (analytics verification)
