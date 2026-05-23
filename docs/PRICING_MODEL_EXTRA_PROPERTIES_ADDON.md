# Extra Properties Add-on Model (Revised Pricing Strategy)

**Status:** Technical specification for pricing model v2  
**Last Updated:** 2026-05-23  
**Owner:** @pm (strategy), @dev (implementation)  

---

## Executive Summary

Instead of forcing customers to upgrade plans when they need more properties, Lodgra now allows **all tiers to purchase Extra Properties at R$49/month each**, up to a platform limit of 10 properties per Essencial/Expansão, unlimited for Premium.

**Key Change:** This increases revenue-per-customer while improving retention (no forced upgrades).

---

## New Pricing Model

### Base Plans + Extra Properties

| Plan | Base Price | Included | Extra Properties | Max on Plan | Migration Cost |
|------|-----------|----------|------------------|------------|-----------------|
| **Essencial** | R$59/mês | 1 property | +R$49/property | 10 total | Free (add-on) |
| **Expansão** | R$149/mês | 3 properties | +R$49/property | 10 total | Free (add-on) |
| **Premium** | R$397/mês | 10 properties | +R$49/property | Unlimited | Free (add-on) |

### Example Billing Scenarios

**Scenario 1: Essencial → 3 properties**
```
Base (Essencial):     R$59
Extra properties: 2   R$98 (2 × R$49)
─────────────────────────────
Monthly Total:        R$157
```
*No upgrade needed. Customer stays on Essencial, pays R$49 per extra property.*

**Scenario 2: Expansão → 7 properties**
```
Base (Expansão):      R$149
Extra properties: 4   R$196 (4 × R$49)
─────────────────────────────
Monthly Total:        R$345
```
*Customer could upgrade to Premium (R$397 + features), but prefers staying at R$345.*

**Scenario 3: Premium → 15 properties**
```
Base (Premium):       R$397
Extra properties: 5   R$245 (5 × R$49)
─────────────────────────────
Monthly Total:        R$642
```
*Unlimited scaling with predictable R$49/property cost.*

---

## Stripe Billing Setup

### Products & Prices to Create

1. **`price_essencial`**
   - Product: "Essencial"
   - Amount: R$5900 (R$59.00)
   - Billing: Monthly, no metering
   - Metadata: `maxIncludedProperties: 1`, `maxAllowedProperties: 10`

2. **`price_expansao`**
   - Product: "Expansão"
   - Amount: R$14900 (R$149.00)
   - Billing: Monthly, no metering
   - Metadata: `maxIncludedProperties: 3`, `maxAllowedProperties: 10`

3. **`price_premium`**
   - Product: "Premium"
   - Amount: R$39700 (R$397.00)
   - Billing: Monthly, no metering
   - Metadata: `maxIncludedProperties: 10`, `maxAllowedProperties: null` (unlimited)

4. **`price_extra_property`** (NEW)
   - Product: "Extra Property"
   - Amount: R$4900 (R$49.00)
   - Billing: Monthly, quantity-based
   - Metadata: `name: "Unidade Extra"`, `display_order: 2`

### Subscription Architecture

**Subscription has 2 line items:**

```
subscription:
  line_items: [
    {
      price: "price_essencial",      // or expansao, or premium
      quantity: 1,                    // always 1 (base plan)
    },
    {
      price: "price_extra_property",
      quantity: 0,                    // starts at 0, increments as user adds properties
    }
  ]
```

**When customer adds 2nd property as Essencial:**
- Line item 2 updates: `quantity: 0 → 1`
- Stripe updates invoice: R$59 + R$49 = R$108
- No plan change needed

**When customer adds 11th property:**
- **Essencial/Expansão:** Blocked by UI (max 10) OR suggest upgrade to Premium
- **Premium:** Allowed, quantity increments: 1 → 2

---

## Database Changes

### `subscriptions` table (update)

```sql
ALTER TABLE subscriptions ADD COLUMN extra_properties_count INT DEFAULT 0;

-- Example:
-- essencial subscriber with 3 properties:
-- plan='essencial', extra_properties_count=2 (3 total, 1 included)

-- Premium subscriber with 15 properties:
-- plan='premium', extra_properties_count=5 (15 total, 10 included)
```

### Property Limit Validation (RLS)

```sql
-- At time of property CREATE, check:
-- 1. Count organization's current properties
-- 2. Get subscription plan (essencial/expansao/premium)
-- 3. Get max_allowed_properties for that plan
-- 4. If count >= limit, DENY CREATE with "Upgrade or add Extra Property"

CREATE OR REPLACE FUNCTION check_property_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  property_count INT;
  plan_name TEXT;
  max_allowed INT;
BEGIN
  org_id := NEW.organization_id;
  
  SELECT COUNT(*) INTO property_count
  FROM properties
  WHERE organization_id = org_id;
  
  SELECT s.plan INTO plan_name
  FROM subscriptions s
  WHERE s.organization_id = org_id
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Map plan to max allowed
  max_allowed := CASE plan_name
    WHEN 'essencial' THEN 10
    WHEN 'expansao' THEN 10
    WHEN 'premium' THEN NULL -- unlimited
    ELSE 3 -- default to Expansão limit
  END;
  
  -- Check limit
  IF max_allowed IS NOT NULL AND property_count >= max_allowed THEN
    RAISE EXCEPTION 'Property limit reached for plan %', plan_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Feature Gating Logic

### Which features are locked by plan (not by property count)?

```typescript
// App stays on Essencial but has 5 properties
// They still CAN'T access these features:

❌ Cleaner Portal (Expansão+)
❌ Advanced Reports/P&L by owner (Expansão+)
❌ API access (Premium only)
❌ Forecast & BI (Premium only)

// They CAN access:
✅ Basic P&L
✅ Calendar
✅ Reservations
✅ All 5 properties in UI
```

**Key Point:** Extra Properties are **QUANTITY-BASED**, not **FEATURE-BASED**.

Features remain locked by **PLAN**, not property count.

---

## UI/UX Changes

### 1. Onboarding: "Choose Your Starting Point"

```
🎯 How many properties will you manage?

[ ] Just 1
    → Essencial (R$59/mês)
    → Can add more anytime (R$49 each)

[ ] 2-3 properties
    → Expansão (R$149/mês) ← RECOMMENDED
    → Better for teams & coordination
    → Can add up to 7 more (R$49 each)

[ ] 4-10 properties
    → Premium (R$397/mês)
    → Unlimited after 10 (R$49 each)
    → Includes advanced features

[Skip for now]
```

### 2. Dashboard: Billing Preview

```
📊 Seu Plano: Essencial
─────────────────────────────
Propriedades incluídas: 1
Propriedades atuais: 3

💰 Faturamento Estimado:
  Base (Essencial): R$59/mês
  Unidades extras (2): R$98/mês
  ──────────────────────────
  Total: R$157/mês

[+ Adicionar Unidade Extra]
[Fazer Upgrade para Expansão]
[Ver detalhes do plano]
```

### 3. Add Property Flow (New)

**When user tries to add property beyond limit:**

```
⚠️ Limite Atingido

Seu plano Essencial permite 1 propriedade.
Você tem 1 ativa.

Opções:
[1] Adicionar Unidade Extra (+R$49/mês)
    → Usar de imediato
    → Cobrado no próximo ciclo

[2] Fazer Upgrade para Expansão
    → 3 propriedades incluídas
    → Portal de limpadores
    → Relatórios avançados
    → R$149/mês (economize vs. extras)

[Cancelar]
```

### 4. Management: "Extra Properties Dashboard"

*Settings → Billing → Extra Properties*

```
📋 Unidades Extras

Plano: Essencial (1 incluída)
Limite de plano: 10 unidades totais

Unidades extras ativas:
  1. T1 Armação dos Açores (Ativo) [Remover]
  2. Chalé Refúgio (Ativo) [Remover]

Total de extras: 2 × R$49 = R$98/mês

[+ Adicionar Nova Unidade Extra]
[Fazer Upgrade para Expansão?]
```

---

## Sales & Marketing Copy

### Landing Page: Pricing Section

```
🏠 Escolha seu Plano

┌─────────────────────────────┐
│ Essencial                   │
│ R$59/mês                    │
│ Para 1 proprietário         │
│                             │
│ ✓ 1 propriedade incluída    │
│ ✓ Calendário & reservas     │
│ ✓ Despesas básicas          │
│ ✓ + R$49 por unidade extra  │
│                             │
│ [Começar Grátis]            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Expansão (Recomendado)      │
│ R$149/mês                   │
│ Para gestores crescendo     │
│                             │
│ ✓ 3 propriedades incluídas  │
│ ✓ Portal de limpadores      │
│ ✓ Relatórios por dono       │
│ ✓ Equipe de até 5 pessoas   │
│ ✓ + R$49 por unidade extra  │
│                             │
│ [Começar Agora] ← HIGHLIGHT │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Premium                     │
│ R$397/mês                   │
│ Para operações profissionais│
│                             │
│ ✓ 10 propriedades incluídas │
│ ✓ API completa              │
│ ✓ Forecast & BI avançado    │
│ ✓ Gerente dedicado          │
│ ✓ Extras ilimitadas         │
│                             │
│ [Começar Agora]             │
└─────────────────────────────┘
```

### Email: "You've Hit Your Property Limit"

```
Assunto: Adicione mais propriedades a Lodgra ✨

Oi Maria,

Parabéns! Você está crescendo! 🎉

Você está usando sua 1 propriedade incluída (Essencial) e tentou adicionar 
uma segunda.

Você tem 2 opções:

OPÇÃO 1: Unidade Extra (R$49/mês)
→ Rápido & simples
→ Sem compromisso de plano
→ Inclua quantas unidades quiser até 10

[Adicionar Unidade Extra]

OPÇÃO 2: Fazer Upgrade para Expansão (R$149/mês)
→ 3 propriedades já incluídas
→ Portal de limpadores (WhatsApp)
→ Relatórios por proprietário
→ Melhor para coordenação

[Fazer Upgrade]

Qual é seu próximo passo?

Abraços,
Lodgra Team
```

---

## Financial Impact

### Comparison: With vs. Without Extra Property Add-on

**100 customers, 18 months:**

#### WITHOUT Extra Property Add-on (forced upgrade)
```
Month 1:  30 Essencial (R$59)  = R$1,770
Month 6:  20 Essencial → Expansão (forced)
          20 Expansão (R$149) = R$2,980
          MRR jumps but many churn

Month 12: Heavy churn, 60 customers = R$4,500 MRR
Reason: Customers feel trapped, leave for competitors
```

#### WITH Extra Property Add-on (flexible)
```
Month 1:  30 Essencial (R$59)  = R$1,770
Month 6:  20 add 1-2 extras
          20 × (R$59 + R$98 avg) = R$3,140
          Smooth growth, better retention

Month 12: 85 customers (low churn)
          30 Essencial w/ extras: R$2,370
          40 Expansão w/ extras: R$7,160
          15 Premium: R$5,955
          MRR = R$15,485 ← 3.4x higher!
```

**Key Metric:** LTV with extras = **R$1,200+ per customer** vs. R$400 without.

---

## Implementation Plan

### Phase 1A: Database + Stripe (May 26 - May 31)
- [ ] Update `subscriptions.extra_properties_count`
- [ ] Create Stripe product `price_extra_property`
- [ ] Update subscription creation flow to include line item 2

### Phase 1B: Property Limit Enforcement (May 26 - Jun 2)
- [ ] Update `plans.ts` with max limits (1/3/10)
- [ ] Implement RLS trigger `check_property_limit()`
- [ ] Create `/api/properties/check-limit` endpoint
- [ ] Add modal: "Limit reached, add extra or upgrade?"

### Phase 2: UI/UX (Jun 3 - Jun 9)
- [ ] Update billing preview dashboard
- [ ] Add "Add Extra Property" flow
- [ ] Update pricing page copy
- [ ] Update onboarding flow

### Phase 3: Launch (Jun 10 - Jun 15)
- [ ] QA all flows
- [ ] Train support on new model
- [ ] Email campaign: "Add more properties now"
- [ ] Go-live!

---

## Success Metrics

| Metric | Target | How to Track |
|--------|--------|-------------|
| **Add-on Adoption** | 40% of Essencial customers buy ≥1 extra | Stripe analytics |
| **Avg Extra Properties per Plan** | Essencial: 1.5, Expansão: 2.5 | SQL query |
| **Upgrade Rate** | 15% (still upgrade to higher plan) | Stripe analytics |
| **Churn Reduction** | -30% vs. forced upgrade model | Cohort analysis |
| **LTV Improvement** | +3x (to R$1,200+) | Segment/Amplitude |

---

## Q&A

**Q: Why allow extras up to 10 on Essencial/Expansão but unlimited on Premium?**  
A: Psychological pricing. Essencial/Expansão customers feel "reasonable limit", Premium customers want full flexibility. At R$397 base, unlimited scaling justifies the tier.

**Q: Should we cap extra properties per plan?**  
A: Yes. Forces upgrade decision: "Want 11+? Premium is better value (R$397 unlimited vs. R$590 in extras)."

**Q: What if customer has 10 extras on Essencial (total R$59 + R$490 = R$549)?**  
A: They're at platform limit. Show: "Premium at R$397 is now better value. Ready to upgrade?"

**Q: Can customer downgrade from Expansão to Essencial if they have 2 properties?**  
A: Yes. 2 properties = within Essencial limit (1 included, 1 extra). Suggest: keep Expansão or pay R$49 extra.

---

## Status

✅ Model defined  
⏳ Awaiting @pm approval on messaging  
⏳ Awaiting @dev commitment on timeline  

---

**Next:** Review with @pm (messaging), @architect (technical design), @dev (capacity).
