# Stripe Billing Setup Guide

**Version:** 1.0  
**Created:** 2026-05-01  
**Applies to:** Lodgra Staging + Production  
**Markets:** Brazil (BRL), Europe (EUR), United States (USD)

---

## Overview

Lodgra uses a **per-unit licensed + metered usage hybrid** billing model powered by Stripe. Customers subscribe to a base plan (flat monthly fee) and optionally accrue usage-based charges tracked via Stripe Billing Meters.

### Plan Summary

| Plan | BRL/mês | EUR/mês | USD/mês | Metered Usage |
|------|---------|---------|---------|---------------|
| **Essencial (Starter)** | R$59 | — | — | None |
| **Expansão (Growth)** | R$89 | — | — | + R$5/reserva (booking_fee meter) |
| **Pro** | R$130 | — | — | + 1% receita (revenue_fee meter) |

> Note: EUR and USD price points were configured in Stripe but not yet displayed in the landing page pricing UI. BRL is the primary market for launch.

---

## Products and Plans

### Starter (Essencial)

Simple flat-rate subscription. No metered usage. Intended for individual hosts with low booking volume.

- Per-unit price only (one price per currency)
- No usage-based component

### Growth (Expansão)

Two-component subscription:
1. **Per-unit price** — flat monthly fee
2. **Metered price** — `booking_fee` meter, billed per booking event reported

- Metered events must be reported to Stripe via the Billing Meters API whenever a booking is confirmed
- Meter name: `booking_fee`

### Pro

Two-component subscription:
1. **Per-unit price** — flat monthly fee
2. **Metered price** — `revenue_fee` meter, billed as a percentage of reported revenue

- Revenue events must be reported to Stripe via the Billing Meters API at the end of each billing period
- Meter name: `revenue_fee`

---

## Price IDs

All 15 Price IDs are stored as environment variables. The naming convention is:

```
STRIPE_PRICE_{PLAN}_{CURRENCY}         # per-unit (base subscription)
STRIPE_PRICE_{PLAN}_{CURRENCY}_METERED # metered usage (Growth/Pro only)
```

### Starter

| Currency | Env Var | Price ID |
|----------|---------|----------|
| EUR | `STRIPE_PRICE_STARTER_EUR` | `price_1TRrfE2cJshbnOoQyyf0WpTM` |
| BRL | `STRIPE_PRICE_STARTER_BRL` | `price_1TRrZz2cJshbnOoQRp2gjkpi` |
| USD | `STRIPE_PRICE_STARTER_USD` | `price_1TRrec2cJshbnOoQuK1jUJOV` |

### Growth (Expansão)

| Currency | Type | Env Var | Price ID |
|----------|------|---------|----------|
| EUR | Per-unit | `STRIPE_PRICE_GROWTH_EUR` | configured |
| EUR | Metered | `STRIPE_PRICE_GROWTH_EUR_METERED` | configured |
| BRL | Per-unit | `STRIPE_PRICE_GROWTH_BRL` | configured |
| BRL | Metered | `STRIPE_PRICE_GROWTH_BRL_METERED` | configured |
| USD | Per-unit | `STRIPE_PRICE_GROWTH_USD` | configured |
| USD | Metered | `STRIPE_PRICE_GROWTH_USD_METERED` | configured |

### Pro

| Currency | Type | Env Var | Price ID |
|----------|------|---------|----------|
| EUR | Per-unit | `STRIPE_PRICE_PRO_EUR` | configured |
| EUR | Metered | `STRIPE_PRICE_PRO_EUR_METERED` | configured |
| BRL | Per-unit | `STRIPE_PRICE_PRO_BRL` | configured |
| BRL | Metered | `STRIPE_PRICE_PRO_BRL_METERED` | configured |
| USD | Per-unit | `STRIPE_PRICE_PRO_USD` | configured |
| USD | Metered | `STRIPE_PRICE_PRO_USD_METERED` | configured |

> All Price IDs are set in both `.env.local` (development) and Vercel environment variables (staging + production).

---

## Billing Meters

Stripe Billing Meters track usage events and aggregate them for metered pricing.

### `booking_fee` (Growth plan)

- **Purpose:** Charges R$5 (or equivalent) per confirmed booking
- **Used by:** Growth/Expansão plan subscribers
- **Event reporting:** Call Stripe Billing Meters API when a booking transitions to `confirmed` status
- **Field:** `stripe_metered_item_id` in `organizations` table holds the subscription item ID for this meter

### `revenue_fee` (Pro plan)

- **Purpose:** Charges 1% of reported revenue per billing period
- **Used by:** Pro plan subscribers
- **Event reporting:** Report revenue amount at end of billing period (or at checkout completion)
- **Field:** `stripe_metered_item_id` in `organizations` table holds the subscription item ID for this meter

---

## Database Columns

Migration: `supabase/migrations/20260429_03_billing_columns.sql`

Applied to:
- Staging: `wrqjpyyopwgyqluqkcga`
- Production: `brjumbfpvijrkhrherpt`

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_metered_item_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_unit_count INTEGER NOT NULL DEFAULT 1;
```

### Column Descriptions

| Column | Type | Purpose |
|--------|------|---------|
| `stripe_subscription_item_id` | TEXT | ID of the per-unit subscription item (`si_xxx`). Used when upgrading/downgrading plans. |
| `stripe_metered_item_id` | TEXT | ID of the metered subscription item (`si_xxx`). Used when reporting usage to Stripe Meters. |
| `billing_unit_count` | INTEGER | Number of licensed units (properties/users) on the current plan. Defaults to 1. |

These columns complement the existing `stripe_customer_id` and `stripe_subscription_id` columns.

---

## Webhook Setup

### Webhook Secret

Environment variable: `STRIPE_WEBHOOK_SECRET`

Set in:
- `.env.local` for development (use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- Vercel environment variables for staging and production

### Webhook Endpoint

```
POST /api/stripe/webhook
```

File: `src/app/api/stripe/webhook/route.ts`

### Handled Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates organization, invites user, auto-confirms email, stores subscription item IDs |
| `customer.subscription.updated` | Updates plan/status in `organizations` table |
| `customer.subscription.deleted` | Marks subscription as cancelled |
| `invoice.payment_failed` | Handles dunning (future) |

### Auto-Confirm Email Logic

After `inviteUserByEmail`, the webhook immediately calls:

```typescript
await adminClient.auth.admin.updateUserById(userId, { email_confirm: true })
```

This prevents the invited user from encountering "Email not confirmed" errors before they set their password.

---

## Checkout API Endpoint

```
POST /api/stripe/checkout
```

File: `src/app/api/stripe/checkout/route.ts`

### Request Body

```json
{
  "plan": "starter" | "growth",
  "currency": "brl" | "eur" | "usd"
}
```

### Behavior

1. Resolves the correct Stripe Price ID(s) for the given plan + currency combination using `getPriceIdForPlan(plan, currency)`
2. Creates a Stripe Checkout Session with:
   - `mode: 'subscription'`
   - `line_items` containing the per-unit price (and metered price if applicable)
   - `success_url` pointing back to the landing page with a success param
   - `cancel_url` pointing back to the landing `#pricing` section
3. Returns `{ url }` — the hosted Stripe Checkout URL
4. Client-side code redirects to `url`

### Example Client Call (BrazilLanding.tsx)

```typescript
const res = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan: 'growth', currency: 'brl' }),
})
const { url } = await res.json()
window.location.href = url
```

---

## Complete Commercial Flow

The end-to-end flow from landing page to active user:

```
1. LANDING PAGE
   User visits BrazilLanding (/br) or LandingPageClient (/ with locale)
   User scrolls to #pricing section (all CTAs scroll there)

2. PLAN SELECTION
   User clicks "Assinar Expansão" or "Assinar Essencial"
   Frontend calls POST /api/stripe/checkout { plan, currency }
   API returns Stripe Checkout URL

3. STRIPE CHECKOUT (hosted)
   User enters billing info and completes payment
   Stripe processes payment

4. STRIPE WEBHOOK
   Event: checkout.session.completed
   Webhook handler (src/app/api/stripe/webhook/route.ts):
     a. Creates organization in Supabase
     b. Stores stripe_customer_id, stripe_subscription_id
     c. Stores stripe_subscription_item_id, stripe_metered_item_id
     d. Calls supabase.auth.admin.inviteUserByEmail(email, { redirectTo })
     e. Immediately calls updateUserById(userId, { email_confirm: true })
   redirectTo = /auth/callback?next=/auth/reset-password-confirm?from=invite

5. INVITE EMAIL
   User receives Supabase invite email with magic link
   Link contains PKCE code parameter

6. /auth/callback (PKCE exchange)
   Code is exchanged for a session
   User is redirected to /auth/reset-password-confirm?from=invite

7. PASSWORD CREATION (src/app/auth/reset-password-confirm/page.tsx)
   Page detects from=invite → title shows "Criar sua senha"
   User sets their password
   On success → redirect to /onboarding (not /login)

8. ONBOARDING (/onboarding)
   User sets up their first property, iCal, etc.

9. DASHBOARD
   User lands on /dashboard and starts using Lodgra
```

---

## Environment Variables Reference

```bash
# Stripe keys
STRIPE_SECRET_KEY=sk_live_xxx         # or sk_test_xxx for dev
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Starter prices
STRIPE_PRICE_STARTER_EUR=price_1TRrfE2cJshbnOoQyyf0WpTM
STRIPE_PRICE_STARTER_BRL=price_1TRrZz2cJshbnOoQRp2gjkpi
STRIPE_PRICE_STARTER_USD=price_1TRrec2cJshbnOoQuK1jUJOV

# Growth prices (per-unit + metered)
STRIPE_PRICE_GROWTH_EUR=price_xxx
STRIPE_PRICE_GROWTH_EUR_METERED=price_xxx
STRIPE_PRICE_GROWTH_BRL=price_xxx
STRIPE_PRICE_GROWTH_BRL_METERED=price_xxx
STRIPE_PRICE_GROWTH_USD=price_xxx
STRIPE_PRICE_GROWTH_USD_METERED=price_xxx

# Pro prices (per-unit + metered)
STRIPE_PRICE_PRO_EUR=price_xxx
STRIPE_PRICE_PRO_EUR_METERED=price_xxx
STRIPE_PRICE_PRO_BRL=price_xxx
STRIPE_PRICE_PRO_BRL_METERED=price_xxx
STRIPE_PRICE_PRO_USD=price_xxx
STRIPE_PRICE_PRO_USD_METERED=price_xxx
```

---

## Testing Locally

```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed

# Use test card: 4242 4242 4242 4242 (any future date, any CVC)
```

---

## Relevant Files

| File | Purpose |
|------|---------|
| `src/app/api/stripe/checkout/route.ts` | Creates Stripe Checkout Session |
| `src/app/api/stripe/webhook/route.ts` | Handles Stripe webhook events |
| `src/lib/billing/plans.ts` | Price ID resolution + plan helpers |
| `src/app/auth/reset-password-confirm/page.tsx` | Password creation for invited users |
| `src/app/[locale]/register/page.tsx` | Self-signup with emailRedirectTo |
| `src/app/auth/callback/route.ts` | PKCE code exchange |
| `supabase/migrations/20260429_03_billing_columns.sql` | Billing columns migration |

---

*Lodgra Stripe Billing Setup v1.0 — 2026-05-01*
