# 📋 GitHub Issues — Home Stay Global Expansion (All Sprints)

**Purpose:** Copy-paste these issues into GitHub to create the complete sprint backlog.

**Total Issues:** 96 (24 sprints × 4 issues per sprint)

**How to use:**
1. Create GitHub project: "Home Stay Global Expansion"
2. Create 24 milestones: Sprint 1-24
3. Copy-paste each issue below into GitHub
4. Assign to developers
5. Update labels, priorities as needed

---

## PHASE 1: FOUNDATION (Q2 2026)

---

### SPRINT 1-2: INTERNATIONALIZATION

#### Story 1.1: Refactor i18n System to Namespace-Based Architecture
```markdown
# Story 1.1: Refactor i18n System to Namespace-Based Architecture

**Milestone:** Sprint 1-2  
**Label:** `type/refactor` `i18n` `phase-1`  
**Assignee:** @dev  
**Estimate:** 8 points

## Description
Replace current flat-file i18n structure with namespace-based system supporting 4 languages:
- pt-PT (Portuguese/Portugal)
- pt-BR (Portuguese/Brazil)
- en-US (English/USA)
- es-ES (Spanish/Spain)

## Current Structure (❌)
```
src/lib/i18n/messages.ts
  - 2 locales (pt, pt-BR)
  - 2 keys (errors.*, validation.*)
  - Hardcoded strings in components
```

## Target Structure (✅)
```
src/lib/i18n/locales/
  ├── pt-PT.json
  ├── pt-BR.json
  ├── en-US.json
  └── es-ES.json

src/lib/i18n/messages/
  ├── auth.json
  ├── booking.json
  ├── property.json
  ├── admin.json
  ├── errors.json
  └── common.json

src/lib/i18n/
  ├── index.ts (main engine)
  ├── locale-detector.ts
  ├── date-formatter.ts
  ├── currency-formatter.ts
  └── pluralize.ts
```

## Acceptance Criteria
- [ ] New i18n engine supports namespace keys (admin.*, booking.*)
- [ ] Backwards compatible with current messages (no breaking changes)
- [ ] 100% of strings extracted from components (no hardcoded text)
- [ ] Auto-detect locale from browser (Accept-Language header)
- [ ] Manual locale selector in UI (flags + language name)
- [ ] Tests pass (80%+ coverage)

## Technical Details
**Technology:** i18next or next-intl
**Files to create:** 10+ new i18n files
**Files to modify:** 50+ components
**Breaking changes:** None (backwards compatible)

## Related Issues
- 1.2: Add English translations
- 1.3: Add Spanish translations
- 1.4: Add locale selector UI
```

#### Story 1.2: Add English (en-US) Translations
```markdown
# Story 1.2: Add English (en-US) Translations

**Milestone:** Sprint 1-2  
**Label:** `type/feature` `i18n` `en-US`  
**Assignee:** @dev / Translator  
**Estimate:** 5 points  
**Depends on:** Story 1.1

## Description
Complete English (US) translation for all UI strings.

## Deliverables
- [ ] All page titles translated
- [ ] All button labels translated
- [ ] All form labels + placeholders translated
- [ ] All error messages translated
- [ ] All email templates translated
- [ ] All validation messages translated

## Translation Coverage
- [ ] Pages: 30+ pages
- [ ] Components: 100+ components
- [ ] Emails: 8+ templates
- [ ] Error messages: 50+ messages
- [ ] Toast notifications: 30+ messages

## Acceptance Criteria
- [ ] 100% of strings translated to English
- [ ] No hardcoded Portuguese text in en-US mode
- [ ] All pages render correctly in English
- [ ] Language switcher changes to English
- [ ] Tests pass (80%+ coverage)

## Related Issues
- 1.1: Refactor i18n system
- 1.3: Add Spanish translations
```

#### Story 1.3: Add Spanish (es-ES) Translations
```markdown
# Story 1.3: Add Spanish (es-ES) Translations

**Milestone:** Sprint 1-2  
**Label:** `type/feature` `i18n` `es-ES`  
**Assignee:** @dev / Translator  
**Estimate:** 5 points  
**Depends on:** Story 1.1

## Description
Complete Spanish (Spain) translation for all UI strings.

## Deliverables
- [ ] All page titles translated (Spain Spanish dialect)
- [ ] All button labels translated
- [ ] All form labels + placeholders translated
- [ ] All error messages translated
- [ ] All email templates translated
- [ ] All validation messages translated

## Language Notes
- Use Spain Spanish (Castellano), NOT Latin American Spanish
- Distinguish between "tú" (familiar) vs "usted" (formal) - use formal
- Regional terms (e.g., "ordenador" not "computadora")

## Acceptance Criteria
- [ ] 100% of strings translated to Spanish
- [ ] Spain Spanish dialect used correctly
- [ ] All pages render correctly in Spanish
- [ ] Language switcher changes to Spanish
- [ ] Tests pass (80%+ coverage)
```

#### Story 1.4: Add Language Selector (Header + Auto-Detection)
```markdown
# Story 1.4: Add Language Selector (Header + Auto-Detection)

**Milestone:** Sprint 1-2  
**Label:** `type/feature` `ui` `i18n`  
**Assignee:** @dev  
**Estimate:** 3 points  
**Depends on:** Story 1.1

## Description
Add language selector UI with:
1. Header language dropdown with flag icons
2. Auto-detect from browser Accept-Language header
3. Store user preference in profile + localStorage
4. URL-based routing (/pt, /en, /es)

## Deliverables
- [ ] Language selector in header (flag icon + dropdown)
- [ ] 4 flags: 🇵🇹 (PT), 🇧🇷 (BR - same as PT), 🇺🇸 (EN), 🇪🇸 (ES)
- [ ] Auto-detection on first visit (browser language)
- [ ] Store preference in user profile
- [ ] Store preference in localStorage (fallback)
- [ ] URL routing working (/pt, /en, /es, /pt-br)

## UI Design
```
Header:
[Logo] [Search] [🇵🇹 PT ▼] [Profile] [Menu]
        
Dropdown:
🇵🇹 Português (PT)
🇧🇷 Português (BR)
🇺🇸 English (US)
🇪🇸 Español (ES)
```

## Acceptance Criteria
- [ ] Dropdown appears in header
- [ ] Flags display correctly
- [ ] Clicking language changes UI immediately
- [ ] User preference persists after refresh
- [ ] URL updates when language changes (/en, /pt, etc)
- [ ] Auto-detect works on first visit
- [ ] Mobile friendly (dropdown accessible)
- [ ] Tests pass

## Related Issues
- 1.1, 1.2, 1.3: Translation tasks
```

---

### SPRINT 3-4: MULTI-CURRENCY SUPPORT

#### Story 2.1: Add Currency Selector to User Profile
```markdown
# Story 2.1: Add Currency Selector to User Profile

**Milestone:** Sprint 3-4  
**Label:** `type/feature` `currency` `payment`  
**Assignee:** @dev  
**Estimate:** 3 points

## Description
Add currency selection to user profile/settings.

## Supported Currencies
```
🇵🇹 EUR (€) — Portugal & Spain
🇧🇷 BRL (R$) — Brazil
🇺🇸 USD ($) — USA
```

## Deliverables
- [ ] Currency selector in profile settings
- [ ] Default currency based on user locale
- [ ] Save preference to user_profiles.display_currency
- [ ] Display all prices in selected currency
- [ ] Update checkout to use selected currency

## Acceptance Criteria
- [ ] User can select currency in profile
- [ ] Preference persists after save
- [ ] All prices update immediately when currency changes
- [ ] Checkout uses selected currency
- [ ] Non-admin users cannot change org currency
- [ ] Tests pass

## Database Changes
```sql
ALTER TABLE user_profiles 
ADD COLUMN display_currency TEXT DEFAULT 'eur';
```

## Related Issues
- 2.2: Integrate exchange rate API
- 2.3: Update Stripe for multi-currency
```

#### Story 2.2: Integrate Exchange Rate API
```markdown
# Story 2.2: Integrate Exchange Rate API

**Milestone:** Sprint 3-4  
**Label:** `type/feature` `currency` `integration`  
**Assignee:** @dev  
**Estimate:** 4 points  
**Depends on:** Story 2.1

## Description
Integrate Open Exchange Rates API to fetch real-time exchange rates.

## Requirements
- [ ] Fetch rates daily (scheduled job)
- [ ] Cache rates in Redis (24h TTL)
- [ ] Fallback to previous rate if API fails
- [ ] Support conversions: EUR ↔ BRL, EUR ↔ USD, etc
- [ ] Log rate changes for audit
- [ ] Handle API errors gracefully

## Implementation
```typescript
// src/lib/currency/exchange-rates.ts
interface ExchangeRate {
  from: string
  to: string
  rate: number
  timestamp: Date
}

async function getExchangeRate(from: string, to: string): Promise<number>
async function fetchRates(): Promise<void> // Scheduled job
async function convertCurrency(amount: number, from: string, to: string): Promise<number>
```

## Scheduled Job
```
Trigger: Daily at 9 AM (UTC)
Endpoint: POST /api/cron/exchange-rates
Secret: CRON_SECRET
Upstash QStash: Yes (for reliability)
```

## Acceptance Criteria
- [ ] Exchange rates fetch successfully
- [ ] Cache working (Redis)
- [ ] Fallback working (API down scenario)
- [ ] Rate conversions accurate (< 0.01% error)
- [ ] Logs show rate changes
- [ ] Error handling working
- [ ] Tests pass (80%+ coverage)

## Cost
Open Exchange Rates API: €500/month (100K requests)

## Related Issues
- 2.1: Currency selector
- 2.3: Stripe multi-currency
```

#### Story 2.3: Update Stripe Integration for Multi-Currency Checkout
```markdown
# Story 2.3: Update Stripe Integration for Multi-Currency Checkout

**Milestone:** Sprint 3-4  
**Label:** `type/feature` `stripe` `payment`  
**Assignee:** @dev  
**Estimate:** 5 points  
**Depends on:** Story 2.1, 2.2

## Description
Modify Stripe checkout to support EUR, BRL, USD payments.

## Changes
- [ ] Update checkout session creation (support 3 currencies)
- [ ] Convert prices to selected currency
- [ ] Update Stripe line_items with dynamic currency
- [ ] Handle currency conversion fees
- [ ] Update webhook to handle multi-currency payments
- [ ] Display currency symbol in Stripe checkout

## Stripe Configuration
```javascript
// Supported currencies on Stripe
{
  'eur': { code: 'eur', symbol: '€' },
  'brl': { code: 'brl', symbol: 'R$' },
  'usd': { code: 'usd', symbol: '$' }
}

// Example checkout:
const session = await stripe.checkout.sessions.create({
  currency: userSelectedCurrency, // 'brl', 'eur', or 'usd'
  line_items: [{
    price_data: {
      currency: userSelectedCurrency,
      unit_amount: priceInCents,
      product_data: { name: '...' }
    },
    quantity: 1
  }]
})
```

## Acceptance Criteria
- [ ] Checkout works in all 3 currencies
- [ ] Prices convert correctly before payment
- [ ] Stripe webhook processes payments correctly
- [ ] Currency displayed in Stripe checkout
- [ ] No double-charging on conversion
- [ ] Tests pass (80%+ coverage)

## Database Changes
```sql
ALTER TABLE bookings 
ADD COLUMN payment_currency TEXT DEFAULT 'eur';

ALTER TABLE pricing_rules 
ADD COLUMN currency TEXT DEFAULT 'eur';
```

## Related Issues
- 2.1, 2.2: Currency support
- 3.1: Update Bookings API
```

#### Story 2.4: Update Database Schema for Currency Tracking
```markdown
# Story 2.4: Update Database Schema for Currency Tracking

**Milestone:** Sprint 3-4  
**Label:** `type/refactor` `database`  
**Assignee:** @dev  
**Estimate:** 2 points  
**Depends on:** Story 2.1, 2.3

## Description
Add currency fields to relevant tables for tracking/auditing.

## Schema Updates
```sql
-- user_profiles
ALTER TABLE user_profiles 
ADD COLUMN display_currency TEXT DEFAULT 'eur';

-- properties (future pricing rules per currency)
ALTER TABLE pricing_rules 
ADD COLUMN currency TEXT DEFAULT 'eur';

-- bookings/reservations (track payment currency)
ALTER TABLE reservations 
ADD COLUMN payment_currency TEXT DEFAULT 'eur';

-- audit/exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_timestamp 
ON exchange_rates(timestamp DESC);
```

## Acceptance Criteria
- [ ] All tables have currency fields where needed
- [ ] Indexes created for performance
- [ ] Data migration script works (backwards compatible)
- [ ] No data loss
- [ ] Tests pass

## Related Issues
- 2.1, 2.2, 2.3: Currency support stories
```

---

### SPRINT 5-6: COMPLIANCE PORTUGAL (RGPD)

#### Story 3.1: Create RGPD Consent Forms
```markdown
# Story 3.1: Create RGPD Consent Forms

**Milestone:** Sprint 5-6  
**Label:** `type/feature` `compliance` `rgpd` `legal`  
**Assignee:** @dev / Legal  
**Estimate:** 4 points

## Description
Create RGPD-compliant consent forms for user signup.

## Requirements
- [ ] Service consent (using platform)
- [ ] Marketing consent (optional)
- [ ] Analytics consent (optional)
- [ ] Display on signup page (required before account creation)
- [ ] Store consent in database
- [ ] Editable from profile settings
- [ ] Export consent record on data export request

## Database Schema
```sql
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_value BOOLEAN NOT NULL,
  consented_at TIMESTAMP DEFAULT NOW(),
  consent_version TEXT DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
```

## Form Design
```
Required:
☑️ I agree to the Terms of Service and Privacy Policy

Optional:
☐ Send me marketing emails and product updates
☐ Allow analytics tracking to improve the service

[Accept] [Decline]
```

## Acceptance Criteria
- [ ] Consent form displays on signup
- [ ] Cannot create account without accepting required terms
- [ ] Consents stored in database
- [ ] Consents editable from profile
- [ ] Audit trail (who, what, when, IP)
- [ ] Tests pass

## Legal Review
- [ ] Privacy team approves form text
- [ ] Legal templates prepared (can use Typeform legal or similar)

## Related Issues
- 3.2: Privacy policy generator
- 3.3: Cookie banner
- 3.4: Data export functionality
```

#### Story 3.2: Privacy Policy Auto-Generator
```markdown
# Story 3.2: Privacy Policy Auto-Generator

**Milestone:** Sprint 5-6  
**Label:** `type/feature` `compliance` `legal`  
**Assignee:** @dev / Legal  
**Estimate:** 3 points  
**Depends on:** Story 3.1

## Description
Generate privacy policy dynamically based on:
- User locale (PT, BR, US, ES)
- Features enabled (Stripe, Resend, etc)
- Third-party integrations

## Template Variables
```
- Company name: Home Stay
- Data controller: [org name]
- Privacy officer: [contact]
- Services: Property management, bookings, payments
- Payment processor: Stripe
- Email service: Resend
- Analytics: Posthog (optional)
- Cookies: Yes (session)
```

## Implementation
```typescript
// src/lib/legal/privacy-policy-generator.ts
interface PrivacyPolicyConfig {
  locale: 'pt-PT' | 'pt-BR' | 'en-US' | 'es-ES'
  organizationName: string
  dataController: string
  privacyOfficer?: string
  integrationsEnabled: string[] // ['stripe', 'resend', 'posthog']
}

async function generatePrivacyPolicy(config: PrivacyPolicyConfig): Promise<string>
```

## Acceptance Criteria
- [ ] Privacy policy generates in all 4 languages
- [ ] Template variables replace correctly
- [ ] PDF export working
- [ ] Displays in footer/settings
- [ ] Update timestamp shown
- [ ] Tests pass

## Legal Requirements
- [ ] Complies with RGPD
- [ ] Complies with LGPD
- [ ] Complies with CCPA (USA consideration)
- [ ] Legal team reviews template

## Related Issues
- 3.1: Consent forms
- 3.3: Cookie banner
```

---

**[CONTINUED IN NEXT SECTION DUE TO LENGTH...]**

---

## 🚀 HOW TO IMPORT THESE ISSUES

### Option 1: Manual Copy-Paste
1. Go to GitHub: Issues → New Issue
2. Copy title from "# Story X.X: ..."
3. Copy content from markdown block
4. Set milestone, labels, assignee
5. Click "Create"

### Option 2: GitHub API (Bulk)
```bash
# Create GitHub PAT token first
# Then run script to bulk-create issues

curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USER/home-stay/issues \
  -d '{
    "title": "Story 1.1: Refactor i18n System...",
    "body": "...",
    "milestone": 1,
    "labels": ["type/refactor", "i18n"]
  }'
```

### Option 3: GitHub Project Import
1. Create GitHub Project "Home Stay Global"
2. Use "Table" view
3. Set columns: Sprint, Status, Priority, Assignee
4. Filter by milestone to organize

---

## 📊 ISSUE STATISTICS

| Phase | Sprints | Issues | Est. Points |
|-------|---------|--------|-------------|
| Phase 1 | 1-12 | 48 | 192 |
| Phase 2 | 13-24 | 48 | 180 |
| **TOTAL** | **24** | **96** | **372 points** |

---

**Next Section:** Continue with Sprint 7-24 (abbreviated format)

**Note:** Full issues for all 24 sprints available on request. This shows the template and first 4 sprints in detail.

---

**Status:** READY FOR GITHUB IMPORT  
**Created:** 2026-04-03  
**Version:** 1.0
