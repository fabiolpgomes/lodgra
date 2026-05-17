# Stripe Brasil SaaS Deployment — Master Plan

**Objective:** Deploy Stripe Brasil subscriptions to production today by 21:00  
**Strategy:** SaaS-only (defer Booking payments to later phase)  
**Total Timeline:** 4 hours  
**Status:** 2 of 8 tasks complete ✅

---

## 📋 Task Summary

| # | Task | Status | Owner | Est. Time |
|---|------|--------|-------|-----------|
| 1 | Create Stripe client (`src/lib/stripe/client.ts`) | ✅ DONE | Dev | 15 min |
| 2 | Update webhook handler to use client | ✅ DONE | Dev | 15 min |
| **3** | **Collect env vars from Stripe dashboard** | ⏳ READY | **User** | **15 min** |
| **4** | **Add to Vercel environment variables** | ⏳ READY | **User** | **10 min** |
| **5** | **Configure webhook in Stripe** | ⏳ READY | **User** | **10 min** |
| 6 | Run full test suite | ⏳ NEXT | Dev | 10 min |
| 7 | Git commit and push | ⏳ NEXT | DevOps | 5 min |
| 8 | Production validation | ⏳ FINAL | QA | 10 min |

---

## 📍 Current Status

### ✅ Completed (Code Changes)

**Task 1 & 2:** Stripe client infrastructure ready
- Created: `src/lib/stripe/client.ts` with Brasil SaaS configuration
- Updated: `src/app/api/stripe/webhooks/billing/route.ts` to use new client
- Verified: Webhook handler has signature verification, rate limiting, event deduplication

### Code Files Modified
```
src/lib/stripe/client.ts                                    [NEW]
src/app/api/stripe/webhooks/billing/route.ts               [UPDATED]
```

---

## 🔵 Your Turn: 3 Steps (45 minutes total)

### Step 1: TASK 3 — Collect Environment Variables (15 min)

**What to do:** Log into Stripe Brasil dashboard and copy 9 values

**Guide:** `/docs/deployment/STRIPE_BRASIL_ENV_COLLECTION.md`

**You'll need:**
- Stripe Brasil account login
- 5-10 minutes in the dashboard

**You'll collect:**
```
✓ STRIPE_BR_SECRET_KEY (secret key from API section)
✓ STRIPE_PUBLISHABLE_KEY (public key)
✓ STRIPE_BR_WEBHOOK_SECRET (webhook signing secret)
✓ STRIPE_PRICE_ID_ESSENCIAL_BRL (R$59 plan)
✓ STRIPE_PRICE_ID_EXPANSAO_BRL (R$89 plan)
✓ STRIPE_PRICE_ID_PREMIUM_BRL (R$130 plan)
```

---

### Step 2: TASK 4 — Add to Vercel (10 min)

**What to do:** Add the 6 environment variables to Vercel dashboard

**Guide:** `/docs/deployment/STRIPE_BRASIL_VERCEL_CONFIG.md`

**Process:**
1. Go to Vercel dashboard
2. Project Settings → Environment Variables
3. Add each variable with Production + Preview scope
4. Trigger redeploy (Deployments → Redeploy latest)
5. Wait for deployment to finish (2-5 min)

---

### Step 3: TASK 5 — Configure Webhook in Stripe (10 min)

**What to do:** Create webhook endpoint in Stripe dashboard

**Guide:** `/docs/deployment/STRIPE_BRASIL_WEBHOOK_CONFIG.md`

**Process:**
1. Stripe dashboard → Settings → Webhooks
2. Add endpoint: `https://lodgra.com/api/stripe/webhooks/billing`
3. Select 6 events (3 subscription + 3 invoice)
4. Create endpoint
5. Test webhook (optional but recommended)

---

## 🟢 Automated: Tasks 6-8 (DevOps)

Once you complete tasks 3-5, I'll handle the remaining automation:

### Task 6: Full Test Suite (10 min)
```bash
npm run lint      # Code quality
npm run typecheck # TypeScript
npm test          # Unit tests
npm run build     # Production build
```

### Task 7: Git Commit & Push
Delegate to @devops:
```
*pre-push        # Quality gates
*push            # Push to main
```

### Task 8: Production Validation
Verify in production:
- [ ] Webhook endpoints receiving events
- [ ] Subscriptions created successfully
- [ ] Stripe dashboard shows test transactions

---

## ⏱️ Timeline to 21:00

**Current time:** Now (T=0)  
**Your tasks:** 45 minutes (T=45)  
**My automation:** 25 minutes (T=70 = ~21:10)  
**Buffer:** 70 minutes slack if issues arise

**Critical path:** Complete all 3 user tasks by ~20:15 to ensure 21:00 deadline

---

## 🔗 Documentation Files

All guides are in `/docs/deployment/`:

1. **STRIPE_BRASIL_ENV_COLLECTION.md** — Step-by-step for collecting Stripe values
2. **STRIPE_BRASIL_VERCEL_CONFIG.md** — Step-by-step for Vercel configuration
3. **STRIPE_BRASIL_WEBHOOK_CONFIG.md** — Step-by-step for webhook setup
4. **This file** — Overall deployment master plan

---

## ✔️ Deployment Readiness Checklist

Before you start, ensure:

- [ ] You have access to Stripe Brasil account (login works)
- [ ] You have access to Vercel project settings (admin role)
- [ ] You have internet connection stable
- [ ] You have ~45 minutes free time
- [ ] You've read the three documentation files above

---

## Troubleshooting (If Issues Arise)

### "I can't find the Price IDs in Stripe"
- See **STRIPE_BRASIL_ENV_COLLECTION.md** → Section 4 → Troubleshooting
- May need to create prices if they don't exist

### "Vercel deployment fails after adding env vars"
- See **STRIPE_BRASIL_VERCEL_CONFIG.md** → Troubleshooting
- Check build logs for errors

### "Webhook not receiving events"
- See **STRIPE_BRASIL_WEBHOOK_CONFIG.md** → Troubleshooting
- Verify endpoint URL and secret are correct

### "Tests fail after completing all tasks"
- Check `npm run typecheck` for TypeScript errors
- Check `npm run lint` for code style issues
- Ask me to debug before proceeding to push

---

## 📞 Support

If you get stuck:
1. Check the relevant troubleshooting section in the guide
2. Share the error message you see
3. I can help debug or adjust the plan

---

## 🎯 Next Immediate Action

👉 **Start TASK 3:** Open `/docs/deployment/STRIPE_BRASIL_ENV_COLLECTION.md` and begin collecting environment variables from your Stripe Brasil dashboard.

**Estimated completion: 15 minutes**

---

**Deployment Strategy:** A (SaaS Today)  
**Created:** 2026-05-17 17:15 UTC  
**Deadline:** 2026-05-17 21:00 UTC  
**Status:** Code ready ✅ | Awaiting user configuration ⏳
