# Changelog — Lodgra

All notable changes to Lodgra (rebranding of Home Stay) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-05-01

### Design System, Property Page V2, PWA Brand & Compliance RLS

#### Design System — Lodgra Tokens (Story 14.1)

- `tailwind.config.ts` — `brand` scale (50–950, `#1E3A8A` @ 800) + `accent` scale (300–700, `#D4AF37` @ 500) + typography aliases `lodgra-heading`/`lodgra-body`
- `src/app/globals.css` — CSS custom properties via `@theme inline` para Tailwind v4
- `src/lib/design/tokens.ts` — Constantes tipadas: `BRAND`, `ACCENT`, `CTA`, `SEMANTIC`, `SHADOW`, `RADIUS`, `ANIMATION`, `BREAKPOINTS`
- `src/components/ui/Logo.tsx` — Componente SVG com variantes `default`, `white`, `compact` e prop `size`
- `src/app/design/page.tsx` — Página de preview `/design` (dev-only, `notFound()` em production)

#### Property Page V2 — Redesign (Story 14.2)

- `PropertyPageHeader.tsx` — Header scroll-aware: transparente → `bg-white shadow-sm` ao scroll > 80px; Logo adapta variante
- `BookingWidgetDesktop.tsx` / `BookingWidgetMobile.tsx` — CTAs orange migrados para `#059669` (lodgra-green)
- `PropertyPageV2.tsx` — Quick stats com ícones Lucide (`Users`, `BedDouble`, `Bath`); footer com © Lodgra + links Privacy/Terms
- `PropertyLocation.tsx` — API key Google Maps hardcoded removida; usa `maps.google.com/maps?q=...&output=embed`

#### PWA Brand Tokens (Story 14.4)

- `public/manifest.json` — `theme_color: "#1E3A8A"`, `background_color: "#FAFAF9"`, branding Lodgra completo
- `public/brand/` — Logos horizontais e verticais PNG adicionados

#### Compliance RLS — Multi-Tenant Isolation (Story 11.6 — P0 Security)

- `supabase/migrations/20260501_01_compliance_org_isolation_complete.sql` — FK `consent_records.user_id` → ON DELETE SET NULL; constraint `scheduled_at > requested_at` (idempotente)
- `src/app/api/admin/compliance/route.ts` — `.eq('organization_id', organizationId)` em `consent_records` e `deletion_requests` (AC8)
- `src/app/api/admin/compliance/csv/route.ts` — Mesmo filtro org no export CSV
- `src/app/api/admin/compliance/__tests__/org-isolation.test.ts` — 7 testes de isolamento cross-org (todos PASS)

#### Multi-Currency — Símbolos Dinâmicos

- `reservations/[id]/page.tsx`, `reservations/[id]/edit/page.tsx`, `reservations/new/page.tsx` — `€` hardcoded → `getCurrencySymbol()`
- `properties/[id]/pricing/page.tsx`, `PricingRulesManager.tsx` — Currency symbol dinâmico via prop
- `RevenueChart.tsx` — Label e tooltips com `getCurrencySymbol(currency)`
- PIX (`GeneratePixButton`) condicionado a `reservation.currency === 'BRL'`

#### Fixes de Qualidade

- `eslint.config.mjs` — `.vercel/**` adicionado aos ignores (artefactos de build)
- `Navbar.tsx` — `<a href="/login">` → `<Link href="/login">` (erro ESLint `@next/next/no-html-link-for-pages`)

---

## [1.4.0] - 2026-05-01

### Stripe Billing Multi-Market, Auth Flow Fixes & Landing Page Overhaul

#### Stripe Billing — 3-Market Setup (EUR / BRL / USD)

- `src/lib/billing/plans.ts` — Extended with 15 Stripe Price IDs (Starter/Growth/Pro × EUR/BRL/USD × per-unit + metered)
- `.env.local` / Vercel env vars — All 15 Price IDs configured:
  - Starter: EUR `price_1TRrfE2cJshbnOoQyyf0WpTM`, BRL `price_1TRrZz2cJshbnOoQRp2gjkpi`, USD `price_1TRrec2cJshbnOoQuK1jUJOV`
  - Growth per-unit: EUR, BRL, USD (3 IDs)
  - Growth metered (`booking_fee`): EUR, BRL, USD (3 IDs)
  - Pro per-unit: EUR, BRL, USD (3 IDs)
  - Pro metered (`revenue_fee`): EUR, BRL, USD (3 IDs)
- 2 Stripe Billing Meters configured: `booking_fee` (Growth — R$5/reserva) and `revenue_fee` (Pro — 1% receita)
- `STRIPE_WEBHOOK_SECRET` configured in both staging and production environments
- Billing model: per-unit licensed subscription + metered usage hybrid
  - Growth: R$89/mês (base) + R$5/reserva via booking_fee meter
  - Pro: R$130/mês (base) + 1% receita via revenue_fee meter

#### Supabase Migrations — Billing Columns

- `supabase/migrations/20260429_03_billing_columns.sql` — New migration applied to BOTH staging (`wrqjpyyopwgyqluqkcga`) and production (`brjumbfpvijrkhrherpt`):
  ```sql
  ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_metered_item_id TEXT,
    ADD COLUMN IF NOT EXISTS billing_unit_count INTEGER NOT NULL DEFAULT 1;
  ```

#### Auth / Onboarding Flow Fixes

- `src/app/api/stripe/webhook/route.ts` — After `inviteUserByEmail`, immediately calls `updateUserById(userId, { email_confirm: true })` to auto-confirm email. `redirectTo` changed from `/onboarding` to `/auth/callback?next=/auth/reset-password-confirm?from=invite` (PKCE-safe)
- `src/app/auth/reset-password-confirm/page.tsx` — Added `from=invite` param detection: when `from=invite`, redirects to `/onboarding` after password creation instead of `/login`. Page title changes to "Criar sua senha" for invite context
- `src/app/[locale]/register/page.tsx` — Added `emailRedirectTo: ${window.location.origin}/auth/callback?next=/onboarding` in `signUp` call to fix "Email not confirmed" error by routing confirmation through `/auth/callback` (PKCE exchange)

#### Landing Page — Brazil (`src/components/marketing/regions/BrazilLanding.tsx`)

- Pricing tiers updated: **Essencial** R$59, **Expansão** R$89 (Mais Popular), **Pro** R$130 (Em breve)
- All CTA buttons changed to green (#059669 — Sábio archetype) via inline styles
- Navbar "Começar Agora" now scrolls to `#pricing` section
- Hero CTA "Ver demonstração gratuita" → "Ver planos e preços" → scrolls to `#pricing`
- Pricing cards: call `/api/stripe/checkout` API directly with `plan=starter/growth`, `currency=brl`
- Pro card: Lodgra blue (#1E3A8A), `disabled` state
- Expansão card: gold "Mais Popular" badge
- Added 7-day money-back guarantee badge in pricing section header
- Added guarantee strip below pricing cards: "7 dias garantia · Sem contrato · Cancele quando quiser · Suporte PT"
- Final CTA section: "Escolher meu plano" scrolls to `#pricing`; copy updated (removed "grátis" language)

#### Landing Page — PT/ES/EN (`src/components/landing/LandingPageClient.tsx`)

- `handleCtaPrimary`: scrolls to `#pricing` (was: redirect to `/register`)
- `handleFinalCta`: scrolls to `#pricing` (was: redirect to `/register`)
- `handleSelectPricing`: calls `/api/stripe/checkout` with correct currency per locale (brl/usd/eur)
- Extended locale type to include `'pt'` for Portugal passthrough

#### Navbar — Landing (`src/components/landing/organisms/Navbar.tsx`)

- "Get Started" → "Ver Planos", now scrolls to `#pricing` (was: redirect to `/register`)
- Fixed undefined Tailwind class `lodgra-primary` → `lodgra-blue` throughout

#### Locale JSON Files

- `public/locales/pt-BR/landing.json` — Hero CTA and finalCta copy updated with guarantee messaging
- `public/locales/es/landing.json` — Same updates in Spanish
- `public/locales/en-US/landing.json` — Same updates in English
- All locales: "No free trial · Pay and use · 7-day money-back guarantee"

#### UI / Brand Fixes

- `src/components/landing/atoms/Button.tsx` — Primary variant uses `style={{ backgroundColor: '#059669' }}` inline to avoid Tailwind purge issues
- `src/components/landing/organisms/FinalCTA.tsx` — `bg-lodgra-primary` → `bg-lodgra-blue`
- `src/components/landing/organisms/Hero.tsx` — `lodgra-primary` → `lodgra-blue`, `lodgra-light` → `lodgra-gray`
- `tailwind.config.ts` — Added `safelist` for lodgra brand colors; type changed to `any` for compatibility
- `src/components/marketing/regions/EuropeLanding.tsx` — Fixed `'pt'` locale passthrough bug (was incorrectly converting `pt` → `pt-BR`)

#### Security / Repository

- `.gitignore` — Added entries: `.env.local.prod-db`, `*.mjs`, `outputs/`, `FireShot*`

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
