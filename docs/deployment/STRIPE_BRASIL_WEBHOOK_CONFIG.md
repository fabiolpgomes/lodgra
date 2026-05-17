# Configure Stripe Webhook Endpoint (TASK 5)

**Goal:** Create webhook endpoint in Stripe Brasil to receive subscription events  
**Timeline:** 10 minutes  
**Prerequisites:** TASK 4 complete (Vercel redeployment done)

---

## Access Stripe Webhooks Settings

1. [ ] Open https://dashboard.stripe.com (Stripe Brasil account)
2. [ ] Click **Settings** (bottom left) → **Developers** → **Webhooks**

---

## Create Webhook Endpoint

### Step 1: Add Endpoint

- [ ] Click **+ Add an endpoint** (top right or center of page)

### Step 2: Enter Endpoint URL

In the modal that appears:

| Field | Value |
|-------|-------|
| **Endpoint URL** | `https://lodgra.com/api/stripe/webhooks/billing` |
| **Version** | `2024-04-10` (leave as default) |

**Note:** Replace `lodgra.com` with your actual production domain.

### Step 3: Select Events to Send

In the **Events to send** section, click **Select events** and add:

**Required Subscription Events:**
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`

**Required Invoice Events:**
- [ ] `invoice.created`
- [ ] `invoice.paid`
- [ ] `invoice.failed`
- [ ] `invoice.finalized`

**Search tip:** Type "subscription" or "invoice" to filter the event list.

### Step 4: Create Endpoint

- [ ] Click **Add events** (or confirm button)
- [ ] Click **Create endpoint** (bottom button)

---

## Copy Webhook Signing Secret

After the endpoint is created:

1. [ ] The endpoint should now appear in your webhooks list
2. [ ] Click on the endpoint to expand details
3. [ ] Under **Signing secret**, click **Reveal** (eye icon)
4. [ ] **Copy the full secret** (starts with `whsec_`)

This is your `STRIPE_BR_WEBHOOK_SECRET` — but you should have already collected this in TASK 3.

**If the secret doesn't match what you collected earlier:**
- [ ] Update the value in Vercel Environment Variables (TASK 4)
- [ ] Trigger another redeployment

---

## Test the Webhook

### Method 1: Use Stripe CLI (Recommended)

```bash
# 1. Install Stripe CLI (if not already installed)
brew install stripe/stripe-cli/stripe

# 2. Login to your Stripe account
stripe login

# 3. Forward events to your local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhooks/billing

# 4. In another terminal, trigger a test event
stripe trigger customer.subscription.created
```

### Method 2: Manual Test from Stripe Dashboard

1. [ ] Go to Webhooks endpoint details (from step above)
2. [ ] Scroll to **Events** section
3. [ ] Find any recent event you sent
4. [ ] Click the event to view details and response
5. [ ] Verify the endpoint returned **HTTP 200**

### Expected Response

Your webhook endpoint should return:
```json
{
  "received": true
}
```

HTTP Status: **200 OK**

---

## Webhook Handler Flow (Verification)

The webhook endpoint (`/api/stripe/webhooks/billing`) will:

1. **Receive** the Stripe event
2. **Verify signature** using `STRIPE_BR_WEBHOOK_SECRET`
3. **Check rate limit** (10 requests/minute per IP)
4. **Deduplicate** by checking `stripe_events` table
5. **Route to handler:**
   - `customer.subscription.*` → `handleSubscriptionEvent()`
   - `invoice.*` → `handleInvoiceEvent()`
6. **Log event** to `stripe_events` table
7. **Return 200** to acknowledge receipt

**Database:** Events are logged in the `stripe_events` table (if it exists). Verify table exists:

```sql
SELECT * FROM stripe_events LIMIT 1;
```

If table doesn't exist, run migrations:
```bash
npx supabase db push
```

---

## Troubleshooting

### Webhook not receiving events

**Check 1: Endpoint URL is correct**
- [ ] Verify endpoint URL matches your production domain
- [ ] Test URL in browser (should not return 404)

**Check 2: Events are properly selected**
- [ ] Go to Webhooks settings
- [ ] Click endpoint → expand **Events** section
- [ ] Verify 6 events listed (3 subscription + 3 invoice)

**Check 3: Secret is correct**
- [ ] Copy secret from Stripe dashboard
- [ ] Add to Vercel as `STRIPE_BR_WEBHOOK_SECRET`
- [ ] Redeploy application

### 401 Unauthorized from webhook handler

**Cause:** Invalid webhook signature secret

**Fix:**
1. [ ] Copy the correct secret from Stripe (Webhooks → endpoint → Signing secret)
2. [ ] Update `STRIPE_BR_WEBHOOK_SECRET` in Vercel
3. [ ] Redeploy
4. [ ] Test again

### 429 Rate Limited

**Cause:** More than 10 webhook requests per minute from same IP

**Normal behavior:** Stripe's test events can trigger multiple times

**Fix:** Wait 1 minute and try again, or increase rate limit in `.lib/middleware/rate-limit.ts`

---

## Next: Full Test Suite (TASK 6)

Once webhook is receiving events:

1. [ ] Run `npm run lint` (code quality)
2. [ ] Run `npm run typecheck` (TypeScript)
3. [ ] Run `npm test` (unit tests)
4. [ ] Run `npm run build` (production build)

All should pass before proceeding to TASK 7 (git push).

---

**Status:** Ready once TASK 4 is complete  
**Time Estimate:** 10 minutes + 5 min testing
