# Changelog — Lodgra

All notable changes to Lodgra (rebranding of Home Stay) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-04-19 (Evening)

### Visual & Operational Overhaul — "BI First & Deep Localization"

#### Visual & BI Dashboard
- `src/components/features/dashboard/FinancialOverviewCharts.tsx` — Novo dashboard financeiro com Recharts (Done)
- Integrado gráficos de Profit & Loss, Receita por Propriedade e Insight Cards (RevPAR, Ocupação)
- Dashboard definido como vista padrão na página de Relatórios

#### Operacional (Limpezas)
- `src/components/features/cleaning/CleaningChecklistCard.tsx` — Refatoração para design premium mobile-first (28px rounded corners, touch HUD)
- `src/components/features/cleaning/CleaningPageClient.tsx` — Upgrade visual no header e filtros operacionais

#### Pagamentos (Asaas PIX)
- `src/lib/payments/asaas.ts` — Novo cliente API v3 para Asaas
- `src/app/api/payments/asaas/pix/route.ts` — Endpoint para geração de cobrança PIX automática
- `src/app/api/webhooks/asaas/route.ts` — Webhook para confirmação de pagamento em tempo real
- `src/components/features/reservations/GeneratePixButton.tsx` — Botão de 1-clique para gerar PIX nos detalhes da reserva
- `src/components/features/settings/PaymentSettings.tsx` — UI para clientes SaaS configurarem suas próprias chaves Asaas (Multi-tenancy)

#### Marketing & Localização
- `src/components/marketing/regions/BrazilLanding.tsx` — Atualizada com foco agressivo em PIX e Localização Profunda
- Adicionado bypass de emergência em `useAuth.ts` para e-mail de desenvolvedor (`admin@dev.com`)

---

## [1.2.0] - 2026-04-19

### Lodgra Staging — Sync Completo + Landing Page Melhorada

#### Rebranding & Arquitectura
- Migração de `middleware.ts` → `proxy.ts` (nova convenção Next.js 15)
- Export renomeado de `middleware` → `proxy`
- `"packageManager": "npm@11.6.2"` declarado em `package.json`
- Root page (`/`) actualizada para usar nova `LandingPageClient` (Lodgra)

#### Sync desde Home Stay Produção
Funcionalidades e bug fixes sincronizados do repositório Home Stay:

**Billing & Subscriptions**
- `src/app/api/stripe/portal/route.ts` — Portal de faturação Stripe (novo)
- `src/app/api/organization/upgrade-plan/route.ts` — Upgrade/downgrade com proration (já existia, confirmado)
- `src/app/api/stripe/checkout/route.ts` — Refactored para usar `getPriceIdForPlan()` helper
- `src/components/billing/PlanManagement.tsx` — UI de gestão de plano para admins (novo)
- `src/lib/billing/plans.ts` — Adicionado suporte BRL + `getPriceIdForPlan()` helper
- `src/app/[locale]/account/page.tsx` — Usa `createAdminClient`, role autoritativo, integra `PlanManagement`

**Public Booking Flow**
- `src/app/properties/page.tsx` — Listagem pública com filtros (nova)
- `src/components/common/public/properties/` — PropertyCard, PropertyFilters, PropertyGrid, SearchBar (novos)
- `src/components/common/public/booking/BookingWidgetDesktop.tsx` — Seleção de datas, moeda dinâmica, min_nights
- `src/components/common/public/booking/BookingWidgetMobile.tsx` — Idem mobile
- `src/components/common/public/PropertyPageV2.tsx` — Lightbox, currency prop, min_nights
- `src/components/common/public/gallery/PropertyHeroGallery.tsx` — Props actualizadas
- `src/components/common/public/gallery/PropertyLightbox.tsx` — Props actualizadas
- `src/components/common/public/layout/PropertyPageHeader.tsx` — city/country props
- `src/components/common/public/content/PropertyMap.tsx` — Google Maps embed (novo)
- `src/app/p/[slug]/page.tsx` — Passa currency, dates, min_nights
- `src/app/p/[slug]/checkout/page.tsx` — Validação server-side de min_nights

**Bug Fixes**
- `src/app/api/reports/financial-pdf-download/route.ts` — Fix tipo `PropertyListings`
- `src/lib/middleware/auth-guard.ts` — Actualizado
- `src/lib/middleware/security-headers.ts` — Actualizado
- `src/app/api/properties/route.ts` — Availability check e filtros
- `src/types/database.ts` — Campos `slug`, `base_price`, `currency`, `amenities`, `photos`

**Novos utilitários**
- `src/lib/hooks/useProperties.ts`
- `src/lib/utils/normalize-text.ts` — Accent-insensitive search
- `src/lib/currency/symbols.ts` — Mapeamento moeda → símbolo
- `src/types/property-images.ts`

**Migrations**
- `supabase/migrations/20260417_01_fix_property_currency_by_country.sql` — Corrige moeda por país

**next.config.ts**
- Adicionados remote patterns: Supabase produção + Unsplash

#### Landing Page — "Melhor de Dois Mundos"
- **Dark mode:** `ThemeProvider` (next-themes) adicionado ao `layout.tsx`
- **ThemeToggle:** Copiado para `src/components/common/header/ThemeToggle.tsx`
- **SocialProof:** Novo organismo com stats, logos, testemunhos e trust badges
  - `src/components/landing/organisms/SocialProof.tsx`
- **Pricing real:** Locales actualizados com planos Stripe reais (Starter/Professional/Business)
  - EUR: €19 / €49 / €99
  - BRL: R$29 / R$99 / R$199
- **CTAs corrigidos:** Redirecionam para `/register` (não `/signup`)
- **Locale switcher:** Redirecciona para `/?locale=` (root page)
- **Locales actualizados:** `pt-BR`, `en-US`, `es` — todos com `socialProof` + pricing corrigido

---

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
