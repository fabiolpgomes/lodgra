# CDN Caching Setup for Property Images

**Date**: 2026-03-25
**Status**: Configuration Guide for Production
**Scope**: Caching strategy for responsive image variants

---

## Overview

Image variants (WebP/JPEG at multiple resolutions) should be cached aggressively since:
- They are immutable (once generated, never change)
- They represent significant bandwidth savings
- Repeat views benefit from edge caching

---

## Caching Strategy

### Original Images (Read-Only)

**Cache Duration**: 1 year (31536000 seconds)
**Reasoning**: Original files never change (immutable after upload)

```
Cache-Control: public, max-age=31536000, immutable
```

### Generated Variants (WebP/JPEG)

**Cache Duration**: 1 year (31536000 seconds)
**Reasoning**: Variants are deterministic and immutable

```
Cache-Control: public, max-age=31536000, immutable
```

### Metadata (property_images records)

**Cache Duration**: 1 hour (3600 seconds)
**Reasoning**: Metadata can change (alt_text, is_primary, order)

```
Cache-Control: public, max-age=3600
```

---

## Implementation: Supabase Storage

### Step 1: Configure Bucket Caching

1. **Dashboard**: Storage → property-images → Settings
2. Set **Cache Control**:
   ```
   max-age=31536000, public, immutable
   ```
3. Set **Allowed MIME types**:
   - `image/jpeg`
   - `image/png`
   - `image/webp`
4. Enable **CDN**: Toggle ON

### Step 2: Verify Cache Headers

Test cache headers on generated variants:

```bash
# Check cache headers
curl -I "https://[project].supabase.co/storage/v1/object/public/property-images/{org}/{prop}/{id}/desktop.webp"

# Expected response:
# Cache-Control: public, max-age=31536000, immutable
# Content-Type: image/webp
# ETag: "abc123..."
```

---

## CDN Edge Locations

Supabase uses Cloudflare's global CDN:
- **Regions**: 250+ cities worldwide
- **TTL**: 1 year for immutable content
- **Purge**: Automatic (no manual intervention needed)

---

## Performance Impact

### Bandwidth Savings

With aggressive caching:
- **First visit**: Full image download
- **Repeat visits**: Served from browser cache (0 bytes)
- **New user, same region**: Served from CDN edge (< 50ms)

### Estimated Savings

For 10,000 properties × 5 images/property:
- **Without caching**: ~500 GB/month bandwidth
- **With 1-year cache**: ~50 GB/month (90% reduction)

---

## Monitoring Caching

### Via Supabase Dashboard

1. Go to **Storage** → **property-images**
2. Check **Usage** tab
3. Monitor:
   - Cache hit rate
   - Bandwidth usage
   - Popular objects

### Via curl (Test Cache Hits)

```bash
# First request (cache miss)
curl -I "https://[project].supabase.co/storage/v1/object/public/property-images/org/prop/id.webp"
# Response: X-Cache: MISS

# Second request (cache hit)
curl -I "https://[project].supabase.co/storage/v1/object/public/property-images/org/prop/id.webp"
# Response: X-Cache: HIT
```

---

## Cache Invalidation

### When to Invalidate

Cache is never invalidated (by design) because:
- Images are immutable (never updated after creation)
- If changes needed, upload new image with new ID
- Old variants automatically expire after 1 year

### Manual Purge (if needed)

If urgent purge required:
1. Dashboard → Storage → property-images
2. Click image → More → Purge Cache
3. Confirm purge (takes < 5 minutes globally)

---

## Best Practices

### Image URL Format

✅ **Recommended** (cacheable for 1 year):
```
https://[project].supabase.co/storage/v1/object/public/property-images/{org}/{prop}/{id}/desktop.webp
```

❌ **Avoid** (bypasses cache):
```
https://[project].supabase.co/storage/v1/object/authenticated/property-images/...
```

### Content Delivery

Use `<picture>` element with proper srcset:

```html
<picture>
  <source
    srcSet="https://.../{id}/desktop.webp"
    type="image/webp"
    media="(min-width: 1024px)"
  />
  <source
    srcSet="https://.../{id}/mobile.webp"
    type="image/webp"
    media="(max-width: 1023px)"
  />
  <img src="https://.../{id}/desktop.jpeg" alt="Property" />
</picture>
```

---

## Troubleshooting

### Cache Not Working

1. **Check Cache-Control header**:
   ```bash
   curl -I https://... | grep -i cache-control
   ```

2. **Verify CDN enabled**:
   - Dashboard: Storage → Settings → CDN toggle

3. **Clear browser cache**:
   - Dev Tools → Application → Clear Storage

### High Bandwidth Usage

1. **Check for unoptimized images**:
   - Verify WebP is served to modern browsers
   - Monitor file sizes (should be < 500KB for variants)

2. **Review access patterns**:
   - Dashboard: Usage tab
   - Identify large files, high-traffic images

---

## Configuration Checklist

- [ ] Enable CDN on property-images bucket
- [ ] Set Cache-Control: `max-age=31536000, public, immutable`
- [ ] Verify MIME type restrictions
- [ ] Test cache headers with curl
- [ ] Monitor bandwidth savings
- [ ] Document cache purge procedures
- [ ] Alert on cache hit ratio drop

---

**Status**: Ready for Production
**Last Updated**: 2026-03-25
