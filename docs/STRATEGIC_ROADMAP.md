# 🎯 Lodgra — Strategic Roadmap 2026-2027

**Document Version:** 1.1  
**Date:** 2026-04-03  
**Status:** ACTIVE GUIDE FOR IMPLEMENTATION  
**Last Updated:** 2026-04-19

---

## 📋 EXECUTIVE SUMMARY

### Vision
Transform Lodgra from **Portuguese-only SaaS** into a **global platform** supporting 3 major markets with localized payment, compliance, and integrations.

### Current State (2026-04-19) ✅ QA Completo + Code Review Completo
- **Markets:** Portugal, Brasil, Spain (landing pages live)
- **Languages:** PT + PT-BR + EN-US + ES
- **Currencies:** EUR + BRL (Asaas PIX) + USD (Stripe)
- **Branding:** 100% Lodgra (rebranding concluído)
- **Code Quality:** 0 TypeScript errors · 0 ESLint errors
- **Tech Stack:** Next.js 15, Supabase, Stripe, Asaas, Resend
- **Próximo passo:** Production Launch (W6+)

### Target State (2027-Q1)
- **Markets:** Portugal, Brazil, USA, Spain (future)
- **Languages:** Portuguese (PT), English (US), Spanish (ES)
- **Currencies:** EUR (PT/ES), BRL (BR), USD (US)
- **Users:** 30,000+ across 3 markets
- **Revenue:** €1M+ ARR
- **New Features:** Compliance, Tax, Automation, Integrations

### Success Metrics
| Metric | Today | Q2 2026 | Q4 2026 | Q1 2027 |
|--------|-------|---------|---------|---------|
| Supported Languages | 2 | 3 | 3 | 3 |
| Supported Currencies | 1 | 3 | 3 | 3 |
| Mobile Responsiveness | 20% | 60% | 95% | 100% |
| Market Penetration | 0% | 5% | 15% | 30% |
| User Growth | 100 | 500 | 5,000 | 30,000 |
| Revenue per User | €100/yr | €250/yr | €400/yr | €600/yr |

---

## 🌍 MARKET ANALYSIS & LOCALIZATION STRATEGY

### Three Primary Markets

#### 🇵🇹 PORTUGAL (Homeland)
```yaml
Market Size: 15,000 potential properties
Language: Portuguese (PT)
Currency: EUR (€)
Flag: 🇵🇹
Key Needs:
  - RGPD compliance (legal requirement)
  - Contabilidade integration (accountants)
  - Airbnb/Booking sync
  - Local support in PT
Tax Framework: IRS (Income Tax)
```

#### 🇧🇷 BRAZIL (High Growth)
```yaml
Market Size: 500,000+ potential properties
Language: Portuguese (BR - pt-BR)
Currency: Brazilian Real (R$, BRL)
Flag: 🇧🇷
Key Needs:
  - PIX payment (90% of digital payments)
  - LGPD compliance (legal requirement)
  - Fiscal NF-e integration
  - Portuguese UI (localized dialect)
Tax Framework: IRPF (Personal Income Tax) + RPA
Competitor Analysis:
  - AirBnb dominates but expensive (20% commission)
  - Gap: Mid-market management tool (2-10 properties)
```

#### 🇺🇸 USA (Enterprise Growth)
```yaml
Market Size: 2,000,000+ potential properties
Language: English (US)
Currency: US Dollar ($, USD)
Flag: 🇺🇸
Key Needs:
  - English interface (non-negotiable)
  - 1099-NEC tax reporting
  - FIRPTA withholding (15% for non-residents)
  - Integration with VRBO, Airbnb US
Tax Framework: Federal IRS 1099 + State taxes
Competitor Analysis:
  - AppFolio dominates ($1B+ market)
  - Gap: SMB segment needs affordable solution
```

#### 🇪🇸 SPAIN (Future - Q3 2027+)
```yaml
Market Size: 200,000+ potential properties
Language: Spanish (ES)
Currency: EUR (€)
Flag: 🇪🇸
Key Needs:
  - Spanish UI (Spain dialect, not Latin America)
  - IVA compliance
  - Similar to Portugal (EU regulatory)
Timeline: Post-Q1 2027 (focus on PT/BR/US first)
```

---

## 📊 CURRENT STATE vs TARGET STATE

### 1. LANGUAGES & LOCALIZATION

#### TODAY ❌
```
- Portuguese (PT) — 90% complete
- Portuguese (BR) — 90% complete
- English — 0% (frontend not translated)
- Spanish — 0%
- Hardcoded strings in components (NOT i18n friendly)
- No locale selector in UI
- Date/Time/Currency formatting: Hardcoded to PT
```

#### TARGET (Q2 2026) ✅
```
- Portuguese (PT) — 100% complete ✓
- Portuguese (BR - pt-BR) — 100% complete ✓
- English (en-US) — 100% complete ✓
- Spanish (es-ES) — 100% complete ✓
- i18n namespace-based system (admin.*, booking.*, property.*, etc)
- Locale selector in header (flag icon + language name)
- Auto-detect from browser (Accept-Language header)
- Dynamic date/time/currency per locale
```

#### IMPLEMENTATION
```typescript
// Current structure (needs refactor):
src/lib/i18n/messages.ts
  - 2 locales (pt, pt-BR)
  - 2 message keys

// Target structure:
src/lib/i18n/locales/
  ├── pt-PT.json (Portuguese/Portugal)
  ├── pt-BR.json (Portuguese/Brazil)
  ├── en-US.json (English/USA)
  └── es-ES.json (Spanish/Spain)

src/lib/i18n/messages/
  ├── auth.json (auth messages)
  ├── booking.json (booking flow)
  ├── property.json (property management)
  ├── admin.json (admin panel)
  ├── errors.json (error messages)
  └── common.json (general UI)

src/lib/i18n/
  ├── index.ts (main i18n engine)
  ├── locale-detector.ts (auto-detect + selector)
  ├── date-formatter.ts (Intl.DateTimeFormat)
  ├── currency-formatter.ts (Intl.NumberFormat)
  └── pluralize.ts (language-specific rules)
```

---

### 2. CURRENCIES & PAYMENT LOCALIZATION

#### TODAY ❌
```
- Stripe enabled: ✓ (supports multi-currency)
- Supported currencies: EUR only
- Currency display: Hardcoded to EUR (€)
- Exchange rates: None (static)
- User preference: None
- Checkout in: EUR only
```

#### TARGET (Q2 2026) ✅
```
Supported Currencies:
┌─────────────┬─────────┬──────────┬─────────────┐
│ Country     │ Code    │ Symbol   │ Locale      │
├─────────────┼─────────┼──────────┼─────────────┤
│ Portugal    │ EUR     │ €        │ pt-PT       │
│ Brazil      │ BRL     │ R$       │ pt-BR       │
│ USA         │ USD     │ $        │ en-US       │
│ Spain       │ EUR     │ €        │ es-ES       │
└─────────────┴─────────┴──────────┴─────────────┘

Features:
✓ Currency selector in profile/checkout
✓ Real-time exchange rates (cached 24h)
✓ Display prices in user's locale currency
✓ Payment in preferred currency (Stripe multi-currency)
✓ Automatic conversion with transparency
✓ Historical rate tracking for audits
```

#### IMPLEMENTATION
```typescript
// Add to Stripe integration:
const supportedCurrencies = {
  'pt-PT': { code: 'eur', symbol: '€', locale: 'pt-PT' },
  'pt-BR': { code: 'brl', symbol: 'R$', locale: 'pt-BR' },
  'en-US': { code: 'usd', symbol: '$', locale: 'en-US' },
  'es-ES': { code: 'eur', symbol: '€', locale: 'es-ES' }
}

// Exchange rate service:
src/lib/currency/exchange-rates.ts
  - Fetch from Open Exchange Rates API
  - Cache in Redis (24h TTL)
  - Fallback to previous rate if API fails

// Database schema update:
ALTER TABLE pricing_rules ADD COLUMN currency TEXT DEFAULT 'eur';
ALTER TABLE properties ADD COLUMN display_currency TEXT DEFAULT 'eur';
```

---

### 3. MOBILE RESPONSIVENESS

#### TODAY ❌
```
Mobile Score (Lighthouse): ~30-40%
Issues:
  - Dashboard not responsive
  - Calendar breaks on mobile
  - Forms too wide
  - Navigation not mobile-optimized
  - Buttons too small (< 48px)
  - No bottom tab bar
  - No offline support
  - Not PWA installable
```

#### TARGET (Q3 2026) ✅
```
Mobile Score (Lighthouse): 95%+
Features:
  ✓ Fully responsive design (mobile-first)
  ✓ Touch-optimized buttons (48px minimum)
  ✓ Bottom tab bar for main navigation
  ✓ Drawer menu for secondary nav
  ✓ Swipe gestures (calendar, bookings)
  ✓ PWA installable (app-like experience)
  ✓ Offline support (cached data)
  ✓ One-handed navigation
  ✓ Fast load times (< 2s on 4G)
```

---

### 4. COMPLIANCE & LEGAL

#### TODAY ⚠️
```
Portugal (RGPD): 70% compliant
  - ✓ Audit logs
  - ✓ Data deletion
  - ⚠️ Missing: Cookie consent, Privacy policy automation

Brazil (LGPD): 0% compliant
  - ✗ No LGPD consent model
  - ✗ No fiscal NF-e export
  - ✗ No RPA tracking

USA (FIRPTA/1099): 0% compliant
  - ✗ No 1099-NEC generation
  - ✗ No W-9 collection
  - ✗ No withholding calculation
```

#### TARGET (Q2-Q3 2026) ✅
```
PORTUGAL — Full RGPD Compliance
┌──────────────────┬─────────┬──────────────────┐
│ Requirement      │ Status  │ Implementation   │
├──────────────────┼─────────┼──────────────────┤
│ Consent forms    │ ✓       │ Auto-generated   │
│ Privacy policy   │ ✓       │ Template-based   │
│ Data export      │ ✓       │ GDPR right       │
│ Data deletion    │ ✓       │ Audit trail      │
│ Breach reporting │ ✓       │ Auto-notify      │
└──────────────────┴─────────┴──────────────────┘

BRAZIL — Full LGPD Compliance
┌──────────────────┬─────────┬──────────────────┐
│ Requirement      │ Status  │ Implementation   │
├──────────────────┼─────────┼──────────────────┤
│ LGPD consent     │ ✓       │ Auto-generated   │
│ Privacy policy   │ ✓       │ Template-based   │
│ Fiscal tracking  │ ✓       │ NF-e export      │
│ RPA tracking     │ ✓       │ Auto-report      │
│ Data deletion    │ ✓       │ Audit trail      │
└──────────────────┴─────────┴──────────────────┘

USA — Full 1099/FIRPTA Compliance
┌──────────────────┬─────────┬──────────────────┐
│ Requirement      │ Status  │ Implementation   │
├──────────────────┼─────────┼──────────────────┤
│ 1099-NEC gen     │ ✓       │ Auto-generated   │
│ W-9 collection   │ ✓       │ Form storage     │
│ FIRPTA calc      │ ✓       │ 15% withholding  │
│ Tax export       │ ✓       │ CSV for CPA      │
│ Deduction track  │ ✓       │ Dashboard        │
└──────────────────┴─────────┴──────────────────┘
```

---

### 5. CORE FEATURES

#### TODAY ⚠️
```
Property Management:
  ✓ Create/edit/delete properties
  ✓ Photos upload
  ⚠️ Limited to single currency
  ⚠️ No dynamic pricing (only min_nights + base_price)

Booking Management:
  ✓ Create/manage reservations
  ✓ Calendar view
  ⚠️ Basic pricing only
  ✗ No guest review system
  ✗ No automated messaging

Payments:
  ✓ Stripe integration
  ⚠️ EUR only
  ✗ No PIX (Brazil)
  ✗ No payment plans

Integrations:
  ✓ iCal (basic)
  ✗ Airbnb (none)
  ✗ Booking.com (none)
  ✗ Accounting software (none)
```

#### TARGET (Q4 2026-Q1 2027) ✅
```
✓ = MUST HAVE | 🔄 = NICE-TO-HAVE

PROPERTY MANAGEMENT
✓ Multi-currency pricing rules
✓ Dynamic pricing templates
✓ Seasonal pricing
✓ Length-of-stay discounts
✓ Document templates (house rules, contracts)
🔄 Seasonal calendar predictions

BOOKING MANAGEMENT
✓ Guest review system (5-star + categories)
✓ Guest screening (email + optional KYC)
✓ Automated messaging (welcome, check-in, check-out)
✓ Request management (guest → host)
✓ Automated dispute resolution
🔄 Guest profiles (repeat guests tracking)

PAYMENTS
✓ PIX integration (Brazil)
✓ USD support (USA)
✓ Multiple payment methods per market
✓ Partial refunds
🔄 Payment plans (subscriptions)

INTEGRATIONS
✓ Airbnb sync (calendar + pricing)
✓ Booking.com sync (calendar + pricing)
✓ Stripe API (payments)
✓ Resend (email)
✓ Tax software export (CSV)
🔄 Accounting software (Xero, Qonto)

AUTOMATION
✓ Guest welcome message (auto)
✓ Check-in reminder (auto, 24h before)
✓ Check-out reminder (auto)
✓ Review request (auto, after checkout)
✓ Cancellation policy enforcement
🔄 Dynamic pricing suggestions
```

---

## 🗺️ IMPLEMENTATION ROADMAP

### PHASE 0: PLANNING & SETUP
**Duration:** 1 week  
**Owner:** Product, Engineering  
**Status:** ✅ COMPLETO

#### Tasks
- [x] Strategic analysis complete (THIS DOCUMENT)
- [x] Rebranding Home Stay → Lodgra (100% codebase)
- [x] QA Completo — 0 TypeScript errors, 0 ESLint errors
- [x] Code Review estruturado (Quinn QA agent)
- [ ] Create implementation stories in GitHub
- [ ] Hire/contract compliance specialist
- [ ] Design UX/UI for mobile
- [ ] Create Stripe test account for multi-currency

#### Deliverables
- GitHub project with prioritized stories
- Legal framework outline (compliance)
- Mobile wireframes
- i18n refactor specification

---

### PHASE 1: FOUNDATION (Q2 2026 — Weeks 1-12)
**Duration:** 3 months  
**Owner:** Engineering  
**Objective:** Make product market-ready for Brazil + USA

#### Sprint 1-2: Internationalization (PT, EN, ES) ✅ COMPLETO
**Duration:** 2 weeks (May 1-15)  
**Stories:**
- Refactor i18n system to namespace-based
- Add English (en-US) translations
- Add Spanish (es-ES) translations
- Add locale selector in header
- Auto-detect language from browser

**Deliverables:**
- All UI strings translated (PT, EN, ES)
- Language switcher functional
- Locale auto-detection working
- Test coverage: 80%+

**Acceptance Criteria:**
- ✓ All pages render in all 3 languages
- ✓ No hardcoded strings in components
- ✓ Browser language auto-detection works
- ✓ Manual language switcher in header
- ✓ All emails translated

---

#### Sprint 3-4: Multi-Currency Support (EUR, BRL, USD)
**Duration:** 2 weeks (May 16-31)  
**Stories:**
- Add currency selector to user profile
- Integrate exchange rate API (Open Exchange Rates)
- Update Stripe integration for multi-currency
- Create database schema for currency tracking
- Add currency display formatting (Intl.NumberFormat)

**Deliverables:**
- Users can select preferred currency
- Prices display in selected currency
- Checkout in selected currency
- Exchange rates cached (24h)
- Currency conversion transparent to user

**Acceptance Criteria:**
- ✓ User can switch currencies
- ✓ All prices display in selected currency
- ✓ Stripe payment works in all 3 currencies
- ✓ Exchange rate API integrated
- ✓ Rate caching working (Redis)

---

#### Sprint 5-6: Compliance Framework - Portugal
**Duration:** 2 weeks (June 1-15)  
**Stories:**
- RGPD consent forms (auto-generated)
- Privacy policy generator (template-based)
- Cookie consent banner
- Data export functionality (GDPR right)
- Data deletion audit trail

**Deliverables:**
- Legal templates for PT/BR/US
- Consent forms in all languages
- Privacy policy auto-generator
- Data export/deletion flows
- Audit logging system

**Acceptance Criteria:**
- ✓ RGPD forms appear on signup
- ✓ Privacy policy auto-generated
- ✓ Cookie consent banner shows
- ✓ Data export works (GDPR)
- ✓ Data deletion logs audited

---

#### Sprint 7-8: Compliance Framework - Brazil & USA
**Duration:** 2 weeks (June 16-30)  
**Stories:**
- LGPD consent forms (Brazil)
- Fiscal NF-e integration (Brazil) — **PHASE OUT TO Q3**
- 1099-NEC generation (USA)
- W-9 collection (USA)
- FIRPTA withholding calculator (USA)

**Deliverables:**
- LGPD compliance framework
- 1099-NEC generation system
- W-9 form collection
- Tax withholding calculator

**Acceptance Criteria:**
- ✓ LGPD consent on signup (Brazil users)
- ✓ 1099-NEC generates correctly
- ✓ W-9 collected and stored
- ✓ FIRPTA calculation accurate

---

#### Sprint 9-10: Mobile First Redesign - Part 1
**Duration:** 2 weeks (July 1-15)  
**Stories:**
- Responsive layout for all pages
- Touch-optimized buttons (48px minimum)
- Bottom tab bar navigation
- Drawer menu for secondary nav
- Mobile forms optimization

**Deliverables:**
- Mobile layout working
- Touch gestures implemented
- Navigation mobile-optimized
- Mobile Lighthouse score: 70%+

**Acceptance Criteria:**
- ✓ Dashboard responsive
- ✓ All buttons 48px+ (touch-friendly)
- ✓ Navigation on mobile works
- ✓ Forms fill-able on mobile
- ✓ Mobile Lighthouse: 70%+

---

#### Sprint 11-12: Mobile First Redesign - Part 2 + PWA
**Duration:** 2 weeks (July 16-31)  
**Stories:**
- PWA manifest.json configuration
- Service worker for offline support
- Caching strategy (static + dynamic)
- PWA installable app icon
- Mobile Lighthouse optimization

**Deliverables:**
- PWA installable on iOS/Android
- Offline support for cached data
- Fast load times (< 2s on 4G)
- Mobile Lighthouse score: 95%+

**Acceptance Criteria:**
- ✓ PWA installable
- ✓ Offline mode works
- ✓ Service worker caching
- ✓ Mobile Lighthouse: 95%+
- ✓ Tested on real devices

---

### PHASE 2: DIFFERENTIATION (Q3 2026 — Weeks 13-24)
**Duration:** 3 months  
**Owner:** Engineering + Product  
**Objective:** Build features to differentiate from competitors

#### Sprint 13: PIX Payment Integration (Brazil)
**Duration:** 1 week (Aug 1-7)  
**Stories:**
- Add PIX payment method to Stripe
- PIX QR code generation
- Payment webhook handling

**Deliverables:**
- PIX payments functional
- Brazilian users can pay with PIX
- Webhook processing working

**Impact:** Unlock Brazil market (90% of Brazilian digital payments use PIX)

---

#### Sprint 14: Guest Review System
**Duration:** 1.5 weeks (Aug 8-19)  
**Stories:**
- Create guest_reviews database schema
- Review submission form (after checkout)
- Review display on property listing
- Review moderation (report button)
- Aggregate rating calculation

**Deliverables:**
- Guests can leave reviews
- Hosts can view reviews
- Reviews build social proof

---

#### Sprint 15: Guest Screening System
**Duration:** 1.5 weeks (Aug 20-31)  
**Stories:**
- Email verification (required)
- Phone verification (optional)
- Identity verification (Stripe KYC - optional)
- Cancellation history tracking
- Custom house rules enforcement

**Deliverables:**
- Guest screening workflow
- Identity verification optional
- Hosts can enforce house rules

---

#### Sprint 16: Airbnb Calendar Sync
**Duration:** 2 weeks (Sep 1-14)  
**Stories:**
- Airbnb API authentication
- Calendar sync (two-way)
- Reservation sync
- Price sync (one-way)
- Error handling + retry logic

**Deliverables:**
- Airbnb calendar synced
- Double-bookings prevented
- Prices consistent across platforms

**Note:** Requires Airbnb partnership or Zapier/n8n automation

---

#### Sprint 17: Booking.com Sync
**Duration:** 2 weeks (Sep 15-28)  
**Stories:**
- Booking.com API integration
- Calendar sync (two-way)
- Reservation sync
- Rate sync

**Deliverables:**
- Booking.com integrated
- Multi-platform management
- Unified calendar view

---

#### Sprint 18: Dynamic Pricing Engine - Phase 1
**Duration:** 2 weeks (Sep 29 - Oct 12)  
**Stories:**
- Seasonal pattern detection (auto)
- Length-of-stay discounts
- Last-minute pricing (< 7 days)
- Pricing suggestion dashboard

**Deliverables:**
- Dynamic pricing working
- +15-25% revenue uplift expected
- Pricing analytics dashboard

---

#### Sprint 19: Automations - Messaging
**Duration:** 2 weeks (Oct 13-26)  
**Stories:**
- Guest welcome message (auto post-booking)
- Check-in reminder (auto 24h before)
- Check-out reminder (auto)
- Review request (auto after checkout)
- AI-powered message suggestions

**Deliverables:**
- Guest communication automated
- Engagement metrics tracked
- Hosts focus on operations

---

#### Sprint 20: Advanced Analytics Dashboard
**Duration:** 2 weeks (Oct 27 - Nov 9)  
**Stories:**
- Revenue breakdown (by property, month, source)
- Occupancy rates (% nights booked)
- Guest insights (avg stay, repeat rate)
- Pricing analysis (vs market)
- Forecast (next 3 months)
- Benchmarking (vs market average)

**Deliverables:**
- Analytics dashboard working
- Data-driven insights for hosts
- Revenue optimization visible

---

#### Sprint 21-24: Market-Specific Features
**Duration:** 4 weeks (Nov 10 - Dec 8)  
**Stories:**
- Brazil: NF-e export (fiscal invoices)
- Brazil: RPA auto-report
- USA: Tax deduction tracking
- All: Document templates (house rules, contracts)
- All: Legal templates library

**Deliverables:**
- Fiscal compliance (Brazil)
- Tax efficiency (USA)
- Legal templates (all)

---

### PHASE 3: OPTIMIZATION & SCALE (Q1 2027 — Weeks 25-52)
**Duration:** 6 months  
**Owner:** Engineering + Operations  
**Objective:** Scale to 30,000+ users, optimize performance

#### Priorities
- Performance optimization (99.9% uptime)
- Scalability (handle 10x load)
- Security hardening
- Customer success workflows
- Market-specific features (Spain)

---

## 📈 GO-TO-MARKET STRATEGY

### Market Entry Timeline

#### 🇵🇹 PORTUGAL (Existing Market)
**Timeline:** LIVE NOW  
**Strategy:**
- Consolidate existing customers
- Upsell new features (automation, analytics)
- Target 2,000 active users by Q1 2027
- Focus on SMB segment (2-10 properties)

**Marketing:**
- Local partnerships (property management associations)
- SEO (Portuguese keywords)
- Direct sales (< 10 properties, high value)
- Referral program (20% commission)

---

#### 🇧🇷 BRAZIL (Expansion)
**Timeline:** Q3 2026 (post-PIX integration)  
**Strategy:**
- Target 10,000 active users by Q1 2027
- Undercut Airbnb (20% vs 30% commission)
- Focus on mid-market (5-20 properties)
- Language: Portuguese (Brazilian dialect)
- Currency: Real (R$)

**Marketing:**
- Social media (TikTok, Instagram)
- Influencer partnerships (micro-influencers)
- Free trial (2 weeks)
- Regional partnerships (tourism boards)
- Press (tech media in Portuguese)

**Competitive Advantage:**
- PIX native support (vs competitors)
- Fiscal compliance built-in
- LGPD certified
- Local customer support (Portuguese)

---

#### 🇺🇸 USA (Expansion)
**Timeline:** Q3 2026 (post-English/USD launch)  
**Strategy:**
- Target 10,000 active users by Q1 2027
- Undercut AppFolio ($50-200/mo vs $100+/mo)
- Focus on SMB segment (1-5 properties)
- Language: English (American)
- Currency: Dollar ($)

**Marketing:**
- Google Ads (SEM)
- Property management directories (IREM)
- Partnerships with property accountants
- Webinars (tax-focused for hosts)
- PR (US tech media)

**Competitive Advantage:**
- Affordable ($29-99/mo vs $100+)
- Built-in tax reporting (1099-NEC)
- Modern UI (vs legacy AppFolio)
- Mobile app (PWA)

---

#### 🇪🇸 SPAIN (Future - Q3 2027+)
**Timeline:** Post-Q1 2027  
**Strategy:** Replicate Portugal success in Spain market

---

## 💰 FINANCIAL PROJECTIONS

### Revenue Model
```yaml
Subscription Tiers:
  Starter: €29/month (1 property)
  Professional: €79/month (up to 5 properties)
  Enterprise: Custom (10+ properties)

Additional Revenue:
  - Commission on bookings (2-3%) — future
  - Tax report generation (€5-10 per report) — future
  - Premium support (€500/month) — future

Customer Acquisition Cost (CAC):
  Portugal: €200 (direct sales)
  Brazil: €50 (social media)
  USA: €100 (SEM)

Lifetime Value (LTV):
  Average subscription: €79/month
  Average lifespan: 24 months
  LTV: €1,896 per customer

LTV:CAC Ratio Target: 5:1
```

### Projections

| Period | Markets | Users | ARR | Status |
|--------|---------|-------|-----|--------|
| TODAY (Apr 2026) | 1 | 100 | €12K | ✓ |
| Q2 2026 | 1 | 200 | €28K | Plan |
| Q3 2026 | 3 | 5K | €600K | Plan |
| Q4 2026 | 3 | 15K | €1.4M | Plan |
| Q1 2027 | 3 | 30K | €2.1M | Plan |
| Q2 2027 | 4 | 50K | €3.6M | Vision |

---

## 🎯 SUCCESS METRICS & KPIs

### Product KPIs
```
- Mobile Lighthouse score: 95%+
- Page load time: < 2s (4G)
- API response time: < 200ms (p95)
- Database query time: < 100ms (p95)
- Uptime: 99.9%+
- Test coverage: 80%+
```

### User KPIs
```
- Signup-to-first-booking: < 7 days
- Daily active users: 15%+ of base
- Monthly feature adoption: 30%+
- Customer satisfaction (NPS): 50+
- Churn rate: < 5%/month
```

### Business KPIs
```
- Customer acquisition cost (CAC): < €100
- Lifetime value (LTV): > €2,000
- LTV:CAC ratio: > 5:1
- Monthly recurring revenue (MRR): €100K+
- Annual recurring revenue (ARR): €1.2M+
- Net revenue retention (NRR): 110%+
```

---

## ⚠️ RISKS & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|---|---|---|
| Airbnb blocks API access | MEDIUM | HIGH | Use Zapier/n8n alternative |
| Compliance delays (legal) | HIGH | HIGH | Hire expert NOW (week 1) |
| Mobile UX still poor | MEDIUM | MEDIUM | Hire UX designer, iterate |
| PIX adoption slower than expected | LOW | MEDIUM | Bundle with other features |
| Competitor enters market | HIGH | HIGH | Build features fast, lock users |
| Currency fluctuations (BRL/USD) | MEDIUM | LOW | Hedge with Stripe's tools |

---

## 📋 NEXT STEPS (IMMEDIATE)

### ✅ CONCLUÍDO até 2026-04-19
- [x] Rebranding 100% (Home Stay → Lodgra)
- [x] Multilíngue: PT · PT-BR · EN-US · ES
- [x] Pricing BRL: Starter R$97 / Pro R$297 / Enterprise R$497
- [x] Página `/cleaning` no sidebar (BottomNav)
- [x] QA Completo — 0 TypeScript errors · 0 ESLint errors
- [x] Code Review estruturado — `<Link>`, types, any, prefer-const, unescaped entities
- [x] Manifest PWA atualizado para Lodgra
- [x] User-Agent iCal atualizado para Lodgra

### 🔜 PRÓXIMOS PASSOS — Production Launch (W6+)
- [ ] Configurar Stripe webhook (produção)
- [ ] Variáveis de ambiente no Vercel (produção)
- [ ] Configuração de domínio `lodgra.io`
- [ ] Executar migrações SQL em produção
- [ ] ⚠️ Adicionar validação HMAC ao webhook Asaas (`src/app/api/webhooks/asaas/route.ts`)

---

## 📞 STAKEHOLDERS & OWNERSHIP

| Role | Person | Responsibilities |
|------|--------|------------------|
| **Product Lead** | User | Vision, roadmap, prioritization |
| **Engineering Lead** | Dex | Technical execution, architecture |
| **QA Lead** | Quinn | Testing, quality gates, compliance validation |
| **Design Lead** | UX Designer (TBH) | Mobile design, UX flows |
| **Compliance Lead** | Legal Expert (TBH) | RGPD, LGPD, FIRPTA, tax |
| **DevOps Lead** | Gage | Deployment, scaling, monitoring |

---

## 📚 APPENDIX

### A. Language & Locale Mapping

```yaml
Supported Locales:
  - pt-PT (Portuguese/Portugal)
    - Language: Portuguese (Portugal)
    - Currency: EUR (€)
    - Flag: 🇵🇹
    - Region: EU
    
  - pt-BR (Portuguese/Brazil)
    - Language: Portuguese (Brazil)
    - Currency: BRL (R$)
    - Flag: 🇧🇷
    - Region: Latin America
    
  - en-US (English/USA)
    - Language: English (American)
    - Currency: USD ($)
    - Flag: 🇺🇸
    - Region: North America
    
  - es-ES (Spanish/Spain)
    - Language: Spanish (Spain)
    - Currency: EUR (€)
    - Flag: 🇪🇸
    - Region: EU (Future)
```

### B. Compliance Checklist

**PORTUGAL (RGPD)**
- [ ] Consent forms
- [ ] Privacy policy
- [ ] Cookie banner
- [ ] Data export
- [ ] Data deletion

**BRAZIL (LGPD)**
- [ ] Consent forms
- [ ] Privacy policy
- [ ] Data export
- [ ] NF-e export
- [ ] RPA auto-report

**USA (1099/FIRPTA)**
- [ ] 1099-NEC generation
- [ ] W-9 collection
- [ ] FIRPTA calculation
- [ ] Tax export (CSV)
- [ ] Deduction tracking

### C. Technology Stack Additions

```yaml
Additions for Multi-Market:
  - i18n Framework: i18next (or next-intl)
  - Exchange Rates: Open Exchange Rates API
  - Localization: date-fns, Intl APIs
  - Mobile: Tailwind + shadcn/ui
  - PWA: Service Worker, Manifest.json
  - Tax: Custom tax calculation module
  - Compliance: Legal template engine
  - Automation: n8n (open-source) or Zapier
```

### D. Resource Requirements

**Team Additions (H1 2026)**
```
- 1 Compliance/Legal Specialist (contractor, 3 months)
- 1 UX/UI Designer (contractor, 4 weeks)
- 1 Full-stack Developer (hire, 3 months)
- 1 QA Engineer (hire, ongoing)

Budget: €80-120K (consulting + hiring)
```

---

**Document Status:** ACTIVE GUIDE  
**Next Review:** June 30, 2026 (End of Phase 1)  
**Approval:** PENDING STAKEHOLDER SIGN-OFF

---

## 🔗 Related Documents

- Implementation Stories: `docs/IMPLEMENTATION_STORIES.md` (TBD)
- Technical Specification: `docs/TECH_SPEC.md` (TBD)
- Compliance Framework: `docs/COMPLIANCE_FRAMEWORK.md` (TBD)
- Mobile Design: `docs/MOBILE_DESIGN.md` (TBD)

---

**Last Updated:** 2026-04-19  
**Version:** 1.1  
**Status:** PUBLISHED ✅
