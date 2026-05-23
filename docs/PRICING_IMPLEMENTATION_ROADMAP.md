# 🔧 Lodgra Pricing Implementation Roadmap

**Status:** Technical Specification for Development  
**Last Updated:** 2026-05-23  
**Target Launch:** 2026-06-15  
**Owner:** @dev (implementation), @architect (design), @pm (GTM)

---

## Overview

This roadmap translates the pricing strategy into **executable technical tasks**. Focus: property limit enforcement, feature gates, upgrade CTAs, and billing guardrails.

---

## Phase 1: Foundation (May 26 - Jun 1) — Property Limits & Gates

### 1.1 Property Limit Enforcement (P0 — BLOCKING)

**File to Update:** `src/lib/billing/plans.ts`

**Current State:**
```typescript
// ❌ CURRENT (wrong for pricing)
plans: {
  essencial: { price: 59, maxProperties: null },    // unlimited!
  expansao: { price: 149, maxProperties: null },    // unlimited!
  premium: { price: 397, maxProperties: null }      // unlimited!
}
```

**Target State:**
```typescript
// ✅ TARGET
plans: {
  essencial: {
    price: 59,
    currency: 'BRL',
    maxProperties: 1,
    extraPropertyPrice: null
  },
  expansao: {
    price: 149,
    currency: 'BRL',
    maxProperties: 3,
    extraPropertyPrice: null
  },
  premium: {
    price: 397,
    currency: 'BRL',
    maxProperties: 10,
    extraPropertyPrice: 49
  }
}
```

**Implementation Checklist:**
- [ ] Update `plans.ts` with limits
- [ ] Add property count validation in DB (RLS rule: `properties.organization_id` count)
- [ ] Create `/api/properties/check-limit` endpoint (returns `canCreate: boolean`, `currentCount`, `limit`)
- [ ] Add unit tests (all 3 tiers, edge cases: limit reached, upgrade available)

**Test Cases:**
```
✓ Essencial: create 1 prop → success, create 2nd → blocked
✓ Expansao: create 3 props → success, create 4th → blocked
✓ Premium: create 10 props → success, create 11th → blocked if no extra fee
✓ Premium + extra property: allow unlimited if billed for extras
```

---

### 1.2 Feature Gate System (P0 — BLOCKING)

**Goal:** Lock features server-side based on subscription plan.

**Features to Gate (Priority Order):**

| Feature | Essencial | Expansão | Premium | Gate Type |
|---------|-----------|----------|---------|-----------|
| Cleaner Portal + WhatsApp | ❌ Locked | ✅ Included | ✅ Included | Server |
| Advanced Reports (P&L per owner, split fees) | ❌ Locked | ✅ Included | ✅ Included | Server |
| Relatório de proprietário com envio recorrente | ❌ Locked | ✅ Included | ✅ Included | Server |
| API access (REST endpoints) | ❌ Locked | ⚠️ Limited (webhooks only) | ✅ Full | Server |
| Forecast & advanced BI | ❌ Locked | ❌ Locked | ✅ Included | Server |
| Revenue-based pricing (1%) | ❌ Locked | ❌ Locked | Future (Enterprise) | Roadmap |

**Implementation Approach:**

Create utility function `hasFeature()`:
```typescript
// app/lib/features.ts
export async function hasFeature(
  orgId: string,
  featureName: 'cleaner_portal' | 'api_access' | 'advanced_reports' | 'forecast_bi'
): Promise<boolean> {
  const plan = await getSubscriptionPlan(orgId);
  
  const featureMatrix = {
    'cleaner_portal': ['expansao', 'premium'],
    'api_access': ['premium'],
    'advanced_reports': ['expansao', 'premium'],
    'forecast_bi': ['premium']
  };
  
  return featureMatrix[featureName].includes(plan);
}
```

**Gate Locations:**
- Route middleware: `/[locale]/cleaning` → check `cleaner_portal` feature
- API routes: `/api/reports/owner-split` → check `advanced_reports`
- API routes: `/api/forecast/*` → check `forecast_bi`
- UI: Hide feature buttons if not available, show upgrade CTA

**Test Cases:**
```
✓ Essencial user accesses /cleaning → redirect to upgrade page
✓ Expansao user accesses /cleaning → load normally
✓ Premium user calls /api/forecast → returns data
✓ Essencial user calls /api/forecast → 403 Forbidden + upgrade link
```

---

### 1.3 Upgrade CTA System (P1)

**Goal:** Show contextual "upgrade now" when user hits a limit.

**Trigger Points:**

1. **Property Limit Hit:**
   - Action: Try to create 2nd property as Essencial
   - Modal: "Upgrade to Expansão to add more properties"
   - CTA: "Upgrade now" (→ Stripe Checkout for Expansão)

2. **Feature Access Denied:**
   - Action: Try to access `/cleaning` as Essencial
   - Modal: "Cleaner Portal is available in Expansão"
   - CTA: "Upgrade now"

3. **In-App Suggestion (Not Blocking):**
   - When user has 3 properties on Essencial: banner "Upgrade available"
   - When user has 10 properties on Premium: "Add extra properties at R$49/each"

**Implementation:**
- Create `<UpgradeModal>` component (reusable)
- Trigger via React context: `<FeatureGate feature="cleaner_portal">`
- Mock Stripe Checkout link for each plan/org

**Test Cases:**
```
✓ Show modal when feature is locked
✓ Modal has correct plan name, upgrade price, CTA
✓ CTA redirects to correct Stripe Checkout
✓ Dismiss modal without upgrade → remember choice (24h)
```

---

## Phase 2: Billing Infrastructure (Jun 2 - Jun 8) — Extra Property Add-on

### 2.1 Extra Property Add-on Setup (P1)

**Goal:** Allow Premium customers to add properties beyond 10 for R$49/month.

**Implementation Options:**

**Option A (Recommended):** Stripe Quantity-based
- Create `price_premium_extra_property` in Stripe (R$49/month)
- When org upgrades properties 10 → 11, add to subscription as separate line item
- Stripe automatically charges R$49 + R$397 = R$446/month

**Option B:** Custom Metered Billing
- Use Stripe billing meters for overage
- More complex, not needed for MVP

**Recommended:** Option A (simpler, native Stripe)

**Implementation Checklist:**
- [ ] Create Stripe product + price for extra property (R$49/month)
- [ ] Create endpoint `/api/billing/add-extra-property` (org owner only)
- [ ] Trigger: when org tries to create 11th property, offer "Add for R$49/month"
- [ ] Update org subscription via Stripe API (add line item)
- [ ] Webhook handler: listen for `customer.subscription.updated`
- [ ] DB: track `premium_extra_properties_count` in subscriptions table
- [ ] UI: show total projected bill in dashboard (R$397 + R$49 × count)

**Test Cases:**
```
✓ Premium org with 10 props tries to add 11th
✓ Modal appears: "Add extra property? R$49/month"
✓ After confirmation, Stripe subscription updated
✓ Invoice reflects R$446/month (R$397 + R$49)
✓ Remove extra property → subscription downgrades, charges R$397
```

---

### 2.2 Billing Preview Dashboard (P1)

**Goal:** Show customers exact projected monthly cost.

**UI Location:** Settings → Billing → Subscription Summary

**Display:**
```
📊 Seu plano: Premium
   Base: R$397/mês
   Imóveis inclusos: 10
   Imóveis extras: 2 × R$49 = R$98
   ───────────────────
   Total esperado: R$495/mês
   
[Adicionar imóvel extra]  [Fazer downgrade]
```

**Implementation:**
- New component: `<BillingPreview>`
- Query: org subscription, property count, current plan
- Calculation: `basePrice + (propertyCount - maxProperties) * extraPropertyPrice`
- Real-time update when properties added/removed

**Test Cases:**
```
✓ Show correct base price for each plan
✓ Calculate extras correctly (0, 1, 5, 10+)
✓ Update in real-time when property created
✓ Hide extra row if none applicable
```

---

## Phase 3: GTM & UX (Jun 9 - Jun 15) — Landing Page & Onboarding

### 3.1 Pricing Page Update (P1)

**Current Issue:** Pricing page may have old "R$5 per booking" or "1% revenue" copy.

**Update Checklist:**
- [ ] Remove per-booking/per-revenue pricing
- [ ] Update pricing table with new limits (1/3/10 imóveis)
- [ ] Add note: "Imóveis extras no Premium: R$49/mês cada"
- [ ] Add FAQ: "Can I downgrade?" → "Yes, but not below your current property count"
- [ ] Add FAQ: "What if I exceed my limit?" → "Upgrade or remove properties"
- [ ] Update feature comparison matrix (align with feature gate system)

**Copy Examples:**
```
Essencial (R$59/mês)
"Saia da planilha. Comece com 1 imóvel."
- 1 imóvel
- Calendário unificado
- Reservas, hóspedes, despesas
- Suporte por email

Expansão (R$149/mês) — Recomendado
"Coordene sem caos. Até 3 imóveis."
- Até 3 imóveis
- Tudo de Essencial +
- Portal de limpadores (WhatsApp)
- Relatórios por proprietário
- Equipe de até 5 pessoas

Premium (R$397/mês)
"Automatize tudo. Até 10 imóveis."
- Até 10 imóveis (R$49 por extra)
- Tudo de Expansão +
- API completa
- Forecast & BI avançado
- Gerente dedicado
```

### 3.2 Onboarding Flow Update (P1)

**Goal:** Help new users pick the right plan on signup.

**Current Flow:** Sign up → Create org → Add properties

**Updated Flow:**
1. Sign up → Verify email
2. **[NEW] Pick your plan:** "How many properties will you manage?" → Essencial/Expansão/Premium selected
3. Create org (auto-assign plan from step 2)
4. Add 1st property
5. Add team members (show limit based on plan)
6. **[NEW] Billing setup:** Redirect to Stripe Checkout for selected plan

**Implementation:**
- New page: `/onboarding/select-plan`
- Show 3 cards (Essencial/Expansão/Premium) with simple value props
- Pre-select Expansão as default ("Most popular")
- CTA: "Continue with [Plan]"
- Skip option: "I'll decide later" (defaults to Essencial trial)

**Test Cases:**
```
✓ Can select each plan
✓ Selection persists to org creation
✓ Can skip (defaults to Essencial)
✓ Stripe Checkout triggered with correct plan
```

---

## Phase 4: Testing & Monitoring (Jun 13 - Jun 15)

### 4.1 QA Checklist

- [ ] **Property Limits:** Test each plan's max properties (1/3/10)
- [ ] **Feature Gates:** Verify locks for cleaner portal, API, reports
- [ ] **Upgrade Paths:** Test Essencial → Expansão, Expansão → Premium
- [ ] **Downgrades:** Test Premium → Expansão (check if property count allows)
- [ ] **Extra Properties:** Premium can add 11+, billed correctly
- [ ] **Billing Preview:** Shows correct total projected cost
- [ ] **Pricing Page:** Copy is accurate, no old pricing visible
- [ ] **Email:** Upgrade confirmation, welcome, billing summary

### 4.2 Metrics to Track

After launch, monitor:
- **Upgrade Rate:** % of Essencial → Expansão (target: 15%+ in first month)
- **Extra Property Attach Rate:** % of Premium customers with extras
- **Feature Lock Effectiveness:** How many conversions from "feature blocked" modal?
- **Churn by Plan:** Is Premium stickier? (target: <3% churn)
- **Pricing Page Clarity:** Analytics on "Choose Plan" CTA click-through

---

## Dependencies & Risks

### External Dependencies:
- ✅ Stripe API (already integrated, just need extra product)
- ✅ Supabase RLS (for property count validation)
- ✅ Auth (already have subscription plan in JWT)

### Technical Risks:
- **Race condition:** User creates 2nd property before API check → handle with DB constraint
- **Subscription sync:** Stripe updates may lag → show warning if invoice > UI projection
- **Downgrade trap:** User has 5 properties, tries to downgrade to Essencial (1 prop limit) → block with modal

### Mitigation:
- Add `unique` constraint on `properties(organization_id, plan_id)` for safety
- Webhook handler for subscription updates (refresh user session)
- Downgrade modal: "You have 5 properties. Downgrade to Expansão (3 props) or remove 2 properties first."

---

## Definition of Done

✅ All 4 phases complete when:
1. Property limits enforced server-side (no bypasses)
2. Feature gates prevent access to locked features
3. Upgrade CTAs show at right moments
4. Extra property billing works in Stripe
5. Pricing page & onboarding updated
6. QA all test cases pass
7. Go-live monitoring configured
8. Sales/support trained on new pricing

---

## Estimated Effort

| Phase | Task | Hours | Owner |
|-------|------|-------|-------|
| 1.1 | Property limit enforcement | 4h | @dev |
| 1.2 | Feature gate system | 6h | @dev |
| 1.3 | Upgrade CTA modals | 4h | @dev |
| 2.1 | Extra property add-on (Stripe) | 3h | @dev |
| 2.2 | Billing preview dashboard | 3h | @dev |
| 3.1 | Pricing page copy update | 2h | @pm |
| 3.2 | Onboarding flow redesign | 4h | @dev + @pm |
| 4.1 | QA testing | 8h | @qa |
| 4.2 | Monitoring setup | 2h | @architect |

**Total:** ~36 hours (1 dev, 1 week at 50% capacity)  
**Go-live:** 2026-06-15 ✅

---

## Sign-off & Next Steps

- [ ] **@architect:** Approve technical approach, validate no blockers
- [ ] **@pm:** Approve GTM messaging, update landing page copy
- [ ] **@dev:** Commit to 1-week timeline
- [ ] **@qa:** Schedule QA for Jun 13-15
- [ ] **Kick-off:** Monday 2026-05-26, 10am

---

**Document Status:** Ready for Implementation  
**Next Review:** Daily standup starting May 26
