# SEO & Google Analytics Guide

## Status ✅

- [x] Google indexing enabled (`robots: { index: true }`)
- [x] Sitemap.xml configured (`/sitemap.xml`)
- [x] Meta descriptions on all public pages
- [x] OpenGraph tags configured
- [x] Google Analytics component ready
- [ ] GA Measurement ID configured (TO DO)

---

## Google Analytics Setup

### Step 1: Create Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create new property for `lodgra.io`
3. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Add Measurement ID to Environment

Add to **production environment variables** (Vercel):

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Add to local **`.env.local`**:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Step 3: Verify Analytics Works

1. Deploy code to production
2. Visit `https://lodgra.io`
3. Open Chrome DevTools → Network tab
4. Look for requests to `google-analytics.com`
5. Check Google Analytics → Realtime → Active users

---

## Meta Descriptions

All public pages have SEO-optimized descriptions:

| Page | Description |
|------|-------------|
| `/` (Homepage) | "Transforma tus propiedades en activos financieros..." |
| `/landing` | "Transform your properties into high-performance..." |
| `/p/[slug]` | Dynamic: Property name + location |
| `/terms` | "Terms of service for the Lodgra platform" |
| `/privacy` | "Privacy policy for the Lodgra platform — GDPR/LGPD..." |

---

## Open Graph Tags

All public pages include proper Open Graph metadata for:

- Social media preview (Facebook, LinkedIn, Twitter)
- Rich snippets in search results
- Custom titles and descriptions
- Product images

---

## Sitemap

Automatically generated at `/sitemap.xml`:

- Static pages (homepage, terms, privacy)
- Dynamic property pages (from database, `is_public = true`)
- Multi-language support (PT, BR, ES)
- Updated weekly

**Submitted to Google Search Console:** Yes ✅

---

## Robots.txt

Configured at `/robots.txt` (generated from `src/app/robots.ts`):

**Allowed to crawl:**
- `/` (homepage)
- `/p/*` (public property pages)

**Blocked from crawl:**
- `/admin/*` (admin panel)
- `/api/*` (API routes)
- `/auth/*` (authentication)
- `/dashboard/*` (private user area)
- `/properties/*` (user properties)

---

## Performance Tips

### For Google Ranking

1. **Page Speed:** Monitor Core Web Vitals in Google Search Console
2. **Mobile Friendly:** Site is responsive (tested on iOS/Android)
3. **HTTPS:** ✅ Enabled
4. **Backlinks:** Consider outreach to short-term rental blogs/guides
5. **Content:** Regular updates to property descriptions improve ranking

### For Analytics

1. **Conversion Tracking:** Set up goals in Google Analytics
   - Property view (booking page visit)
   - Contact inquiry
   - Account signup

2. **Audience Segments:**
   - New vs Returning visitors
   - Mobile vs Desktop
   - Traffic source (organic, direct, referral)

3. **Custom Events:** Track user interactions
   - Property bookings initiated
   - Contact form submissions
   - Image gallery interactions

---

## Monitoring

### Google Search Console

Check regularly:
- Coverage report (indexed pages)
- Performance (impressions, clicks, CTR)
- Errors and warnings

### Google Analytics

Monitor:
- Organic traffic growth
- User engagement metrics
- Bounce rate by page
- Conversion funnel (visitor → booking)

---

## Next Steps

1. [ ] Configure `NEXT_PUBLIC_GA_MEASUREMENT_ID`
2. [ ] Verify analytics tracking in production
3. [ ] Set up Google Search Console goals
4. [ ] Monitor performance for 30 days
5. [ ] Create SEO content calendar for regular updates
