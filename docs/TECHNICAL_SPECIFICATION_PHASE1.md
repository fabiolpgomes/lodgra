# 🔧 TECHNICAL SPECIFICATION — Phase 1 (Sprints 1-4)

**Document:** Developer Implementation Guide  
**Audience:** Engineering team, Dev lead  
**Date:** 2026-04-03  
**Version:** 1.0

---

## 📌 PHASE 1 OVERVIEW

**Duration:** 12 weeks (May 1 - Jul 31, 2026)  
**Sprints:** 1-12  
**Goal:** Make product market-ready for Brazil + USA launch

**Critical Path:**
```
Sprint 1-2: i18n refactor (BLOCKING for translation work)
    ↓
Sprint 3-4: Multi-currency (BLOCKING for checkout)
    ↓
Sprint 5-6: Compliance (BLOCKING for Brazil/USA launch)
    ↓
Sprint 7-12: Mobile + PWA (Parallel with above)
```

---

## 🏗️ ARCHITECTURE & TECH STACK

### Current Stack (Existing)
```
Frontend:
  - Next.js 16.1.6 (App Router)
  - React 19.2.3
  - TypeScript 5
  - Tailwind CSS 4
  - shadcn/ui + Radix UI
  - react-hook-form + Zod (validation)
  - date-fns 4.1.0 (dates)
  - Recharts (charts)
  - FullCalendar (calendar)

Backend:
  - Next.js API routes
  - Supabase (Postgres + Auth + RLS)
  - Stripe (payments)
  - Resend (email)
  - Upstash Redis (rate limiting)

Testing:
  - Jest (unit tests)
  - Playwright (e2e)
  
Infra:
  - Vercel (deployment)
  - GitHub (repo)
  - Supabase (database)
```

### New Additions for Phase 1

```yaml
i18n:
  - i18next 23+ OR next-intl 3+
  - Reason: Both support namespaces, both prod-ready
  - Decision: ✅ RECOMMEND: next-intl
    * Better Next.js integration
    * Built-in middleware support
    * Smaller bundle than i18next
    * Easy namespace structure

Currency:
  - Open Exchange Rates API (or xe.com API)
  - Upstash Redis (already using, cache rates)
  - Stripe Multi-Currency (already supported)

Compliance:
  - Legal templates (custom built)
  - Cookie consent (custom + Cookiebot optional)
  - No new deps needed

Mobile/PWA:
  - Workbox (service worker) - included in Next.js
  - manifest.json (PWA config)
  - No new heavy deps
```

### DECISION: i18n Framework

```
OPTION A: i18next
  Pro: Industry standard, huge ecosystem
  Con: Overkill for simple needs, more setup
  
OPTION B: next-intl ✅ RECOMMENDED
  Pro: Next.js native, namespaces, middleware, small bundle
  Con: Newer (but battle-tested in production)
  
DECISION: Go with next-intl
  Install: npm install next-intl
  Setup time: 2 hours
  Learning curve: 2 hours
```

---

## 📁 FILE STRUCTURE — PHASE 1

### Current i18n (❌ to be replaced)
```
src/lib/i18n/
  └── messages.ts          # Flat structure, only 2 locales
```

### Target i18n (✅ with next-intl)
```
src/i18n/
├── config.ts              # next-intl configuration
├── request.ts             # Server-side locale detection
├── routing.ts             # URL routing rules
│
├── messages/
│   ├── pt-PT.json         # Portuguese (Portugal)
│   ├── pt-BR.json         # Portuguese (Brazil)
│   ├── en-US.json         # English (USA)
│   └── es-ES.json         # Spanish (Spain)
│
├── namespaces/
│   ├── auth/
│   │   ├── pt-PT.json
│   │   ├── pt-BR.json
│   │   ├── en-US.json
│   │   └── es-ES.json
│   ├── booking/
│   ├── property/
│   ├── admin/
│   ├── errors/
│   └── common/
│
└── hooks/
    ├── useTranslation.ts
    └── useLocale.ts
```

### Multi-Currency Files (NEW)
```
src/lib/currency/
├── exchange-rates.ts      # Fetch + cache rates
├── formats.ts             # Currency formatting
├── converter.ts           # Currency conversion
└── constants.ts           # Supported currencies config

src/lib/currency/constants.ts:
```typescript
export const SUPPORTED_CURRENCIES = {
  'pt-PT': { code: 'eur', symbol: '€', name: 'Euro' },
  'pt-BR': { code: 'brl', symbol: 'R$', name: 'Real' },
  'en-US': { code: 'usd', symbol: '$', name: 'Dollar' },
  'es-ES': { code: 'eur', symbol: '€', name: 'Euro' }
} as const

export const EXCHANGE_RATE_CONFIG = {
  api_url: 'https://openexchangerates.org/api/latest',
  cache_ttl: 24 * 60 * 60, // 24 hours in seconds
  fallback_rates: {
    'EUR_BRL': 5.5,
    'EUR_USD': 1.1,
    'BRL_USD': 0.2
  }
}
```

### Compliance Files (NEW)
```
src/lib/legal/
├── privacy-policy-generator.ts
├── consent-manager.ts
├── cookie-banner.ts
└── templates/
    ├── privacy-policy-pt-PT.md
    ├── privacy-policy-pt-BR.md
    ├── privacy-policy-en-US.md
    └── privacy-policy-es-ES.md

src/components/legal/
├── ConsentForm.tsx
├── CookieBanner.tsx
└── PrivacyPolicyViewer.tsx
```

### Mobile/PWA Files (NEW)
```
public/
├── manifest.json          # PWA manifest
├── sw.js                  # Service worker (auto from Next.js)
└── icons/
    ├── icon-192x192.png
    ├── icon-512x512.png
    └── apple-touch-icon.png

src/app/
├── layout.tsx             # Add PWA meta tags
└── robots.ts              # PWA configuration
```

---

## 💾 DATABASE SCHEMA CHANGES

### Sprint 3-4: Multi-Currency

```sql
-- Add display_currency to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'eur'
CHECK (display_currency IN ('eur', 'brl', 'usd'));

-- Create exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_currencies 
ON exchange_rates(from_currency, to_currency, timestamp DESC);

-- Add currency to pricing_rules (for future multi-currency pricing)
ALTER TABLE pricing_rules 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur';

-- Add currency to reservations (track payment currency)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'eur';
```

### Sprint 5-6: Compliance

```sql
-- Create user consent tracking
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_value BOOLEAN NOT NULL,
  consented_at TIMESTAMP NOT NULL DEFAULT NOW(),
  consent_version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id)
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_organization_id ON user_consents(organization_id);

-- Create audit log for RGPD/LGPD compliance
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS consent_related BOOLEAN DEFAULT FALSE;
```

---

## 🔌 API CHANGES & INTEGRATIONS

### Sprint 3-4: Exchange Rate Service

```typescript
// src/lib/currency/exchange-rates.ts

import { Upstash } from '@upstash/redis'

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: Date
}

class ExchangeRateService {
  private redis = new Upstash(process.env.UPSTASH_REDIS_REST_URL!)
  private apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY!
  
  async getRate(from: string, to: string): Promise<number> {
    // 1. Check Redis cache
    const cacheKey = `rate:${from}:${to}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return parseFloat(cached as string)
    
    // 2. Fetch from API
    const rate = await this.fetchFromAPI(from, to)
    
    // 3. Cache for 24h
    await this.redis.setex(cacheKey, 86400, rate.toString())
    
    return rate
  }
  
  async fetchFromAPI(from: string, to: string): Promise<number> {
    const res = await fetch(
      `https://openexchangerates.org/api/latest?app_id=${this.apiKey}&base=${from}`
    )
    const data = await res.json()
    return data.rates[to]
  }
  
  async convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Promise<number> {
    const rate = await this.getRate(from, to)
    return amount * rate
  }
}

export const exchangeRateService = new ExchangeRateService()
```

### Sprint 3-4: Stripe Multi-Currency Checkout

```typescript
// src/app/api/public/bookings/route.ts (MODIFY)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover'
})

// Get user's preferred currency
const userCurrency = user.display_currency || 'eur'

// Convert price to user's currency
const priceInSelectedCurrency = await exchangeRateService.convertCurrency(
  totalAmount,
  'eur', // All prices stored in EUR
  userCurrency
)

// Create checkout session with dynamic currency
const session = await stripe.checkout.sessions.create({
  currency: userCurrency, // 'brl', 'eur', or 'usd'
  line_items: [
    {
      price_data: {
        currency: userCurrency,
        unit_amount: Math.round(priceInSelectedCurrency * 100), // Cents
        product_data: {
          name: `${property.name} — ${nights} noite${nights !== 1 ? 's' : ''}`
        }
      },
      quantity: 1
    }
  ],
  success_url: `${appUrl}/p/${slug}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/p/${slug}`,
  metadata: {
    original_currency: 'eur',
    user_currency: userCurrency,
    exchange_rate: priceInSelectedCurrency / totalAmount
  }
})
```

### Sprint 5-6: Compliance API

```typescript
// src/app/api/consent/route.ts (NEW)

export async function POST(request: NextRequest) {
  const { consentType, consentValue } = await request.json()
  const user = await getUser() // From auth
  
  // Store consent
  const { error } = await adminClient
    .from('user_consents')
    .insert({
      user_id: user.id,
      consent_type: consentType,
      consent_value: consentValue,
      consented_at: new Date().toISOString(),
      ip_address: getClientIp(request),
      user_agent: request.headers.get('user-agent'),
      organization_id: user.organization_id
    })
  
  if (error) throw error
  return NextResponse.json({ success: true })
}
```

---

## 🌐 NEXT.JS APP ROUTER CHANGES

### Sprint 1-2: i18n with next-intl Middleware

```typescript
// src/middleware.ts (MODIFY)

import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['pt-PT', 'pt-BR', 'en-US', 'es-ES'],
  defaultLocale: 'pt-PT',
  localePrefix: 'as-needed' // /pt-PT/... OR /...
})

export const config = {
  matcher: [
    '/(pt-PT|pt-BR|en-US|es-ES)/:path*',
    '/((?!api|_next|.*\\..*).*)'
  ]
}
```

```typescript
// src/app/layout.tsx (MODIFY)

import { notFound } from 'next/navigation'
import { getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Validate locale
  const locales = ['pt-PT', 'pt-BR', 'en-US', 'es-ES']
  if (!locales.includes(locale)) notFound()
  
  // Load messages for locale
  const messages = await getMessages()
  
  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### Sprint 3-4: Currency in Header

```typescript
// src/components/Layout/Header.tsx (MODIFY)

'use client'
import { useCurrency } from '@/lib/currency/hooks'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/constants'

export function Header() {
  const { currency, setCurrency } = useCurrency()
  
  return (
    <header>
      {/* ... existing nav ... */}
      <div className="flex items-center gap-2">
        <select 
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          {Object.entries(SUPPORTED_CURRENCIES).map(([locale, { code, symbol, name }]) => (
            <option key={code} value={code}>
              {symbol} {name} ({locale})
            </option>
          ))}
        </select>
      </div>
    </header>
  )
}
```

### Sprint 5-6: Consent Banner

```typescript
// src/components/legal/ConsentBanner.tsx (NEW)

'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

export function ConsentBanner() {
  const [show, setShow] = useState(false)
  const t = useTranslations('legal')
  
  useEffect(() => {
    // Check if user already gave consent
    const consent = localStorage.getItem('consent-given')
    if (!consent) setShow(true)
  }, [])
  
  const handleConsent = async (value: boolean) => {
    await fetch('/api/consent', {
      method: 'POST',
      body: JSON.stringify({
        consentType: 'service',
        consentValue: value
      })
    })
    
    localStorage.setItem('consent-given', 'true')
    setShow(false)
  }
  
  if (!show) return null
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
      <p className="mb-4">{t('consent_message')}</p>
      <button onClick={() => handleConsent(true)}>{t('accept')}</button>
      <button onClick={() => handleConsent(false)}>{t('decline')}</button>
    </div>
  )
}
```

### Sprint 7-12: PWA Configuration

```json
// public/manifest.json (NEW)

{
  "name": "Home Stay - Property Management",
  "short_name": "Home Stay",
  "description": "Manage your rental properties with ease",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard.png",
      "sizes": "540x720",
      "type": "image/png"
    }
  ]
}
```

```typescript
// src/app/layout.tsx (ADD PWA meta tags)

<head>
  <meta name="theme-color" content="#000000" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Home Stay" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
</head>
```

---

## 📝 IMPLEMENTATION SEQUENCE

### Week 1-2 (May 1-15): i18n + Translations
```
Day 1-2: Install next-intl, create structure
Day 3-4: Set up namespace files (auth, booking, etc)
Day 5-6: Implement locale detection + selector
Day 7-10: Translate all PT strings to EN
Day 10-12: Translate all PT strings to ES
Day 13-14: Integration testing + component fixes
```

**Deliverables:**
- [ ] next-intl working
- [ ] 3 languages available
- [ ] Language selector in header
- [ ] Browser auto-detection working
- [ ] All pages render correctly

---

### Week 3-4 (May 16-31): Multi-Currency
```
Day 1-2: Create currency constants + schema changes
Day 3-4: Integrate Open Exchange Rates API
Day 5-6: Add currency selector to profile
Day 7-9: Update Stripe integration
Day 10-12: Testing + error handling
Day 13-14: Integration testing
```

**Deliverables:**
- [ ] Currency selector works
- [ ] Exchange rates caching
- [ ] Checkout in 3 currencies
- [ ] Price conversion accurate
- [ ] Database tracking working

---

### Week 5-6 (June 1-15): Compliance Framework
```
Day 1-2: Create consent forms UI
Day 3-4: Implement consent API + storage
Day 5-6: Create privacy policy generator
Day 7-9: Add cookie banner
Day 10-12: Legal review + approval
Day 13-14: Testing + QA
```

**Deliverables:**
- [ ] Consent forms on signup
- [ ] Privacy policy generation
- [ ] Cookie banner
- [ ] Audit logs
- [ ] Legal compliance verified

---

### Week 7-12 (June 16 - July 31): Mobile + PWA
```
Week 7-8:   Responsive layout (dashboard, forms)
Week 9:     Touch optimization (buttons, forms)
Week 10:    Navigation redesign (bottom tab bar)
Week 11:    Service worker + offline support
Week 12:    PWA testing + optimization
```

**Deliverables:**
- [ ] Mobile-first design
- [ ] 95%+ Lighthouse score
- [ ] PWA installable
- [ ] Offline support
- [ ] All pages responsive

---

## 🧪 TESTING STRATEGY (PHASE 1)

### Unit Tests (Target: 80%+ coverage)

```typescript
// src/lib/currency/__tests__/exchange-rates.test.ts

describe('ExchangeRateService', () => {
  it('should fetch and cache exchange rates', async () => {
    const service = new ExchangeRateService()
    const rate = await service.getRate('eur', 'brl')
    expect(rate).toBeGreaterThan(5)
  })
  
  it('should return cached rate on second call', async () => {
    // Verify Redis cache working
  })
  
  it('should convert currencies correctly', async () => {
    const result = await service.convertCurrency(100, 'eur', 'usd')
    expect(result).toBeCloseTo(110, 1) // Within 1%
  })
})

// src/lib/i18n/__tests__/translations.test.ts

describe('Translations', () => {
  it('should have all keys translated in all languages', () => {
    const locales = ['pt-PT', 'pt-BR', 'en-US', 'es-ES']
    const keys = Object.keys(ptPT)
    locales.forEach(locale => {
      keys.forEach(key => {
        expect(translations[locale][key]).toBeDefined()
      })
    })
  })
})
```

### Integration Tests

```typescript
// src/app/api/public/bookings/__tests__/multi-currency.test.ts

describe('Multi-Currency Checkout', () => {
  it('should create Stripe session in user currency', async () => {
    const response = await POST(request)
    expect(response.status).toBe(200)
    const { checkout_url } = await response.json()
    expect(checkout_url).toMatch(/stripe.com/)
  })
  
  it('should convert price to user currency', async () => {
    // Verify price conversion accuracy
  })
})
```

### e2e Tests (Playwright)

```typescript
// tests/e2e/multi-language.spec.ts

test('should support all languages', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="language-selector"]')
  await page.click('text=English')
  await page.waitForLoadState()
  
  expect(page.locator('text=Welcome')).toBeVisible()
  expect(page.locator('text=Properties')).toBeVisible()
})
```

---

## 📚 DEPENDENCIES TO ADD

```json
{
  "dependencies": {
    "next-intl": "^3.0.0",
    "open-exchange-rates-api": "^1.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^15.0.0",
    "@playwright/test": "^1.58.0"
  }
}
```

**No breaking changes** — all existing deps continue to work.

---

## ⚡ PERFORMANCE TARGETS

### Page Load Times
```
Desktop:  < 2.5s (Lighthouse)
Mobile:   < 4s (4G)
Target:   LCP < 2.5s, FID < 100ms, CLS < 0.1
```

### Bundle Size (Next.js)
```
Initial:   < 200KB (gzipped)
Growth allowed: +50KB for i18n
Target:    < 250KB total
```

### API Response Times
```
/api/exchange-rates:  < 100ms (cached)
/api/consent:         < 200ms
/api/properties:      < 500ms
```

---

## ✅ ACCEPTANCE CRITERIA (PHASE 1 COMPLETE)

### Functionality
- [ ] All 4 languages (PT, PT-BR, EN, ES) render correctly
- [ ] Currency selector works, saves preference
- [ ] Stripe checkout accepts EUR, BRL, USD
- [ ] Exchange rates cache working (24h TTL)
- [ ] RGPD consent forms display + store consent
- [ ] Privacy policy auto-generates
- [ ] Mobile responsive (95%+ score)
- [ ] PWA installable on iOS/Android
- [ ] Offline mode works (cached data)

### Code Quality
- [ ] 80%+ unit test coverage
- [ ] All e2e tests pass
- [ ] ESLint no errors
- [ ] TypeScript strict mode passing
- [ ] Lighthouse: 95+/100 (mobile)
- [ ] No console errors/warnings

### Performance
- [ ] Page load: < 2.5s (desktop), < 4s (mobile)
- [ ] Bundle size: < 250KB
- [ ] API response: < 200ms (p95)

### Compliance
- [ ] RGPD compliant (consent, privacy policy)
- [ ] LGPD compatible (future Brazil launch)
- [ ] No hardcoded strings (all i18n'd)
- [ ] Legal review passed

---

## 🚀 DEPLOYMENT STRATEGY

### Staging Validation (Week before release)
```
1. Merge to develop branch
2. Deploy to Staging environment
3. Run full test suite (unit + e2e)
4. QA sign-off from Quinn
5. Load testing (100 concurrent users)
6. Security scan (CodeRabbit)
```

### Production Release (Friday afternoon)
```
1. Create feature branch: release/v0.2.0
2. Create PR (auto-generated release notes)
3. QA + Product approval
4. Merge to main
5. Deploy to Production
6. Monitor logs for 24h
7. Rollback plan ready (git revert)
```

### Rollback Plan
```
If critical issue:
  git revert <commit-hash>
  git push origin main
  Vercel auto-deploys (< 2min)
```

---

## 📞 SUPPORT & ESCALATION

### During Development
- Daily standup: 10 AM UTC
- Slack: #engineering-phase1
- Blocked? → Escalate to Dev Lead within 2h

### During Testing/QA
- Contact: Quinn (QA Lead)
- Requirements: All unit tests pass, no linting errors

### Legal/Compliance Questions
- Contact: Compliance specialist (starting Week 1)
- Review gate: Needed before production release

---

## 📊 SPRINT CHECKLIST

Each sprint should include:
- [ ] Grooming: All stories estimated + assigned
- [ ] Planning: 4 stories per sprint, prioritized
- [ ] Daily: Standup (15 min)
- [ ] Mid-sprint: Review progress vs. estimate
- [ ] Review: Demo to product team
- [ ] Retro: What went well, what to improve

---

**Status:** READY FOR DEVELOPMENT  
**Created:** 2026-04-03  
**Phase 1 Start:** 2026-05-01  
**Phase 1 End:** 2026-07-31

---

## 🎯 NEXT ACTIONS FOR DEV TEAM

**By April 10:**
1. Review this technical spec
2. Create GitHub project + milestones
3. Set up development environment
4. Install next-intl + dependencies
5. Create feature branches

**By May 1 (Sprint 1 Kickoff):**
1. Sprint planning meeting
2. Assign stories to developers
3. Set up pair programming schedule
4. Begin i18n refactor

---

**Questions? Refer to:**
- Strategic Roadmap: `docs/STRATEGIC_ROADMAP.md`
- Current vs Target: `docs/CURRENT_STATE_vs_TARGET.md`
- GitHub Issues: `docs/GITHUB_ISSUES_TEMPLATE.md`
