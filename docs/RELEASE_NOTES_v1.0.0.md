# Home Stay v1.0.0 Release Notes

**Release Date:** March 22, 2026

---

## 🚀 Headline

**Home Stay v1.0.0 — Multi-Property Management Platform**

Complete property management system with real-time analytics, flexible pricing tiers, and public booking capabilities.

---

## Overview

Home Stay v1.0.0 is the first major release of a comprehensive property management system (PMS) designed for vacation rental owners and managers. It combines powerful analytics, flexible pricing options, and a modern booking experience in a single integrated platform.

### Key Statistics

- **240 commits** across the full development lifecycle
- **5+ major feature blocks** implemented and QA tested
- **3 pricing tiers** ready for SaaS commercialization
- **Multi-property support** with organization-based isolation
- **Production-ready infrastructure** on Vercel + Supabase

---

## Major Features

### 1. Reports MVP (Stories 1.1-1.4)

Real-time analytics for property management decision-making.

**Included Reports:**
- **Revenue Dashboard** — Total, per-property, and per-channel revenue aggregation
- **P&L Analysis** — Profit and loss with expense tracking and management fee integration
- **Channel Analysis** — Revenue breakdown by platform (Airbnb, Booking.com, direct, etc.)
- **Cash Flow Forecasting** — Projected cash flow based on confirmed future reservations

**Use Cases:**
- Track profitability across multiple properties
- Understand which channels drive the most revenue
- Plan for upcoming cash needs
- Monitor management fees and revenue splits

### 2. Pricing Tiers (Stories 8.1-8.2)

Flexible, feature-limited pricing designed for SaaS growth.

**Three-Tier Structure:**

| Tier | Monthly Price | Properties | Key Features |
|------|---|---|---|
| **Starter** | €9.90 / $12 | 1 | Basic reports, single property |
| **Professional** | €19.90 / $24 | 5 | Multi-property, all reports, iCal sync |
| **Business** | €49.90 / $60 | Unlimited | Full features, API access, priority support |

**How It Works:**
- Subscription validation at middleware level
- Property count enforcement based on tier
- Seamless upgrade/downgrade workflow
- Stripe integration for secure payments

### 3. Public Booking System (Story 9)

Turn properties into self-serve booking platforms.

**Features:**
- Public property showcase pages (`/p/[slug]`)
- Real-time availability calendar
- Instant booking checkout with Stripe
- Automated confirmation emails
- Dynamic pricing based on date/season

**Integration Points:**
- Booking.com sync via iCal
- Airbnb sync via iCal
- Direct online bookings from your website

### 4. Owner Management

Comprehensive tools for property owners and managers.

**Capabilities:**
- Period-based owner reports with PDF export
- CSV export for financial analysis
- Interactive drag-drop calendar for manual scheduling
- Management fee calculation and transparency
- Owner revenue split documentation

### 5. Financial & Compliance

Built-in compliance for Portuguese property rentals.

**Included:**
- Fiscal compliance report for PT Categoria F
- NIF (Tax ID) integration
- Management fee tracking
- Net amount calculations
- Expense categorization

### 6. iCal Integration

Automated synchronization with major booking platforms.

**Supported Platforms:**
- Booking.com (primary integration)
- Airbnb (via iCal feed)
- Any custom iCal feed

**Workflow:**
- Automatic sync hourly/daily
- Prevents double-bookings
- Syncs from external platforms → Home Stay
- Calendar always in sync

### 7. Admin & User Management

Role-based access control for teams.

**Roles:**
- **Admin** — Full system access, user management, settings
- **Manager** — Properties, reservations, reports, user management
- **Viewer** — Read-only access to assigned properties

**Features:**
- User creation with auto-generated passwords
- Password reset functionality
- Role assignment per user
- Organization-based data isolation

---

## Technical Highlights

### Architecture

- **Frontend:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Payments:** Stripe API (v20.4.0)
- **Email:** Resend
- **Hosting:** Vercel (serverless functions)
- **Rate Limiting:** Upstash Redis (with in-memory fallback)

### Security

- **Row Level Security (RLS)** policies enforce multi-tenant isolation
- **Organization-based isolation** at database level
- **Content Security Policy (CSP)** with per-request nonces
- **Subscription enforcement** at middleware level
- **CSRF protection** built-in

### Performance

- **Core Web Vitals optimized** — LCP, CLS, FID
- **Server-side rendering** for public pages (SEO)
- **Streaming responses** for large reports
- **Query optimization** with duplicate elimination
- **Asset optimization** with next/image

### Quality

- **Comprehensive test suites** for auth, RLS, property creation
- **Unit tests** for financial calculations and utilities
- **QA sign-off** on all major stories
- **ESLint configuration** enforced
- **TypeScript strict mode**

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account (free tier sufficient for testing)
- Stripe account (for payment testing)

### Installation

```bash
git clone https://github.com/yourusername/home-stay.git
cd home-stay
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxx...

STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PRICE_ID=price_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_BOOKING_WEBHOOK_SECRET=whsec_xxxx

RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@homestay.app
EMAIL_ADMIN=admin@homestay.app

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MONTHLY_PRICE=29

CRON_SECRET=your-cron-secret
```

### Running Locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Database Setup

Run migrations:

```bash
npx supabase migration up
```

### Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Set environment variables in Vercel dashboard, then redeploy.

---

## System Requirements

### Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

### Database

- PostgreSQL 12+ (via Supabase)
- Minimum 256MB storage for small deployments

### Infrastructure

- Vercel free tier or better
- Supabase free tier or better (for production, consider paid)
- Stripe account with billing enabled

---

## Migration from Older Versions

### From v0.4.0

v1.0.0 includes significant feature additions but maintains backward compatibility.

**Steps:**

1. **Pull latest code**
   ```bash
   git pull origin main
   git checkout v1.0.0
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run database migrations**
   ```bash
   npx supabase migration up
   ```

4. **Update environment variables** (new vars: `STRIPE_BOOKING_WEBHOOK_SECRET`)

5. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

**Breaking Changes:**
- Email parsing via AI has been deprecated; use iCal integration instead
- Legacy `CalendarView` component replaced by FullCalendar

---

## Known Issues & Limitations

### Current Limitations

1. **Timezone Support** — Single timezone per instance (configurable)
2. **Email Sync** — AI-based email parsing deprecated; use iCal instead
3. **Bulk Operations** — No bulk import/export (planned for v1.1)
4. **Mobile App** — Web-only (mobile app planned)

### Performance Considerations

- Reports may take 2-5 seconds to load with 1000+ reservations
- iCal sync runs hourly (configurable via CRON_SECRET)
- Large PDF exports (100+ pages) may timeout on free Vercel tier

---

## What's Next

### Planned for v1.1

- Bulk import/export functionality
- Guest communication templates
- Advanced pricing rules (seasonal, weekly rates)
- Reporting API for integrations

### Long-term Roadmap

- Mobile app (iOS/Android)
- Advanced integrations (Vrbo, HomeAway)
- Team collaboration features
- Custom themes and branding
- White-label solution

---

## Support & Community

### Getting Help

- **Documentation:** See `/docs` folder and in-app help
- **Issues:** Report bugs on GitHub
- **Email:** support@homestay.app (when available)

### Contributing

We welcome contributions! Please see `CONTRIBUTING.md` for guidelines.

### License

[Your License Here] — See `LICENSE` file for details.

---

## Credits

Built by the Home Stay team with modern web technologies.

**Version:** 1.0.0
**Release Date:** March 22, 2026
**Build:** Commit [full commit hash available in git tag]

---

## Changelog

See `/docs/CHANGELOG.md` for complete commit history and detailed feature breakdown.

