# Stripe Brasil Environment Variables Collection Checklist

**Goal:** Collect all required Stripe configuration from Stripe Brasil dashboard  
**Timeline:** 15-20 minutes  
**Dashboard:** https://dashboard.stripe.com/

---

## 1️⃣ Authenticate to Stripe Brasil Dashboard

- [ ] Open https://dashboard.stripe.com/ in your browser
- [ ] Log in with your Stripe Brasil account credentials
- [ ] Verify you're in the **Brasil** account (should show "BRL" currency in header)

---

## 2️⃣ Collect API Keys (from **Settings → API Keys**)

**Path:** Click **Settings** (bottom left) → **Developers** → **API Keys** → **Standard keys**

| Variable | Value | Instructions |
|----------|-------|--------------|
| `STRIPE_BR_SECRET_KEY` | (collect) | Copy **Secret key** (starts with `sk_live_` for production or `sk_test_` for testing) |
| `STRIPE_PUBLISHABLE_KEY` | (collect) | Copy **Publishable key** (starts with `pk_live_` or `pk_test_`) |

**⚠️ CRITICAL:** Use **Secret key** (not Restricted key). This key has full API access.

Save these values temporarily:
```
STRIPE_BR_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 3️⃣ Collect Webhook Signing Secret (from **Settings → Webhooks**)

**Path:** Click **Settings** → **Developers** → **Webhooks** → (or create new endpoint)

### If webhook endpoint already exists:
- [ ] Find endpoint: `https://lodgra.com/api/stripe/webhooks/billing`
- [ ] Click the endpoint to expand details
- [ ] Under **Signing secret**, click **Reveal** (eye icon)
- [ ] Copy the secret (starts with `whsec_`)

### If webhook endpoint doesn't exist yet (create later at step 5):
- [ ] Skip this for now — you'll create the webhook in TASK 5

Save this value:
```
STRIPE_BR_WEBHOOK_SECRET=whsec_...
```

---

## 4️⃣ Collect Price IDs for SaaS Plans (from **Products → Prices**)

**Path:** Click **Products** (sidebar) → Click a product → **Prices** tab

We need the Price IDs for three plans:

### Plan 1: Essencial (R$59/month)
- [ ] Find product **"Essencial"** or **"Essential"** in Products list
- [ ] Click to open product details
- [ ] Under **Prices**, find the **R$59** monthly price
- [ ] Copy the **Price ID** (format: `price_...`)

```
STRIPE_PRICE_ID_ESSENCIAL_BRL=price_...
```

### Plan 2: Expansão (R$89/month)
- [ ] Find product **"Expansão"** or **"Expansion"** in Products list
- [ ] Under **Prices**, find the **R$89** monthly price
- [ ] Copy the **Price ID**

```
STRIPE_PRICE_ID_EXPANSAO_BRL=price_...
```

### Plan 3: Premium (R$130/month)
- [ ] Find product **"Premium"** in Products list
- [ ] Under **Prices**, find the **R$130** monthly price
- [ ] Copy the **Price ID**

```
STRIPE_PRICE_ID_PREMIUM_BRL=price_...
```

**If these prices don't exist:**  
You'll need to create them first in Stripe dashboard (Products → Create product → Add price). Reference the pricing from `.env.production` if needed.

---

## ✅ Summary: 9 Environment Variables Collected

Once you've completed all steps above, you should have:

```env
# API Keys
STRIPE_BR_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook Signing Secret
STRIPE_BR_WEBHOOK_SECRET=whsec_...

# Price IDs (Brasil, in BRL)
STRIPE_PRICE_ID_ESSENCIAL_BRL=price_...
STRIPE_PRICE_ID_EXPANSAO_BRL=price_...
STRIPE_PRICE_ID_PREMIUM_BRL=price_...

# Optional (if using publishable key variant)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (same as STRIPE_PUBLISHABLE_KEY)
```

---

## Next: Add to Vercel (TASK 4)

Once you have all values collected, move to TASK 4 to add them to your Vercel dashboard:
- Go to **Vercel Project Settings → Environment Variables**
- Add each variable with appropriate scopes (Production, Preview, Development)
- Redeploy after adding

---

## Troubleshooting

**Can't find API Keys section?**  
- Make sure you're logged into the correct Stripe account (Brasil, not Global)
- Look for **Settings** icon (gear) at the bottom left of the sidebar

**Can't find webhook signing secret?**  
- If no webhook exists yet, you'll create it in TASK 5
- Stripe generates the signing secret when you create the webhook endpoint

**Price IDs not showing?**  
- Make sure products exist in your Stripe Brasil account
- If not, create them in Products → Create product
- Pricing should match: Essencial €9 = R$59, Expansão €14 = R$89, Premium €19 = R$130

---

**Status:** Ready for user to collect values  
**Time Estimate:** 15-20 minutes
