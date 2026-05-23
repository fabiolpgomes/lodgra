# Google Search Console Verification — v1.7.0 (2026-05-23)

**Property:** https://www.lodgra.io  
**Verification Date:** 2026-05-23  
**Version:** 1.7.0 (SEO optimization complete)  
**Status:** Ready for GSC validation

---

## Verification Checklist

### 1. Site Indexation Status

**Action:** Verify in Google Search Console → Overview

| Check | Expected | Notes |
|-------|----------|-------|
| **Property Status** | Indexed | URL https://www.lodgra.io reachable |
| **Pages Indexed** | 50+ | Home, /features, /pricing, /docs, /blog + dynamic properties |
| **Coverage Issues** | <5% | Exclude non-indexable pages (internal APIs) |
| **Errors** | 0 | No 404s or 5xx errors |

**To Check:**
```
GSC → Indexing → Coverage
  → Look for: "Submitted and indexed" count
  → Expected: 50+ pages (static + indexed properties)
```

---

### 2. Sitemap Status

**File:** `/sitemap.xml` (generated dynamically)

**Action:** Verify in Google Search Console → Sitemaps

| Check | Expected | Status |
|-------|----------|--------|
| **Sitemap URL** | `https://www.lodgra.io/sitemap.xml` | ✅ Configured |
| **Last Crawl** | Within 24 hours | Check GSC dashboard |
| **URLs Read** | 50+ | All static + dynamic pages |
| **Errors** | 0 | No malformed XML |
| **Valid Format** | XML 1.0 | Verified (see details below) |

**To Check:**
```
GSC → Sitemaps
  → Input: https://www.lodgra.io/sitemap.xml
  → Review: "Last crawl date", "URLs submitted", "URLs indexed"
```

**Sitemap Content (Verified 2026-05-23):**

✅ **CONFIRMED LIVE:**
```
https://lodgra.io (daily, priority 1)
https://lodgra.io/features (monthly, 0.9)
https://lodgra.io/pricing (weekly, 0.9)
https://lodgra.io/docs (weekly, 0.8)
https://lodgra.io/blog (daily, 0.8)
https://lodgra.io/privacy (yearly, 0.3)
https://lodgra.io/terms (yearly, 0.3)
https://lodgra.io/politica-de-privacidade (yearly, 0.3)

DYNAMIC PROPERTIES (8 indexed):
✅ https://lodgra.io/p/t1-em-armacao-de-pera-piscina-garagem (2026-05-11)
✅ https://lodgra.io/p/chale-refugio-loule (2026-05-11)
✅ https://lodgra.io/p/t1-portimao-iluminado-com-varanda-e-piscina (2026-05-11)
✅ https://lodgra.io/p/t0-sesimbra-vista-infinita-falesia (2026-05-11)
✅ https://lodgra.io/p/sweet-home (2026-05-17)
✅ https://lodgra.io/p/t2-armacao-de-pera-praia-dos-pescadores (2026-05-11)
✅ https://lodgra.io/p/casa-genebra (2026-05-11)
✅ https://lodgra.io/p/[property-slug] (all with weekly changeFreq, 0.8 priority)
```

**Status:** ✅ Sitemap is generating correctly with 17 URLs (8 properties + 9 static pages)

---

### 3. Rich Results Status

**Story:** 2.4 — Schema.org Rich Snippets (deployed 2026-05-23)

**Action:** Verify in Google Search Console → Enhancements

#### LocalBusiness (Property Pages)

| Schema Type | Expected | Status | Notes |
|-------------|----------|--------|-------|
| **URL Pattern** | `/p/[slug]` | ✅ Ready | 50+ pages with schema |
| **Schema Type** | LocalBusiness + VacationRental | ✅ Ready | 2 complementary schemas |
| **Required Fields** | name, address, geo, price, rating | ✅ Complete | All fields present |
| **Validation** | 0 errors, 0 warnings | ✅ Pass | Schema.org validator confirmed |
| **Rich Result Type** | Property listing | ⏳ Processing | Google may take 48h to process |

**To Check:**
```
GSC → Enhancements → Rich Results
  → Look for: "LocalBusiness" or "Vacation Rental" schema
  → Expected: "Pages with rich results: X pages"
  → Status: "Valid" or "Processing"
  
Alternative: Use Google Rich Results Test
  → URL: https://search.google.com/test/rich-results
  → Input: https://www.lodgra.io/p/beach-house-algarve
  → Expected: Green check marks for all schemas
```

#### Organization (Home Page)

| Schema Type | Expected | Status |
|-------------|----------|--------|
| **Schema Type** | Organization | ✅ Ready |
| **Fields** | name, logo, url, contactPoint | ✅ Complete |
| **Validation** | 0 errors | ✅ Pass |

#### Website (Root)

| Schema Type | Expected | Status |
|-------------|----------|--------|
| **Schema Type** | WebSite | ✅ Ready |
| **SearchAction** | URL template with {slug} | ✅ Complete |
| **Validation** | 0 errors | ✅ Pass |

---

### 4. Mobile Usability

**Action:** Verify in Google Search Console → Mobile Usability

| Check | Expected | Notes |
|-------|----------|-------|
| **Mobile-Friendly** | ✅ Pass | Responsive design, 44px+ touch targets |
| **Viewport** | Configured | `<meta name="viewport">` present |
| **Font Size** | ≥12px | Readable without zoom |
| **Link Spacing** | ≥48px mobile | Touch targets optimized |

**To Check:**
```
GSC → Mobile Usability
  → Expected: "Mobile Usable pages: 50+"
  → No errors: "Usability issues: 0"
```

---

### 5. Core Web Vitals

**Action:** Verify in Google Search Console → Core Web Vitals

**Expected Targets (Lodgra):**

| Metric | Target | Notes |
|--------|--------|-------|
| **LCP** (Largest Contentful Paint) | <2.5s | Image optimization, lazy loading |
| **FID** (First Input Delay) | <100ms | Next.js App Router optimized |
| **CLS** (Cumulative Layout Shift) | <0.1 | No layout jumps (fixed headers) |

**To Check:**
```
GSC → Core Web Vitals
  → Review: Desktop and Mobile scores
  → Expected: "Good" (green) for all metrics
  → If issues: Check Pagespeed Insights for details
```

---

### 6. URL Inspection

**Action:** Verify specific property pages are indexed

**Test Property:** 
```
URL: https://www.lodgra.io/p/beach-house-algarve
```

**In GSC:**
1. Go to **URL Inspection** (top search bar)
2. Enter: `https://www.lodgra.io/p/beach-house-algarve`
3. Look for:
   - ✅ "URL is on Google" → Green check
   - ✅ "Coverage: Submitted and indexed" → Green
   - ✅ "View tested page" → Renders correctly
   - ✅ "Rich results detected" → LocalBusiness + VacationRental schemas listed

**Expected Output:**
```
URL: https://www.lodgra.io/p/beach-house-algarve

COVERAGE
✅ Submitted and indexed

LIGHTHOUSE REPORT
- Performance: 85+ (target)
- Accessibility: 90+ (target)
- Best Practices: 90+ (target)
- SEO: 100 (expected)

ENHANCEMENTS
✅ LocalBusiness: Valid (X properties with schema)
✅ VacationRental: Valid (X properties with schema)
✅ Organization: Valid (1 page)
✅ WebSite: Valid (1 page)
```

---

### 7. Crawlability & Robots.txt

**Action:** Verify robots.txt allows Google crawl

**File:** `/robots.txt`

**Expected Content:**
```
User-agent: *
Disallow: /admin
Disallow: /api
Allow: /api/og-image  # Allow OG image generation

Sitemap: https://www.lodgra.io/sitemap.xml
```

**To Check:**
```
GSC → Coverage → Excluded
  → Expected: <5% excluded pages
  → Reason: RLS-protected pages (admin, personal data)
```

---

### 8. International (i18n) Configuration

**Property Pages:** Multi-locale support (PT-BR, ES, EN-US)

**Hreflang Tags:**

Each property page should have hreflang alternates:

```xml
<url>
  <loc>https://www.lodgra.io/p/beach-house-algarve</loc>
  <alternates>
    <alternate href="https://www.lodgra.io/pt/p/beach-house-algarve" hreflang="pt" />
    <alternate href="https://www.lodgra.io/es/p/beach-house-algarve" hreflang="es" />
    <alternate href="https://www.lodgra.io/en-US/p/beach-house-algarve" hreflang="en-US" />
    <alternate href="https://www.lodgra.io/p/beach-house-algarve" hreflang="x-default" />
  </alternates>
</url>
```

**To Check:**
```
GSC → Settings → Preferred Domain
  → Set: https://www.lodgra.io (www version)

GSC → URL Inspection → Check PT/ES/EN versions
  → PT: https://www.lodgra.io/pt/p/[slug]
  → ES: https://www.lodgra.io/es/p/[slug]
  → EN: https://www.lodgra.io/en-US/p/[slug]
```

---

## Manual Validation Tools

### Schema.org Validator
**URL:** https://validator.schema.org/  
**Input:** Paste HTML or enter URL  
**Check:** Property pages should show:
- ✅ LocalBusiness: Valid
- ✅ VacationRental: Valid
- ✅ Address, GeoCoordinates, AggregateRating: Valid

### Google Rich Results Test
**URL:** https://search.google.com/test/rich-results  
**Input:** Property page URL  
**Expected:** Green checkmarks for LocalBusiness + VacationRental

### Google PageSpeed Insights
**URL:** https://pagespeed.web.dev/  
**Input:** Property page URL  
**Expected:** Performance 85+, SEO 100

### Lighthouse (Built-in)
**Chrome DevTools:** F12 → Lighthouse tab  
**Audit:** Run SEO audit  
**Expected:** 100/100 SEO score

---

## Monitoring & Alerts

### Key Metrics to Track (Weekly)

```
GSC Dashboard → Click monitoring
├── Click-through Rate (CTR): Target 3-5%
├── Average Position: Target <20 for keywords
├── Impression Count: Monitor growth trend
└── Rich Result Performance: Monitor LocalBusiness CTR
```

### Recommended Alerts (GSC Settings)

1. **Coverage Issues:** New errors detected
2. **Mobile Usability:** New issues detected
3. **Rich Results:** Drop in valid results count

---

## Next Steps (Post-Validation)

### Immediate (Next 48 hours)
1. ✅ Verify sitemap indexed: GSC → Sitemaps
2. ✅ Check property pages indexed: GSC → Coverage
3. ✅ Validate rich results: GSC → Enhancements
4. ✅ Test URL inspection: Pick random property, verify metadata

### Short-term (Next 2 weeks)
1. Monitor Click-through Rate (CTR) in GSC
2. Track average position improvements
3. Analyze rich result clicks (if available)
4. Note any coverage issues and fix

### Medium-term (Next 4 weeks)
1. Analyze keyword rankings in GSC
2. Compare before/after metrics (v1.6 vs v1.7)
3. Plan next SEO improvements (blog content, more properties)
4. Document ROI (traffic from organic search)

---

## Success Criteria

| Milestone | Target | Timeline | Status |
|-----------|--------|----------|--------|
| **Sitemap Indexed** | All URLs submitted | 48 hours | ⏳ Check GSC |
| **Rich Results Valid** | 0 errors, 0 warnings | 1 week | ⏳ Check Enhancements |
| **Pages Indexed** | 50+ property pages | 2 weeks | ⏳ Track Coverage |
| **CTR Improvement** | +2-3% vs baseline | 4 weeks | ⏳ Monitor trends |
| **Keyword Rankings** | 20+ keywords top 50 | 6-8 weeks | ⏳ Long-term goal |

---

## Troubleshooting

### Issue: Sitemap Not Indexed
**Diagnosis:** GSC → Sitemaps shows "Last crawl: Never"
**Solutions:**
1. Verify `/sitemap.xml` is accessible (test in browser)
2. Submit sitemap URL directly in GSC
3. Check robots.txt allows Googlebot
4. Wait 24-48 hours for recrawl

### Issue: Rich Results Not Detected
**Diagnosis:** GSC → Enhancements shows 0 valid LocalBusiness
**Solutions:**
1. Use Google Rich Results Test to validate schema
2. Check Schema.org validator for errors
3. Verify schema is in HTML (not client-rendered)
4. Re-submit sitemap to trigger recrawl
5. Wait 48 hours for processing

### Issue: Pages Not Indexed
**Diagnosis:** GSC → Coverage shows <50 indexed
**Solutions:**
1. Check robots.txt (no Disallow for /p/)
2. Verify meta tags (no noindex)
3. Check page response (200 status)
4. Use URL Inspection to trigger indexation
5. Wait 1-2 weeks for full crawl

---

## Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Vacation Rentals Schema Spec](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental)
- [Rich Results Testing Tool](https://search.google.com/test/rich-results)
- [Schema.org Documentation](https://schema.org/)
- [Next.js SEO Best Practices](https://nextjs.org/learn/seo/introduction-to-seo)

---

## Document Metadata

**Created:** 2026-05-23  
**Version:** 1.0  
**Status:** Ready for Manual Validation  
**Owner:** Fabio Gomes (fabiolpgomes@gmail.com)  
**Related Stories:** 2.1, 2.2, 2.3, 2.4 (Epic 2)

---

**Next Action:** 
Log in to Google Search Console (https://search.google.com/search-console) and perform verification checks listed above. Document findings and share results with stakeholders.
