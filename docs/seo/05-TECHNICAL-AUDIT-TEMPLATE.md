# Technical SEO Audit Template

## Core Web Vitals Baseline

**Measured via:** Google PageSpeed Insights, Lighthouse

```
Desktop Performance:
- LCP (Largest Contentful Paint): _____ s [Target: < 2.5s]
- FID (First Input Delay): _____ ms [Target: < 100ms]
- CLS (Cumulative Layout Shift): _____ [Target: < 0.1]
- Lighthouse Score: _____/100 [Target: > 90]

Mobile Performance:
- LCP: _____ s
- FID: _____ ms
- CLS: _____
- PageSpeed Insights Grade: _____ [Target: Good]
```

## Technical Issues Checklist

### CRITICAL (Must fix for indexation)
- [ ] HTTPS: All pages serve over SSL
- [ ] Mobile-friendly: Passes Google Mobile-Friendly Test
- [ ] Crawlable: No robots.txt blocking, clear structure

### HIGH (Impacts indexation/ranking)
- [ ] Sitemap: XML sitemap submitted to GSC
- [ ] Meta tags: Title + description on 90%+ pages
- [ ] Duplicate content: Canonical tags where needed
- [ ] URL structure: Descriptive, no parameters when possible

### MEDIUM (Improves UX/ranking)
- [ ] Image alt text: 80%+ coverage
- [ ] Header structure: Single H1, logical H2/H3
- [ ] Internal linking: Contextual links between pages
- [ ] Page speed: No pages >3s load time

### LOW (Nice-to-have)
- [ ] Breadcrumbs: Navigation trail present
- [ ] Structured data: Schema markup implemented
- [ ] Security: No mixed content warnings

## Schema Markup Validation

**Test via:** Google Rich Results Test (https://search.google.com/test/rich-results)

```
LodgingBusiness schema (Story 26.2):
- [ ] Valid JSON-LD
- [ ] No CRITICAL errors
- [ ] All mandatory fields present
- [ ] Renders correctly in preview

LocalBusiness schema (if applicable):
- [ ] Added to homepage/property pages
- [ ] Service area configured
- [ ] NAP consistent (Name, Address, Phone)
```

