# Changelog

All notable changes to Home Stay are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-22

### Major Release: Complete PMS with Multi-Property Management, Reports MVP & Flexible Pricing

This is the first major release of Home Stay, a comprehensive property management system built on Next.js, Supabase, and Stripe.

#### Features

**Reports MVP (Stories 1.1-1.4)**
- Revenue analytics dashboard with multi-property aggregation
- P&L (Profit & Loss) analysis with expense tracking
- Channel analysis (platform revenue breakdown)
- Cash flow forecasting with future confirmed reservations

**Pricing Tiers (Stories 8.1-8.2)**
- Three-tier pricing system: Starter, Professional, Business
- Backend enforcement via Stripe subscription validation
- Dynamic pricing rules engine with per-epoch pricing and minimum night requirements
- Organization-based SaaS commercialization with subscription management

**Public Booking System (Story 9)**
- Public property pages with SEO optimization (`/p/[slug]`)
- Real-time availability calendar API
- Booking engine checkout flow with Stripe integration
- Stripe booking webhook for automated email notifications

**Owner Management (Story 4-7)**
- Owner report page with period selector and PDF export
- Management fee integration and owner revenue split calculations
- Interactive drag-drop calendar for reservations
- CSV export functionality for reports

**Financial & Compliance (Story 5-6)**
- Fiscal compliance report for PT Categoria F with NIF
- PDF export for comprehensive owner reports
- Management fee calculation and tracking
- Net amount calculations with organization isolation

**iCal & Calendar Integration**
- Booking.com iCal integration with automatic sync
- Full-calendar implementation with drag-drop reservations
- Pending reservation visibility
- Email parsing deprecated in favor of iCal

**Admin & User Management**
- User creation form with temporary password generation
- User management page with role-based access
- Password reset functionality for all roles
- Manager access to settings and user administration

**Security & Performance**
- RLS (Row Level Security) policies for multi-tenant isolation
- Organization-based data isolation
- Content Security Policy (CSP) with per-request nonces
- Core Web Vitals optimization
- Rate limiting with Upstash Redis fallback

**SEO & Landing Page**
- Redesigned landing page with new sections and visual assets
- Technical SEO implementation (robots.txt, sitemap, structured data)
- Organization schema, FAQ rich snippets, OG image typography
- Privacy policy page and cookie consent banner
- Google Analytics integration

#### Enhancements

- Supabase session cookie handling improvements
- Elimination of white screen race condition in /properties
- MonthlyComparison chronological sorting
- Properties loading optimization with duplicate query elimination
- Pending reservations calendar visibility
- Dynamic price in booking checkout
- CSP nonce propagation via request headers
- Sitemap URL correction and public page inclusion

#### Bug Fixes

- Fixed Supabase session cookie handling in Server Actions
- Fixed organization_id propagation in property creation
- Fixed properties blank on first load issue
- Fixed white screen race condition in Header SSR
- Fixed pending reservations visibility on calendar
- Fixed PDF error handling and filename sanitization
- Fixed pricing rate limiting issues
- Fixed EmailConnection integration in settings
- Fixed iCal endpoint headers and Content-Disposition
- Fixed user creation form password display
- Fixed admin client RLS bypass for auth.uid() dependency
- Fixed user_properties relation creation

#### Technical Improvements

- Comprehensive test suites for auth, RLS, and property creation
- Unit tests for calculations, iCal service, and role-based access
- Jest configuration updates for ES6 modules
- Testing library React v15 upgrade
- Legacy peer dependency handling via .npmrc
- Debug endpoints and console logging removed for production

#### Documentation

- Architecture documentation for brownfield implementation
- PRD and Sprint 0 foundational stories
- Dev Agent Records for completed stories
- QA results documentation for all stories
- Dev notes for expense categories and compliance

### Breaking Changes

- Email parsing deprecated in favor of iCal integration
- Legacy CalendarView replaced by FullCalendar implementation

### Known Limitations

- Email parsing via AI has been deprecated; use Booking.com iCal export instead
- Single timezone support (configurable per instance)

### Dependencies

**Core**
- Next.js 15 (App Router)
- React 18+
- TypeScript
- Tailwind CSS

**Backend**
- Supabase (PostgreSQL, Auth, RLS)
- Stripe API (v20.4.0, `2026-02-25.clover`)
- Resend (Email)

**Infrastructure**
- Vercel (Deployment)
- Upstash Redis (Rate limiting, optional)

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
EMAIL_ADMIN
CRON_SECRET
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
STRIPE_BOOKING_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_MONTHLY_PRICE (default: "29")
UPSTASH_REDIS_REST_URL (optional)
UPSTASH_REDIS_REST_TOKEN (optional)
```

### Migration Guide

1. Run all migrations in order (see `supabase/migrations/`)
2. Set up environment variables
3. Configure Stripe webhooks for both subscription and booking webhooks
4. Deploy to Vercel with appropriate env vars

### Quality Assurance

- All Stories 1.1-1.4 (Reports MVP) QA PASS
- All Stories 8.1-8.2 (Pricing Tiers) QA PASS
- All Stories 9.1-9.5 (Public Booking) QA PASS
- Comprehensive test coverage for auth, RLS, property creation
- ESLint configuration passes
- No production console logging

---

**Commits included:** 240 total (since project inception)
**Release Date:** March 22, 2026
**Next Version:** Planned features in backlog
