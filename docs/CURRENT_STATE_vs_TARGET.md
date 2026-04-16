# 📊 Current State vs Target State — Visual Comparison

**Document:** Quick reference guide  
**Date:** 2026-04-03  
**Purpose:** Show exactly where we are TODAY and where we want to be by Q1 2027

---

## 🌍 MARKETS & LANGUAGES

### TODAY (April 2026) ❌

```
┌────────────────────────────────────────────────┐
│         CURRENT: Portugal ONLY                 │
├────────────────────────────────────────────────┤
│                                                │
│   🇵🇹 Portugal          ✅ Live                │
│       Language: PT + PT-BR                     │
│       Users: ~100-500                          │
│       ARR: €12K                                │
│                                                │
│   🇧🇷 Brazil             ❌ Not Available      │
│   🇺🇸 USA                ❌ Not Available      │
│   🇪🇸 Spain              ❌ Not Available      │
│                                                │
└────────────────────────────────────────────────┘
```

### TARGET: Q1 2027 ✅

```
┌────────────────────────────────────────────────┐
│    TARGET: Global Platform (4 Markets)         │
├────────────────────────────────────────────────┤
│                                                │
│   🇵🇹 Portugal          ✅ Live (Consolidated)│
│       Language: PT (Portugal)                  │
│       Currency: EUR (€)                        │
│       Users: 5,000                            │
│       ARR: €600K                              │
│                                                │
│   🇧🇷 Brazil             ✅ Launch Q3 2026     │
│       Language: PT (Brazilian)                 │
│       Currency: BRL (R$)                       │
│       Users: 10,000                           │
│       ARR: €900K                              │
│                                                │
│   🇺🇸 USA                ✅ Launch Q3 2026     │
│       Language: English (US)                   │
│       Currency: USD ($)                        │
│       Users: 10,000                           │
│       ARR: €600K                              │
│                                                │
│   🇪🇸 Spain              🔮 Launch Q3 2027     │
│       Language: Spanish (Spain)                │
│       Currency: EUR (€)                        │
│       Users: 5,000 (estimated)                │
│       ARR: €300K (estimated)                  │
│                                                │
│   TOTAL USERS: 30,000+                        │
│   TOTAL ARR: €2.4M+                           │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 💰 CURRENCIES & PAYMENT METHODS

### TODAY ❌

```
Supported Currencies:       Only EUR
Supported Payment Methods:  Only Stripe (EUR)
Checkout Language:          PT/PT-BR only
User Preference:            No choice
Exchange Rates:             None
```

### TARGET ✅

```
Supported Currencies:
┌──────────┬────────────────┬──────────┐
│ Country  │ Currency Code  │ Symbol   │
├──────────┼────────────────┼──────────┤
│ 🇵🇹 PT   │ EUR            │ €        │
│ 🇧🇷 BR   │ BRL            │ R$       │
│ 🇺🇸 US   │ USD            │ $        │
│ 🇪🇸 ES   │ EUR            │ €        │
└──────────┴────────────────┴──────────┘

Supported Payment Methods:
┌──────────┬──────────────────┐
│ Country  │ Payment Methods  │
├──────────┼──────────────────┤
│ 🇵🇹 PT   │ Card, Apple Pay  │
│ 🇧🇷 BR   │ Card, PIX ✨     │
│ 🇺🇸 US   │ Card, Apple Pay  │
│ 🇪🇸 ES   │ Card, Apple Pay  │
└──────────┴──────────────────┘

Features:
✓ Currency selector in profile
✓ Real-time exchange rates (24h cache)
✓ Prices displayed in selected currency
✓ Automatic conversion at checkout
✓ Historical rate tracking
✓ PIX native support (Brazil)
```

---

## 📱 MOBILE RESPONSIVENESS

### TODAY ❌

```
Mobile Score (Lighthouse):   30-40% ❌
Mobile Usability Issues:
  ❌ Dashboard breaks on mobile
  ❌ Calendar not touch-optimized
  ❌ Forms too wide
  ❌ Buttons too small (< 48px)
  ❌ No bottom navigation
  ❌ No offline support
  ❌ Not installable (PWA)

Desktop Score:               ✅ 80-90%
```

### TARGET ✅

```
Mobile Score (Lighthouse):   95%+ ✅
Mobile Features:
  ✓ Fully responsive design (mobile-first)
  ✓ Touch-optimized buttons (48px+)
  ✓ Bottom tab bar navigation
  ✓ Drawer menu for secondary nav
  ✓ Swipe gestures (calendar, booking)
  ✓ Offline support (cached data)
  ✓ PWA installable (app-like)
  ✓ Fast load times (< 2s on 4G)
  ✓ One-handed navigation

Desktop Score:               ✅ 95%+
```

---

## 🛡️ COMPLIANCE & LEGAL

### TODAY ⚠️

```
PORTUGAL (RGPD)
  ✓ Audit logs
  ✓ Data deletion
  ⚠️ Missing: Cookie consent, Privacy automation
  Coverage: ~70%

BRAZIL (LGPD)
  ❌ No compliance framework
  ❌ No fiscal exports
  Coverage: 0%

USA (1099/FIRPTA)
  ❌ No compliance framework
  ❌ No tax reporting
  Coverage: 0%

SPAIN (Future)
  ❌ No framework
  Coverage: 0%
```

### TARGET ✅

```
PORTUGAL (RGPD) — 100% Compliant ✓
  ✓ Consent forms (auto-generated)
  ✓ Privacy policy (template-based)
  ✓ Cookie banner
  ✓ Data export (GDPR right)
  ✓ Data deletion audit trail

BRAZIL (LGPD) — 100% Compliant ✓
  ✓ Consent forms (auto-generated)
  ✓ Privacy policy (template-based)
  ✓ NF-e export (fiscal invoices)
  ✓ RPA auto-report
  ✓ Data deletion audit trail

USA (1099/FIRPTA) — 100% Compliant ✓
  ✓ 1099-NEC generation
  ✓ W-9 collection & storage
  ✓ FIRPTA withholding calculator (15%)
  ✓ Tax export (CSV for CPA)
  ✓ Deduction tracking

SPAIN (IVA) — 100% Compliant ✓
  ✓ Privacy policy
  ✓ IVA compliance
  ✓ EU regulatory alignment
```

---

## 🎯 CORE FEATURES COMPARISON

### Property Management

#### TODAY ❌
```
  ✓ Create/edit/delete properties
  ✓ Upload photos
  ⚠️ Single currency only
  ❌ No dynamic pricing (only min_nights + base_price)
  ❌ No seasonal pricing
  ❌ No length-of-stay discounts
```

#### TARGET ✅
```
  ✓ Create/edit/delete properties
  ✓ Upload photos (multiple variants)
  ✓ Multi-currency pricing
  ✓ Dynamic pricing (seasonal, demand-based)
  ✓ Length-of-stay discounts
  ✓ Last-minute pricing
  ✓ Document templates (house rules, contracts)
  ✓ Pricing rules with flexibility
```

---

### Booking Management

#### TODAY ⚠️
```
  ✓ Create/manage reservations
  ✓ Calendar view
  ⚠️ Basic pricing only
  ❌ No guest reviews
  ❌ No guest screening
  ❌ No automated messaging
  ❌ No request management
```

#### TARGET ✅
```
  ✓ Create/manage reservations
  ✓ Advanced calendar view
  ✓ Dynamic pricing applied
  ✓ Guest reviews (5-star + categories)
  ✓ Guest screening (email + KYC)
  ✓ Automated messaging (welcome, reminders, reviews)
  ✓ Request management (guest → host)
  ✓ Guest profiles & repeat tracking
  ✓ Automated dispute resolution
```

---

### Payments & Integrations

#### TODAY ⚠️
```
Payment Methods:
  ✓ Stripe (EUR only)
  ❌ No PIX (Brazil)
  ❌ No payment plans

Integrations:
  ✓ iCal (basic)
  ❌ Airbnb sync (none)
  ❌ Booking.com sync (none)
  ❌ Accounting software (none)

Analytics:
  ⚠️ Basic commissions view only
```

#### TARGET ✅
```
Payment Methods:
  ✓ Stripe (EUR, BRL, USD)
  ✓ PIX (Brazil) ✨
  ✓ Multiple payment methods per market
  ✓ Payment plans (future)

Integrations:
  ✓ iCal (bidirectional)
  ✓ Airbnb sync (calendar + pricing)
  ✓ Booking.com sync (calendar + pricing)
  ✓ Accounting software (Xero, Qonto)
  ✓ Tax software export (CSV)

Analytics:
  ✓ Revenue breakdown (property, month, source)
  ✓ Occupancy rates (%)
  ✓ Guest insights (avg stay, repeat rate)
  ✓ Pricing analysis (vs market)
  ✓ Forecasting (next 3 months)
  ✓ Benchmarking (market comparison)
```

---

### Automation

#### TODAY ❌
```
  ❌ No guest messaging
  ❌ No automated reminders
  ❌ No review requests
  ❌ Manual operations required
```

#### TARGET ✅
```
  ✓ Guest welcome message (auto post-booking)
  ✓ Check-in reminder (auto 24h before)
  ✓ Check-out reminder (auto)
  ✓ Review request (auto post-checkout)
  ✓ AI-powered message suggestions
  ✓ Cancellation policy enforcement
  ✓ Dispute resolution automation
```

---

## 📊 LANGUAGE & LOCALIZATION

### TODAY ❌

```
Supported Languages:
  ✓ Portuguese (PT)
  ✓ Portuguese (BR - pt-BR)
  ❌ English
  ❌ Spanish

Language Selector:
  ❌ Not available
  ❌ No browser auto-detection
  ❌ No i18n framework

Text Localization:
  ⚠️ Partially done (messages module)
  ❌ Hardcoded strings in components
  ❌ No namespace-based structure

Date/Time/Currency:
  ❌ Hardcoded to PT format
  ❌ No user preference
```

### TARGET ✅

```
Supported Languages:
  ✓ Portuguese (PT) 🇵🇹
  ✓ Portuguese (BR - pt-BR) 🇧🇷
  ✓ English (en-US) 🇺🇸
  ✓ Spanish (es-ES) 🇪🇸

Language Selector:
  ✓ Header flag selector
  ✓ Auto-detect from browser
  ✓ User preference stored
  ✓ URL-based routing (/pt, /en, /es)

Text Localization:
  ✓ Complete translation (all pages, emails)
  ✓ Namespace-based structure (admin.*, booking.*)
  ✓ No hardcoded strings
  ✓ Context-aware translations

Date/Time/Currency:
  ✓ Intl.DateTimeFormat (per locale)
  ✓ Intl.NumberFormat (per locale)
  ✓ User preference stored
  ✓ Automatic formatting based on locale

Files & Templates:
  ✓ All emails translated
  ✓ Legal documents (per country)
  ✓ UI labels translated
  ✓ Error messages translated
```

---

## 📈 BUSINESS METRICS

### User Growth

```
TODAY                    Q2 2026              Q3 2026              Q1 2027
┌─────────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ 100-500     │    →    │ 500-1K   │    →    │ 5-7K     │    →    │ 30K+     │
│ Users       │         │ Users    │         │ Users    │         │ Users    │
│ 1 Market    │         │ 1 Market │         │ 3 Markets│         │ 3 Markets│
│ €12K ARR    │         │ €60K ARR │         │ €600K    │         │ €2.4M    │
│             │         │          │         │ ARR      │         │ ARR      │
└─────────────┘         └──────────┘         └──────────┘         └──────────┘
```

### Revenue Breakdown (Q1 2027)

```
Total ARR: €2.4M

By Market:
  🇵🇹 Portugal:  €600K  (25%)  — Consolidated
  🇧🇷 Brazil:    €900K  (37%)  — Fast growth
  🇺🇸 USA:       €900K  (37%)  — Competitive pricing

By Subscription Tier:
  Starter (€29):      40%  — SMB segment
  Professional (€79): 50%  — Mid-market
  Enterprise:         10%  — Large properties
```

---

## 🎯 PHASE TIMELINE

```
TODAY                Q2 2026              Q3 2026              Q1 2027
Apr 2026             May-Jul 2026         Aug-Oct 2026         Nov 2026-Mar 2027
│                    │                    │                    │
├─ Phase 0:          ├─ Phase 1:          ├─ Phase 2:          ├─ Phase 3:
│  Analysis          │  Foundation        │  Differentiation   │  Optimization
│  (THIS WEEK)       │  (12 weeks)        │  (12 weeks)        │  (12-24 weeks)
│                    │                    │                    │
│  ✓ Strategic       │  ✓ i18n            │  ✓ PIX             │  ✓ Airbnb sync
│    Planning        │  ✓ Multi-currency  │  ✓ Reviews         │  ✓ Analytics
│  ✓ Audit          │  ✓ Mobile First    │  ✓ Screening       │  ✓ Automation
│  ✓ Resource       │  ✓ Compliance      │  ✓ Booking sync    │  ✓ Dynamic pricing
│    Planning        │  ✓ PWA             │  ✓ Messaging       │  ✓ Scale
│                    │                    │                    │
│  Ready: Sprint 1   │  Ready: Go-to-Market                    │  Ready: Expansion
│                    │  (Brazil + USA)                          │  (Spain + Markets)
│                    │                    │                    │
└────────────────────┴────────────────────┴────────────────────┴─────────────────
  PHASE 0             PHASE 1 (Q2)         PHASE 2 (Q3)         PHASE 3 (Q1 2027)
  (Week 1)            12 Sprints           12 Sprints           Ongoing
```

---

## ✅ IMPLEMENTATION CHECKLIST

### PHASE 1 (Q2 2026) — Foundation

#### Sprint 1-2: Internationalization
- [ ] Refactor i18n to namespace-based
- [ ] Add English (en-US) translations
- [ ] Add Spanish (es-ES) translations
- [ ] Add locale selector (header)
- [ ] Browser auto-detection
- **Target:** All strings translated, 3 languages working

#### Sprint 3-4: Multi-Currency
- [ ] Currency selector (profile)
- [ ] Exchange rate API integration
- [ ] Stripe multi-currency setup
- [ ] Database schema updates
- **Target:** Users can select EUR/BRL/USD, checkout works

#### Sprint 5-6: Compliance - Portugal
- [ ] RGPD forms (consent)
- [ ] Privacy policy generator
- [ ] Cookie banner
- [ ] Data export (GDPR right)
- **Target:** Full RGPD compliance

#### Sprint 7-8: Compliance - Brazil & USA
- [ ] LGPD forms
- [ ] 1099-NEC generation
- [ ] W-9 collection
- [ ] FIRPTA calculator
- **Target:** Tax compliance working

#### Sprint 9-12: Mobile & PWA
- [ ] Responsive layout
- [ ] Touch-optimized buttons
- [ ] Bottom navigation
- [ ] Service worker
- [ ] PWA installable
- **Target:** Mobile score 95%+, PWA working

---

### PHASE 2 (Q3 2026) — Differentiation

#### Sprint 13: PIX Integration
- [ ] Stripe PIX setup
- [ ] QR code generation
- [ ] Webhook handling
- **Target:** Brazil users can pay with PIX

#### Sprint 14-15: Reviews & Screening
- [ ] Guest review system
- [ ] Review moderation
- [ ] Guest screening (email)
- [ ] Cancellation history
- **Target:** Social proof + safety features

#### Sprint 16-17: Platform Sync
- [ ] Airbnb calendar sync
- [ ] Booking.com calendar sync
- [ ] Price sync
- [ ] Error handling
- **Target:** Multi-platform management

#### Sprint 18-19: Dynamic Pricing & Automation
- [ ] Seasonal pricing detection
- [ ] Length-of-stay discounts
- [ ] Automated messaging
- [ ] AI suggestions
- **Target:** +15-25% revenue uplift, automation working

#### Sprint 20: Advanced Analytics
- [ ] Revenue breakdown
- [ ] Occupancy rates
- [ ] Guest insights
- [ ] Forecasting
- **Target:** Analytics dashboard live

#### Sprint 21-24: Market-Specific Features
- [ ] Brazil: NF-e export, RPA
- [ ] USA: Tax deductions tracking
- [ ] All: Legal templates
- **Target:** Full market compliance

---

### PHASE 3 (Q1 2027+) — Optimization & Scale

- [ ] Performance optimization (99.9% uptime)
- [ ] Scalability for 10x load
- [ ] Security hardening
- [ ] Customer success workflows
- [ ] Spain market entry (Q3 2027)

---

## 💼 Resources & Budget

### Team Additions Required

```
Q2 2026:
  - 1 Compliance Specialist (contractor, 12 weeks): €15K
  - 1 UX/UI Designer (contractor, 4 weeks): €8K
  - 1 Backend Developer (hire): €40K/yr
  - 1 QA Engineer (hire): €35K/yr

Total Q2 2026: €63K
```

### Infrastructure & Tools

```
  - Stripe API (multi-currency): Included
  - Exchange Rate API: €500/month
  - n8n (automation): €200/month
  - Additional Supabase capacity: €500/month
  - Monitoring & Analytics: €300/month

Total Monthly: ~€1,500
```

---

## 🎯 SUCCESS CRITERIA

By Q1 2027, the product will be considered **successful** if:

```
Users & Growth:
  ✓ 30,000+ total users across 3 markets
  ✓ 10,000+ users in Brazil
  ✓ 10,000+ users in USA
  ✓ 5,000+ users in Portugal

Revenue:
  ✓ €2.4M+ ARR
  ✓ 110%+ net revenue retention (NRR)
  ✓ < €100 CAC (customer acquisition cost)
  ✓ > €2,000 LTV (lifetime value)

Product:
  ✓ 95%+ mobile Lighthouse score
  ✓ 99.9%+ uptime
  ✓ < 2s page load (4G)
  ✓ 3 languages, 3 currencies, full compliance

Market Position:
  ✓ Top 3 property management tool in Portugal
  ✓ Recognized as "affordable Airbnb alternative" in Brazil
  ✓ Competing with AppFolio in USA SMB segment
```

---

## 📞 Questions?

See **Strategic Roadmap** document: `docs/STRATEGIC_ROADMAP.md` for detailed implementation plan, timelines, and risk mitigation.

---

**Document Status:** PUBLISHED ✅  
**Date:** 2026-04-03  
**Version:** 1.0
