# Status Checkpoint — 2026-04-19

**Session:** Home Stay → Lodgra Full Sync + Landing Page "Best of Both Worlds"
**Next Session:** Bug fixes, E2E tests, or Epic 12 features
**Status:** ✅ Staging ready — Lodgra is now the sole active development repo

---

## Strategic Decision

| Decision | Detail |
|----------|--------|
| **Active repo** | Lodgra staging (`/projetos/lodgra-staging`) |
| **Frozen repo** | Home Stay (`/projetos/home-stay`) — no more changes |
| **Strategy** | Lodgra replaces Home Stay with new domain, global focus, and new landing page |
| **Phase** | Staging → Production |

---

## What's Done ✅

### Infrastructure & Architecture
- [x] Next.js 15 App Router — `proxy.ts` (migrated from deprecated `middleware.ts`)
- [x] Export renamed: `middleware` → `proxy`
- [x] `"packageManager": "npm@11.6.2"` declared in `package.json`
- [x] Stale `.next` cache cleared (fixed `instrumentation.ts` MODULE_UNPARSABLE error)
- [x] `next.config.ts` — Remote image patterns: Supabase production + Unsplash

### Auth & Multi-tenancy
- [x] `src/lib/middleware/auth-guard.ts` — Updated
- [x] `src/lib/middleware/security-headers.ts` — Updated
- [x] `src/proxy.ts` — Auth + security (CSRF, rate limiting, CSP)

### Billing & Subscriptions (synced from Home Stay)
- [x] `src/app/api/stripe/portal/route.ts` — Stripe billing portal (new)
- [x] `src/app/api/organization/upgrade-plan/route.ts` — Upgrade/downgrade with proration
- [x] `src/app/api/stripe/checkout/route.ts` — Uses `getPriceIdForPlan()` helper
- [x] `src/components/billing/PlanManagement.tsx` — Admin plan management UI (new)
- [x] `src/lib/billing/plans.ts` — BRL support + `getPriceIdForPlan()` helper
- [x] `src/app/[locale]/account/page.tsx` — Uses `createAdminClient`, authoritative role, integrates `PlanManagement`

### Public Booking Flow (synced from Home Stay)
- [x] `src/app/properties/page.tsx` — Public listing with filters
- [x] `src/components/common/public/properties/PropertyCard.tsx`
- [x] `src/components/common/public/properties/PropertyFilters.tsx`
- [x] `src/components/common/public/properties/PropertyGrid.tsx`
- [x] `src/components/common/public/properties/SearchBar.tsx`
- [x] `src/components/common/public/booking/BookingWidgetDesktop.tsx` — Date selection, dynamic currency, min_nights
- [x] `src/components/common/public/booking/BookingWidgetMobile.tsx`
- [x] `src/components/common/public/PropertyPageV2.tsx` — Lightbox, currency prop, min_nights
- [x] `src/components/common/public/gallery/PropertyHeroGallery.tsx`
- [x] `src/components/common/public/gallery/PropertyLightbox.tsx`
- [x] `src/components/common/public/layout/PropertyPageHeader.tsx` — city/country props
- [x] `src/components/common/public/content/PropertyMap.tsx` — Google Maps embed (new)
- [x] `src/app/p/[slug]/page.tsx` — Passes currency, dates, min_nights
- [x] `src/app/p/[slug]/checkout/page.tsx` — Server-side min_nights validation
- [x] `src/app/api/properties/route.ts` — Availability check + filters

### Bug Fixes (synced from Home Stay)
- [x] `src/app/api/reports/financial-pdf-download/route.ts` — Fix `PropertyListings` type
- [x] `src/types/database.ts` — Fields: `slug`, `base_price`, `currency`, `amenities`, `photos`

### New Utilities (synced from Home Stay)
- [x] `src/lib/hooks/useProperties.ts`
- [x] `src/lib/utils/normalize-text.ts` — Accent-insensitive search
- [x] `src/lib/currency/symbols.ts` — Currency → symbol mapping
- [x] `src/types/property-images.ts`

### Landing Page — "Best of Both Worlds"
- [x] **Dark mode:** `ThemeProvider` (next-themes) added to `layout.tsx`
- [x] **ThemeToggle:** `src/components/common/header/ThemeToggle.tsx` (new, from Home Stay)
- [x] **SocialProof organism:** `src/components/landing/organisms/SocialProof.tsx`
  - Stats row: 150+ properties, 10K+ reservations, €50M+/R$50M+ revenue
  - 3 testimonials with quote icon
  - Trust badges (LGPD/GDPR, Enterprise Security, 99.9% SLA)
- [x] **Real Stripe pricing** — Locale files updated:
  - EUR: Starter €19, Professional €49, Business €99
  - BRL: Starter R$29, Professional R$99, Business R$199
- [x] **CTAs fixed:** All point to `/register` (not `/signup`)
- [x] **Locale switcher:** Redirects to `/?locale=` (root page)
- [x] **Locales updated:** `pt-BR`, `en-US`, `es` — all with `socialProof` section + correct pricing

### Database Migrations
- [x] `supabase/migrations/20260417_01_fix_property_currency_by_country.sql` — Fixes currency by country (BR→BRL, PT→EUR, US→USD)

### Documentation
- [x] `README.md` — Fully rewritten with Lodgra branding
- [x] `docs/CHANGELOG.md` — `[1.2.0] - 2026-04-19` entry added

---

## What's Pending ⏳

| Item | Priority | Notes |
|------|----------|-------|
| **ThemeToggle in Header** | Medium | Component exists at `src/components/common/header/ThemeToggle.tsx` but not yet added to authenticated Header |
| **Stripe Webhook Config** | High (pre-launch) | Configure in Stripe Dashboard: `https://DOMINIO/api/stripe/webhook` — Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` |
| **Vercel Env Vars** | High (pre-launch) | All vars from README must be set in Vercel dashboard |
| **Domain configuration** | High (pre-launch) | Point Lodgra domain to Vercel |
| **Supabase migration** | High (pre-launch) | Run `20260417_01_fix_property_currency_by_country.sql` in production Supabase |
| **E2E test: checkout flow** | Medium | Test full flow: register → checkout → webhook → onboarding |
| **ThemeToggle integration** | Low | Wire into Navbar organism for public landing page dark mode toggle |

---

## Key File Architecture

```
src/
├── proxy.ts                              # Auth + security proxy (replaces middleware)
├── app/
│   ├── page.tsx                          # Root → LandingPageClient (pt-BR default)
│   ├── landing/page.tsx                  # /landing with ?locale= support
│   ├── layout.tsx                        # ThemeProvider (dark mode)
│   ├── [locale]/account/page.tsx        # Billing + PlanManagement
│   ├── p/[slug]/                         # Public property pages
│   ├── properties/                       # Public listing
│   └── api/
│       ├── stripe/portal/route.ts        # Billing portal
│       ├── stripe/checkout/route.ts      # Checkout session
│       └── organization/upgrade-plan/    # Plan upgrade/downgrade
├── components/
│   ├── landing/
│   │   ├── LandingPageClient.tsx         # Main landing orchestrator
│   │   └── organisms/
│   │       ├── SocialProof.tsx           # NEW — stats, testimonials, badges
│   │       ├── Navbar.tsx                # Locale switcher → /?locale=
│   │       ├── Hero.tsx
│   │       ├── Features.tsx
│   │       ├── Pricing.tsx               # Real Stripe pricing
│   │       ├── FAQ.tsx
│   │       ├── FinalCTA.tsx
│   │       └── Footer.tsx
│   ├── billing/
│   │   └── PlanManagement.tsx            # NEW — admin plan UI
│   └── common/
│       ├── header/ThemeToggle.tsx        # NEW — dark/light toggle
│       └── public/                       # Public booking components
├── lib/
│   ├── billing/plans.ts                  # getPriceIdForPlan() + BRL support
│   ├── currency/symbols.ts               # Currency → symbol map
│   ├── hooks/useProperties.ts            # Public properties hook
│   └── utils/normalize-text.ts          # Accent-insensitive search
└── types/
    ├── database.ts                       # slug, base_price, currency fields
    └── property-images.ts               # Image types

public/locales/
├── pt-BR/landing.json                    # Updated: socialProof + BRL pricing
├── en-US/landing.json                    # Updated: socialProof + EUR pricing
└── es/landing.json                       # Updated: socialProof + EUR pricing

supabase/migrations/
└── 20260417_01_fix_property_currency_by_country.sql  # Run in prod before launch
```

---

## Current Git State

**Branch:** main
**Working directory:** Clean (2 untracked test files: `comprehensive-device-test.mjs`, `retry-device-test.mjs`)
**Build:** ✅ `npm run build` passes (8.4s, 0 TypeScript errors in production files)
**Last commits:**
- `4762b9a` docs: Add production deployment & monitoring guides
- `e0935f2` feat: Implement modular analytics infrastructure (dormant mode)
- `68ab68d` fix: Resolve landing page middleware redirect issue

---

## Stripe Plans Reference

| Plan | EUR | BRL | Property Limit |
|------|-----|-----|----------------|
| Starter | €19/month | R$29/month | 3 properties |
| Professional | €49/month | R$99/month | 10 properties |
| Business | €99/month | R$199/month | Unlimited |

---

## Next Development Options

1. **Wire ThemeToggle into Navbar** — quick win, completes dark mode UX
2. **E2E test the full checkout flow** — validates billing before launch
3. **Epic 12** — new features (TBD based on roadmap)
4. **Deploy to production** — after completing pending checklist above
