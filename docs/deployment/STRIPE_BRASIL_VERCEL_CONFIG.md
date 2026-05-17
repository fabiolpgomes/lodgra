# Add Stripe Brasil Environment Variables to Vercel (TASK 4)

**Goal:** Configure Stripe secrets in Vercel dashboard  
**Timeline:** 10 minutes  
**Prerequisites:** Complete TASK 3 (have 9 environment variables collected)

---

## Access Vercel Project Settings

1. [ ] Open https://vercel.com/dashboard
2. [ ] Select your **lodgra** project
3. [ ] Click **Settings** (top navigation)
4. [ ] Click **Environment Variables** (left sidebar)

---

## Add 9 Environment Variables

For each variable below, follow this pattern:

1. Click **Add New** button
2. Paste the **Name** exactly as shown
3. Paste the **Value** (from TASK 3)
4. Select **Scope:**
   - **Production** (required) — for live environment
   - **Preview** (recommended) — for preview deployments
   - **Development** (optional) — for local development
5. Click **Save**

---

## Variables to Add

### 1. STRIPE_BR_SECRET_KEY

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_BR_SECRET_KEY` |
| **Value** | `sk_live_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview |

### 2. STRIPE_PUBLISHABLE_KEY

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_PUBLISHABLE_KEY` |
| **Value** | `pk_live_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview, ✅ Development |

### 3. STRIPE_BR_WEBHOOK_SECRET

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_BR_WEBHOOK_SECRET` |
| **Value** | `whsec_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview |

### 4. STRIPE_PRICE_ID_ESSENCIAL_BRL

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_PRICE_ID_ESSENCIAL_BRL` |
| **Value** | `price_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview, ✅ Development |

### 5. STRIPE_PRICE_ID_EXPANSAO_BRL

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_PRICE_ID_EXPANSAO_BRL` |
| **Value** | `price_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview, ✅ Development |

### 6. STRIPE_PRICE_ID_PREMIUM_BRL

| Field | Value |
|-------|-------|
| **Name** | `STRIPE_PRICE_ID_PREMIUM_BRL` |
| **Value** | `price_...` (from TASK 3) |
| **Scope** | ✅ Production, ✅ Preview, ✅ Development |

### 7. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Value** | `pk_live_...` (same as STRIPE_PUBLISHABLE_KEY) |
| **Scope** | ✅ Production, ✅ Preview, ✅ Development |
| **Note** | This is exposed to the browser (public key), that's why it's prefixed with NEXT_PUBLIC_ |

### 8-9. Optional: Non-Production Keys (if testing with test keys)

If using **test keys** during development:

```
STRIPE_TEST_PRICE_ID_ESSENCIAL_BRL=price_test_...
STRIPE_TEST_PRICE_ID_EXPANSAO_BRL=price_test_...
STRIPE_TEST_PRICE_ID_PREMIUM_BRL=price_test_...
```

---

## Verification Checklist

After adding all variables, verify in Vercel:

- [ ] All 6 required variables appear in **Environment Variables** list
- [ ] Each has correct **Scope** settings (Production ✅, Preview ✅)
- [ ] No typos in variable names (they're case-sensitive)
- [ ] No trailing/leading whitespace in values

---

## Next: Trigger Redeployment

After saving all variables:

1. [ ] Go to **Deployments** (top navigation)
2. [ ] Click the **⋯** (three dots) on the latest deployment
3. [ ] Select **Redeploy**
4. [ ] Wait for deployment to complete (2-5 minutes)

**Why redeploy?** Environment variables don't automatically apply to existing deployments. You need to redeploy to pick up the new values.

---

## Next: Configure Webhook (TASK 5)

Once deployment completes successfully, proceed to TASK 5 to:
1. Create webhook endpoint in Stripe
2. Select events to receive
3. Copy signing secret to Vercel

---

## Troubleshooting

**Deployment fails after adding environment variables:**
- [ ] Check Vercel build logs for errors (Deployments → click failed deployment → Logs tab)
- [ ] Verify all variable names are spelled exactly as shown above (case-sensitive)
- [ ] Check for trailing whitespace in values

**Build succeeds but webhook not working:**
- [ ] Make sure you completed TASK 5 (webhook configuration in Stripe)
- [ ] Verify STRIPE_BR_WEBHOOK_SECRET is correct (matches Stripe dashboard)

---

**Status:** Ready once TASK 3 is complete  
**Time Estimate:** 10 minutes (plus 2-5 minute redeploy)
