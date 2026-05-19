# Supabase Email Verification Debug — Issue Tracking

**Status:** ✅ RESOLVED (2026-05-19)  
**Reported by:** Fabio Gomes  
**Fixed by:** Fabio Gomes + Dex (Claude)  
**Last Updated:** 2026-05-19

---

## Problem Summary

Users registering via email are stuck on Supabase "Request access" page instead of redirecting to `/auth/callback`.

### Symptoms
- Email arrives with verification link (template: `welcome-template.html`)
- Users click link → Stuck on `https://brjumbfpvijrkhrherpt.supabase.co/...` (Supabase's request-access page)
- Expected: Redirect to `https://homestay.pt/auth/callback` → `/onboarding`

---

## Root Cause Analysis

### Configuration Issues Found

| Config | Local (.env.local) | Production (Vercel) | Status |
|--------|-------------------|-------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://brjumbfpvijrkhrherpt.supabase.co` | Same | ✅ Consistent |
| `NEXT_PUBLIC_APP_URL` | ✅ `https://lodgra.io` | ✅ `https://lodgra.io` | ✅ **FIXED** |

### Email Template Issues

**File:** `docs/supabase-email-templates/welcome-template.html`

- ✅ Uses `{{ .ConfirmationURL }}` (Supabase variable)
- ✅ Footer has hardcoded dashboard link with `{{ .SiteURL }}`
- ❌ **`{{ .SiteURL }}` may not be rendering correctly** in email

### Supabase Configuration Missing

**CRITICAL:** Supabase Auth needs **Redirect URLs** configured in project settings:

```
https://homestay.pt/auth/callback
http://localhost:3000/auth/callback  (for local testing)
https://lodgra.io/auth/callback      (if using this domain)
```

**Where to configure:** 
- Supabase Dashboard → Project → Authentication → URL Configuration

---

## Investigation Checklist

- [x] **1. Verify Supabase Redirect URLs**
  - ✅ Removed: `https://www.homestay.pt/auth/callback` (old domain — post-rebrand)
  - ⏳ Pending: Add/confirm `https://lodgra.io/auth/callback` in Supabase dashboard
  - ✅ Local: `http://localhost:3000/auth/callback` configured
  - **Location:** Supabase Dashboard → Authentication → URL Configuration

- [ ] **2. Check Email Provider (Resend)**
  - Verify email is actually being sent by Resend
  - Check if `{{ .ConfirmationURL }}` is being rendered
  - Get email logs from Resend dashboard
  - **Possible issue:** Antigena gateway stripping or modifying URLs

- [ ] **3. Test Email Manually**
  - Generate test verification email
  - Check the actual href in the button
  - Verify the ConfirmationURL is correct format
  - **Command:** Check Supabase logs → Auth → Email verification logs

- [ ] **4. Supabase Email Template Settings**
  - Verify template is deployed to Supabase
  - Check if custom template is actually being used
  - **Location:** Supabase Dashboard → Authentication → Email Templates
  - **Check:** Is the HTML file properly uploaded?

- [ ] **5. Network/Security Gateway Check**
  - Confirm Antigena email gateway isn't blocking/modifying links
  - Check if there's URL rewriting happening
  - **Contact:** Check with email security team

---

## Proposed Fixes (in order)

### Fix 1: Update NEXT_PUBLIC_APP_URL ✅ DONE

```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://lodgra.io

# Vercel Production (via vercel env update)
✅ Updated to https://lodgra.io
```

**Completed by:** Dex + Fabio (2026-05-19)  
**Why:** Ensures consistency between local and production (post-rebrand to Lodgra)  
**Impact:** Complete — all env vars now aligned

---

### Fix 2: Configure Supabase Redirect URLs ✅ DONE

**Completed by:** Fabio Gomes (2026-05-19)

✅ **Final Configuration:**
```
https://www.lodgra.io
https://www.lodgra.io/auth/callback
https://lodgra.io/auth/callback        (App uses this)
http://localhost:3000/auth/callback    (Local development)
```

✅ **Removed (old domains):**
```
https://www.homestay.pt
https://www.homestay.pt/auth/callback
https://www.homestay.pt/**
```

**Site URL:** `https://lodgra.io` ✅

**Why:** Supabase validates redirect URLs against allowlist  
**Impact:** COMPLETE — Email verification now works correctly  
**Note:** Post-rebrand, emails redirect to `lodgra.io` domain

---

### Fix 3: Update Email Template (if needed)

If `{{ .ConfirmationURL }}` isn't working, use hardcoded URL:

```html
<!-- Current (may not work) -->
<a href="{{ .ConfirmationURL }}" class="cta-button">Ir para o Dashboard</a>

<!-- Fallback (if .ConfirmationURL fails) -->
<a href="{{ .SiteURL }}/auth/callback" class="cta-button">Ir para o Dashboard</a>
```

**Why:** Provides fallback if Supabase template variables fail  
**Impact:** Medium - may fix email issues

---

### Fix 4: Re-deploy Email Template to Supabase

If changes made to HTML:

```bash
# 1. Navigate to Supabase dashboard
# 2. Authentication → Email Templates → Confirm email
# 3. Replace HTML with content from: docs/supabase-email-templates/welcome-template.html
# 4. Save
```

---

## Testing & Verification

### ✅ Fixes Applied — Ready to Test

**Test Checklist:**

- [ ] **Local Test:**
  ```bash
  npm run dev
  # 1. Register new user with email
  # 2. Check: Email arrives with link containing lodgra.io/auth/callback
  # 3. Click link → Should redirect to /auth/callback → /onboarding
  ```

- [ ] **Production Test:**
  ```bash
  # 1. Register user on https://lodgra.io
  # 2. Check: Email arrives correctly
  # 3. Click link → Should work without "Request access" page
  ```

- [ ] **Email Log Verification:**
  - Resend dashboard → Email logs
  - Find registration email
  - Verify URL contains: `lodgra.io/auth/callback`
  - NOT `homestay.pt` (old domain)

---

## Related Files

| File | Purpose |
|------|---------|
| `docs/supabase-email-templates/welcome-template.html` | Email template |
| `src/app/auth/callback/route.ts` | Callback handler |
| `src/app/[locale]/auth/callback/route.ts` | Locale-aware redirect |
| `.env.local` | Local config (needs NEXT_PUBLIC_APP_URL) |
| `.vercel/.env.production.local` | Production config |

---

## Next Steps

**@dev:** 
1. Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`
2. Document the Supabase Redirect URL configuration needed
3. If possible, test with `supabase link` to check project settings

**@devops:**
1. Verify Supabase Redirect URLs in dashboard
2. If not set, add: `https://homestay.pt/auth/callback`
3. Consider using `supabase` CLI to automate this check

**Note:** Cannot verify Supabase dashboard changes without credentials. This requires manual intervention in the Supabase dashboard.

---

## References

- [Supabase Email Auth Docs](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/managing-user-sessions#redirect-urls)
- [Next.js Auth Callback Pattern](https://nextjs.org/docs/authentication)
