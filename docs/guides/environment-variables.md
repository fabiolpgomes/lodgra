# Environment Variables Guide

Complete documentation of all environment variables used in Lodgra.

---

## Overview

Environment variables are separated into:
- **Public variables** — Prefixed with `NEXT_PUBLIC_` (exposed to browser)
- **Secret variables** — No prefix (server-side only)

**Location:** `.env.local` (development) or Vercel Settings (production)

---

## Required Variables

### Authentication (Supabase)

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | ✅ | `https://abcdef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | ✅ | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | ✅ | `eyJhbGc...` |

**Get from:** Supabase Dashboard → Project Settings → API Keys

---

### Public Site URL

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public | ✅ | `https://lodgra.io` |

**Used for:**
- Email verification links
- Password reset links
- Social media meta tags
- Sitemap generation

---

### Analytics

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Public | ❌ | `G-XXXXXXXXXX` |

**Get from:** [Google Analytics](https://analytics.google.com/) → Property Settings  
**Status:** Not yet configured (see `/docs/guides/seo-analytics.md`)

---

### Email Service (Resend)

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `RESEND_API_KEY` | Secret | ✅ | `re_xxxxx...` |

**Used for:**
- Verification emails
- Password reset emails
- Booking confirmations
- Admin notifications

**Get from:** [Resend Dashboard](https://resend.com/api-keys)

---

### Payment Processing (Stripe)

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | ✅ | `pk_live_...` |
| `STRIPE_SECRET_KEY` | Secret | ✅ | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret | ✅ | `whsec_...` |
| `STRIPE_BR_SECRET_KEY` | Secret | ✅ | `sk_live_...` (Brazil account) |

**Used for:**
- Payment processing
- Subscription management
- Webhook event handling

**Get from:** [Stripe Dashboard](https://dashboard.stripe.com/) → API Keys / Webhooks

---

### File Storage (AWS S3 / Supabase Storage)

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `AWS_ACCESS_KEY_ID` | Secret | ✅ | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Secret | ✅ | `wJa...` |
| `AWS_REGION` | Public | ✅ | `us-east-1` |
| `AWS_S3_BUCKET_NAME` | Public | ✅ | `lodgra-uploads` |

**Used for:**
- Property photo uploads
- Document storage
- Media files

**Alternative:** Use Supabase Storage (built-in)

---

### Localization

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Public | ❌ | `pt-BR` |

**Default:** `pt-BR`  
**Supported:** `pt-BR`, `es`, `en-US`

---

### Feature Flags (Optional)

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Public | ❌ | `true` |
| `NEXT_PUBLIC_ENABLE_PWA` | Public | ❌ | `true` |

**Default:** Both enabled

---

## Development Setup

### Step 1: Create `.env.local`

```bash
cp .env.example .env.local
```

### Step 2: Fill Required Variables

At minimum, you need:
- Supabase keys (create free account)
- Resend API key (create free account)
- Stripe keys (create test account)

### Step 3: Test Connection

```bash
npm run dev
```

Visit `http://localhost:3000` — if no errors, you're set!

---

## Production Setup (Vercel)

### Step 1: Go to Vercel Project Settings

1. Vercel Dashboard → Select Lodgra project
2. Settings → Environment Variables

### Step 2: Add All Required Variables

Use same format as `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# ... etc
```

### Step 3: Redeploy

- Git push to `main`, or
- Click "Deploy" in Vercel dashboard

---

## Security Best Practices

⚠️ **NEVER commit `.env.local`** — always git ignore!

✅ **DO:**
- Store secrets in Vercel environment variables
- Use separate Stripe accounts for test/production
- Rotate API keys regularly
- Use `.env.example` to document structure

❌ **DON'T:**
- Commit secret keys to git
- Expose `STRIPE_SECRET_KEY` in frontend code
- Use same keys for test and production
- Share `.env.local` via email/Slack

---

## Verification Checklist

After setting up environment variables:

| Check | Status |
|-------|--------|
| [ ] Supabase connection works (can login) | |
| [ ] Email service works (password reset email sent) | |
| [ ] Stripe test payments work | |
| [ ] Google Analytics tracking fires (check Network tab) | |
| [ ] S3/file uploads work (upload property photo) | |

---

## Troubleshooting

### "Cannot read property of undefined"
**Cause:** Missing environment variable  
**Fix:** Check `.env.local` or Vercel environment variables

### "Unauthorized" errors
**Cause:** Invalid Supabase keys  
**Fix:** Verify keys in Supabase Dashboard → Project Settings

### "Payment declined"
**Cause:** Using production Stripe key in development  
**Fix:** Use Stripe test keys (start with `pk_test_`)

### "Email not sending"
**Cause:** Invalid Resend API key  
**Fix:** Check Resend Dashboard → API Keys → Verify key is active

---

## Quick Reference

**Local Development:**
```bash
# Copy template
cp .env.example .env.local

# Fill in required variables
nano .env.local

# Start dev server
npm run dev
```

**Production Deployment:**
1. Add all variables to Vercel Settings
2. Git push or click Deploy
3. Verify in browser (no 500 errors = success)

---

## Related Documentation

- `docs/guides/seo-analytics.md` — Google Analytics setup
- `.env.example` — Template with all variables
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- Vercel Docs: https://vercel.com/docs

---

**Last Updated:** 2026-05-20  
**Next Review:** 2026-06-20
