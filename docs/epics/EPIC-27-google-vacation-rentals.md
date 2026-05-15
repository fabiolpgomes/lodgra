# Epic 27 — Google Vacation Rentals Distribution

**Status:** Draft (Ready for @pm)  
**Created:** 2026-05-15  
**Target Release:** Sprint 28 (2026-06-15)  
**Priority:** HIGH (Post Go-Live Distribution)  
**Owner:** @pm (Morgan)  

---

## Vision

Enable Lodgra properties to be discoverable and bookable through **Google Vacation Rentals** — Google's vacation rental search experience. This is a zero-code-change distribution channel (Schema.org + feed-based integration).

**Strategic Value:**
- 🌍 Global distribution (Google reaches 2B+ monthly searches)
- 📊 SEO + direct visibility in Google Search
- 💰 Premium feature for SaaS tier (recurring revenue)
- 🔗 No API integration required (feed-based)

---

## Prerequisites ✅

All code prerequisites **COMPLETED** (Epics 14, 17, 18, 25):
- ✅ Property schema with amenities, pricing, availability
- ✅ RLS for property access control
- ✅ Public property pages with pricing + calendar
- ✅ Review system (OTA scores)

**Remaining:** Schema.org markup + feed structure (Epic 27)

---

## Stories

### Story 27.1 — Schema.org Markup (LodgingBusiness)

**Objective:** Add structured data to public property pages for Google crawling

**Acceptance Criteria:**
- [ ] LodgingBusiness + LocalBusiness schema on `/properties/[slug]`
- [ ] Includes: name, description, address, phone, email, image, priceRange
- [ ] AggregateRating (from OTA reviews if available)
- [ ] OpeningHoursSpecification for booking availability
- [ ] Passes Google's Rich Results Test
- [ ] No breaking changes to existing pages

**Implementation Details:**
- Add `<script type="application/ld+json">` in Next.js `<Head>`
- Use property data from DB (properties, amenities, reviews)
- Conditional: include rating only if property has reviews
- Test: `https://search.google.com/test/rich-results`

**Dev Notes:**
- Use `next/head` or `next-seo` library for schema injection
- Generate schema server-side for crawlers
- Validate schema in `/lib/schema-validators.ts`

---

### Story 27.2 — Google Vacation Rentals Feed (`/api/google-feed`)

**Objective:** Generate Google-compliant feed for property indexing

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/google-feed?format=xml` (Google XMLv2 format)
- [ ] Includes: property ID, name, description, price, availability, images, reviews
- [ ] Updates real-time (no caching, or 1h cache max)
- [ ] Handles 500+ properties without timeout (streaming response)
- [ ] Validated against Google's schema
- [ ] Accessible only to authenticated admin (RLS check)

**Implementation Details:**
```
Feed Structure:
<feed xmlns="...">
  <property>
    <id>prop-uuid</id>
    <name>Property Name</name>
    <description>...</description>
    <location>
      <address>...</address>
      <latitude>X</latitude>
      <longitude>Y</longitude>
    </location>
    <pricing>
      <currency>EUR</currency>
      <price>99.00</price>
    </pricing>
    <images>
      <image>https://cdn/photo1.webp</image>
    </images>
    <reviews>
      <review>
        <rating>4.5</rating>
        <source>Booking.com</source>
      </review>
    </reviews>
    <availability>
      <available_from>2026-06-01</available_from>
      <stay_type>nightly|weekly</stay_type>
    </availability>
  </property>
</feed>
```

**Dev Notes:**
- Endpoint: `/pages/api/admin/google-feed.ts`
- RLS: only return properties owned by authenticated user
- Performance: use database views for aggregated data
- Streaming: implement for large feeds (Node.js streams)

---

### Story 27.3 — Google My Business Integration (Reviews)

**Objective:** Surface OTA reviews in Google My Business listing

**Acceptance Criteria:**
- [ ] Extract top reviews from property_reviews table
- [ ] Filter: rating >= 4.0, source in (Booking.com, Airbnb, Vrbo)
- [ ] Include in feed as `<reviews>` section
- [ ] Average rating displayed in Google Business Profile
- [ ] Updates when new reviews are ingested

**Implementation Details:**
- Extend 27.2 feed to include review section
- Aggregate reviews by property + source
- Calculate average rating (weighted by source if needed)
- Include review text + author (if available)

**Dev Notes:**
- Reuse PropertyReviewScore component logic
- Query: aggregate from property_reviews grouped by property_id
- Feed update: incremental (only changed properties)

---

### Story 27.4 — Premium SaaS Feature: Google Distribution Dashboard

**Objective:** Admin dashboard for property indexing status + performance metrics

**Acceptance Criteria:**
- [ ] Page: `/admin/google-distribution` (protected, admin only)
- [ ] Metrics: properties indexed, pending review, feed freshness
- [ ] Status per property: "indexed", "pending", "rejected", "error"
- [ ] Action: manually trigger feed refresh
- [ ] Logs: feed generation history + errors
- [ ] Feature gate: premium tier only

**Implementation Details:**
- Admin page component in `/pages/admin/google-distribution.tsx`
- Sidebar nav link (if not exists, add)
- Real-time status from Google API (if webhook available, else polling)
- Action: POST `/api/admin/google-feed/refresh` (manual trigger)

**Dev Notes:**
- Use Supabase RLS to restrict to admin
- Premium check: `properties.tier === 'premium'`
- Error handling: log feed generation errors to monitoring (Sentry)
- UI: table + status badges (indexed/pending/error)

---

### Story 27.5 — Testing & Validation

**Objective:** Ensure feed and markup are production-ready

**Acceptance Criteria:**
- [ ] Unit tests: feed generation with 5+ property scenarios
- [ ] Integration tests: Google Rich Results validator (via API)
- [ ] E2E tests: full property → Google feed → indexed
- [ ] Load test: feed generation with 500+ properties (< 5s response)
- [ ] SEO audit: lighthouse + Core Web Vitals on public pages
- [ ] Documented: runbook for monitoring feed health

**Implementation Details:**
- Test file: `/tests/google-distribution.test.ts`
- Lighthouse CI integration (GitHub Actions)
- Feed validator: call Google's validator API
- Monitoring: alert on feed generation errors (Sentry)

**Dev Notes:**
- Use Playwright for E2E (existing setup)
- Load test: use artillery or k6
- CI/CD: add step to validate feed on each deploy

---

## Architecture Notes

### Dependencies
- Next.js (existing)
- Supabase (for RLS + property data)
- Google APIs (for feed validation, optional)
- WebP image optimization (existing via Next.js Image)

### Performance Considerations
- Feed generation: lazy-loaded at request time (or hourly refresh)
- Schema injection: server-side rendering (no client JS bloat)
- Feed caching: 1h max (balance freshness + performance)
- Large feeds: implement streaming response

### Security
- Feed endpoint: RLS check (only admin or property owner)
- Schema data: no PII (no email/phone in public schema)
- Feed validation: signed URLs for images (existing pattern)

---

## Success Metrics

| Metric | Target | Baseline |
|--------|--------|----------|
| Properties indexed in Google | > 80% | 0% (new) |
| Average time to indexing | < 7 days | N/A |
| Feed generation time | < 5s for 500 props | N/A |
| Premium tier adoption | > 30% | 0% (new feature) |
| CTR from Google | > 2% | N/A |

---

## Timeline

- **27.1 (Schema.org):** 3-4 days
- **27.2 (Feed):** 4-5 days
- **27.3 (Reviews):** 2-3 days
- **27.4 (Dashboard):** 3-4 days
- **27.5 (Testing):** 2-3 days

**Total:** 14-19 days (2 sprints at 5 devs)

---

## Rollout Plan

1. **Week 1:** 27.1 + 27.2 (core functionality)
2. **Week 2:** 27.3 + 27.4 (reviews + dashboard)
3. **Week 3:** 27.5 (testing + validation)
4. **Launch:** Manual Google submission via Google Search Console
5. **Monitoring:** Track indexing status via dashboard

---

## Open Questions / Decisions

- [ ] Should we auto-submit feed to Google or manual via Search Console?
- [ ] Do we need Google API integration or is feed-based enough?
- [ ] What's the review refresh frequency? (Real-time, hourly, daily?)
- [ ] Premium tier pricing for Google Distribution feature?

---

**Next Step:** @pm reviews + creates stories in Jira/Linear
