# Stripe Implementation — Lodgra SaaS + Multi-Tenant

## 📋 Overview

Implementar Stripe como layer financeiro para modelo SaaS + Direct Booking:
- **Stripe Brasil:** Billing (subscription SaaS)
- **Stripe Portugal:** Booking payments (Connect + split)

---

## 🎯 Objetivos

1. ✅ Monetizar Lodgra como SaaS (assinatura por unidade)
2. ✅ Processar pagamentos de reservas diretas (multi-currency)
3. ✅ Suportar isolamento de tenant (cada cliente tem seu Stripe Connect)
4. ✅ Preparar para expansão internacional (EUR, SEPA, multi-país)

---

## 📊 Estratégia Financeira

### Fluxo 1: SaaS Billing (Brasil)
```
Cliente assina Lodgra
    ↓
Cria Stripe Customer (Brasil)
    ↓
Subscription mensal em BRL
    ↓
Lodgra recebe no banco brasileiro
```

**Planos sugeridos:**
- R$59/mês (1 unit)
- R$89/mês + R$5/reserva (1-5 units)
- R$130/mês + 1% revenue (5+ units)

### Fluxo 2: Booking Engine (Portugal)
```
Hóspede reserva propriedade
    ↓
Pagamento em EUR (Stripe Portugal)
    ↓
Split automático:
  - Lodgra commission (%)
  - Owner payout (SEPA/IBAN)
```

---

## 🏗️ Arquitetura Técnica

### Database Schema

#### organizations (existente)
```sql
ALTER TABLE organizations ADD COLUMN (
  stripe_br_customer_id VARCHAR,           -- Stripe Brasil
  stripe_pt_connect_id VARCHAR,            -- Stripe Portugal Connect
  subscription_plan VARCHAR,               -- 'starter', 'professional', 'enterprise'
  subscription_status VARCHAR,             -- 'active', 'trialing', 'past_due', 'canceled'
  billing_country VARCHAR,                 -- 'BR', 'PT', etc
  currency VARCHAR,                        -- 'BRL', 'EUR'
  trial_ends_at TIMESTAMP,
  billing_period_start TIMESTAMP,
  billing_period_end TIMESTAMP
);
```

#### stripe_events (nova)
```sql
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  event_type VARCHAR,                      -- 'customer.subscription.updated', 'charge.succeeded', etc
  stripe_event_id VARCHAR UNIQUE,
  payload JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### payments (nova)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  booking_id UUID REFERENCES bookings,
  stripe_payment_id VARCHAR,
  amount DECIMAL(10, 2),
  currency VARCHAR,
  status VARCHAR,                          -- 'succeeded', 'pending', 'failed'
  payment_type VARCHAR,                    -- 'booking', 'subscription'
  payout_to_owner_id UUID,
  commission_amount DECIMAL(10, 2),
  stripe_platform_fee DECIMAL(10, 2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### invoices (nova)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations,
  stripe_invoice_id VARCHAR,
  amount DECIMAL(10, 2),
  currency VARCHAR,
  status VARCHAR,                          -- 'draft', 'sent', 'paid', 'void', 'uncollectible'
  period_start DATE,
  period_end DATE,
  due_date DATE,
  created_at TIMESTAMP,
  paid_at TIMESTAMP
);
```

### API Integration Structure

```typescript
// lib/stripe/client-br.ts — Stripe Brasil (Billing)
export const stripeBR = new Stripe(process.env.STRIPE_BR_SECRET_KEY, {
  apiVersion: '2024-04-10',
  maxNetworkRetries: 3,
});

// lib/stripe/client-pt.ts — Stripe Portugal (Booking/Connect)
export const stripePT = new Stripe(process.env.STRIPE_PT_SECRET_KEY, {
  apiVersion: '2024-04-10',
  maxNetworkRetries: 3,
});

// lib/stripe/factory.ts — Smart selection
export function getStripeClient(paymentType: 'subscription' | 'booking') {
  if (paymentType === 'subscription') {
    return stripeBR;
  }
  return stripePT;
}
```

### Routes Structure

```
app/
├── api/
│   ├── stripe/
│   │   ├── webhooks/
│   │   │   ├── billing/route.ts       (Brasil subscription events)
│   │   │   └── booking/route.ts       (Portugal Connect events)
│   │   ├── checkout-session/route.ts
│   │   ├── payment-intent/route.ts
│   │   └── subscription/route.ts
│   └── billing/
│       └── [organizationId]/
│           ├── subscription/route.ts
│           ├── invoices/route.ts
│           └── payment-method/route.ts
└── [locale]/
    └── billing/
        ├── page.tsx                   (dashboard)
        ├── subscription/
        │   ├── page.tsx               (manage plan)
        │   └── cancel/route.ts
        └── invoices/
            ├── page.tsx
            └── [invoiceId]/page.tsx
```

---

## 📝 Implementation Plan

### FASE 1: Foundation (Weeks 1-2)

#### Task 1.1: Database Setup
- [ ] Create schema (organizations, payments, invoices, stripe_events)
- [ ] Create migrations
- [ ] Run migrations on staging + production

#### Task 1.2: Stripe Account Setup
- [ ] Create Stripe Brasil account (production mode)
- [ ] Create Stripe Portugal account (production mode)
- [ ] Add API keys to `.env.production`
- [ ] Configure webhook endpoints:
  - `https://lodgra.io/api/stripe/webhooks/billing`
  - `https://lodgra.io/api/stripe/webhooks/booking`

#### Task 1.3: Initialization Flow
- [ ] Create Stripe customer on signup (stripeBR)
- [ ] Store stripe_br_customer_id in organizations
- [ ] Implement error handling + retry logic
- [ ] Unit tests for initialization

### FASE 2: SaaS Billing (Weeks 3-4)

#### Task 2.1: Subscription Management
- [ ] Create subscription endpoint: `POST /api/stripe/subscription`
- [ ] List plans endpoint
- [ ] Trial period logic (14 days)
- [ ] Handle subscription.created, updated, deleted events

#### Task 2.2: Dashboard UI
- [ ] Billing page (`/[locale]/billing`)
- [ ] Current plan display
- [ ] Plan upgrade/downgrade form
- [ ] Invoice history
- [ ] Payment method management

#### Task 2.3: Webhooks
- [ ] Implement webhook signature verification
- [ ] Handle customer.subscription.updated
- [ ] Handle invoice.payment_succeeded
- [ ] Handle invoice.payment_failed (email alert)
- [ ] Webhook tests

### FASE 3: Booking Payments (Weeks 5-6)

#### Task 3.1: Stripe Connect Setup
- [ ] Onboard organization to Stripe Connect (expresss account)
- [ ] Store stripe_pt_connect_id in organizations
- [ ] Handle Connect account status changes

#### Task 3.2: Payment Processing
- [ ] Create payment intent for booking
- [ ] Split logic (commission + owner payout)
- [ ] Handle charge.succeeded / charge.failed
- [ ] Payout to owners (automated)

#### Task 3.3: Booking Flow Integration
- [ ] Add payment step to booking checkout
- [ ] Show total + breakdown (commission, taxes)
- [ ] Payment confirmation email
- [ ] Refund handling

### FASE 4: Quality & Scaling (Weeks 7-8)

#### Task 4.1: Testing
- [ ] Unit tests (30+ tests)
- [ ] Integration tests (webhook simulation)
- [ ] E2E tests (full booking flow)
- [ ] Stripe test mode verification

#### Task 4.2: Security
- [ ] Webhook signature validation
- [ ] PCI compliance checklist
- [ ] Sensitive data encryption (payment methods)
- [ ] Rate limiting on payment endpoints

#### Task 4.3: Monitoring
- [ ] Sentry integration for payment errors
- [ ] Stripe dashboard health monitoring
- [ ] Daily reconciliation check (BRL vs EUR)
- [ ] Alert system for failed payments

---

## ✅ Acceptance Criteria

### SaaS Billing
- [ ] User can upgrade/downgrade plan
- [ ] Invoice is generated and sent via email
- [ ] Webhook processes subscription changes
- [ ] Trial period works (14 days free)
- [ ] Past-due handling (email reminders)
- [ ] Can view all invoices

### Booking Payments
- [ ] Guest can pay for booking with card
- [ ] Owner receives payout automatically (SEPA)
- [ ] Lodgra commission is captured
- [ ] Refund flow works (full + partial)
- [ ] Payment confirmation email sent

### Multi-Tenant
- [ ] Each organization has isolated Stripe accounts
- [ ] Billing dashboard only shows own data
- [ ] Webhook routes incoming events to correct org
- [ ] Reports (revenue, payouts) are organization-scoped

---

## 🚀 Dependencies

### External
- ✅ Stripe Brasil account (production)
- ✅ Stripe Portugal account (production)
- ✅ Webhook signing keys
- ✅ TLS certificate for webhooks

### Internal
- ✅ Google OAuth complete (login)
- ✅ Multi-tenant organization structure
- ⏳ Booking model (needs properties + availability)

### Packages (to add)
```json
{
  "stripe": "^14.0.0",
  "@stripe/stripe-js": "^1.46.0"
}
```

---

## ⚠️ Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Webhook signature verification fails | High | Test with `stripe listen` locally; log all failures |
| Payout to wrong bank account | Critical | Require manual verification of IBAN on first payout |
| Race condition on subscription update | High | Implement idempotency keys |
| PCI compliance issue | Critical | Never store full card numbers; use Stripe tokens only |
| EUR vs BRL confusion | High | Always validate currency in payment route |
| Split math errors | High | Round to 2 decimals consistently; unit test splits |

---

## 📅 Timeline

| Phase | Duration | Outcome |
|-------|----------|---------|
| Phase 1 (Foundation) | 2 weeks | DB ready, Stripe accounts live |
| Phase 2 (SaaS) | 2 weeks | Billing fully functional |
| Phase 3 (Booking) | 2 weeks | Direct booking + payouts working |
| Phase 4 (Quality) | 2 weeks | 95%+ test coverage, production-ready |

**Total:** 8 weeks

---

## 📚 References

- [Stripe Billing API](https://stripe.com/docs/billing/quickstart)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Webhook Events](https://stripe.com/docs/api/events)
- [PCI Compliance](https://stripe.com/docs/security/pci-compliance)

---

## 🎯 Next Steps (Post-Implementation)

1. **Phase 5 (Multi-currency):** Support USD, GBP, CAD
2. **Phase 6 (Loyalty):** Coupons, promo codes, affiliate payouts
3. **Phase 7 (Advanced):** Recurring revenue analytics, churn prediction

---

**Status:** 📋 Ready for implementation
**Owner:** @dev (Dex) - Implementation
**Approved by:** @po (Pax)
**Last updated:** 16 May 2026
