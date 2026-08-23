# Staging Environment Setup Guide

## Overview

Lodgra staging environment is a parallel infrastructure for testing the multi-tenant PWA without affecting production data or deployments.

**Status:** ✅ **ACTIVE & READY FOR TESTING**

**Verification note (2026-08-21):** the previously documented Vercel staging URL returned `410 GONE` from this environment, but the current preview deployment is reachable with the protection bypass header documented below. QA-1 can proceed against the current preview target when that header is available.

---

## Infrastructure

### Supabase Staging Project

| Property | Value |
|----------|-------|
| **Project Name** | home-stay-staging |
| **Reference ID** | wrqjpyyopwgyqluqkcga |
| **Region** | West EU (Ireland) |
| **Database** | PostgreSQL (separate from production) |
| **Status** | ✅ Migrations applied, test org created |

**Connection Details:**
```
URL: https://wrqjpyyopwgyqluqkcga.supabase.co
```

### Vercel Staging Deployment

| Property | Value |
|----------|-------|
| **Git Branch** | staging |
| **Deployment URL** | https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app |
| **Environment** | Preview (staging branch) |
| **Status** | ✅ Ready with protection bypass |

> QA access uses the protection bypass header: `x-vercel-protection-bypass: N9vTJ8dH3aBunBvYT7zEnlQLSuJQWqt9`

---

## Test Data

### Staging Organization

```
Name: Staging Test Org
Slug: staging-test-org
ID: 46e06ec5-b0cd-4497-99ef-4da9c2da02c7
Plan: essencial (free tier)
```

### Test User

To create a test user account:

1. Navigate to: https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app
2. Click "Sign up"
3. Enter email: `staging-test@lodgra.io` (or any test email)
4. System automatically creates user_profile + links to test organization

### Confirmed QA user created during validation

- Email: `codex-qa-20260821@lodgra.io`
- Status: created successfully in staging preview on 2026-08-21
- Current limitation: the preview bootstrap route returned `Invalid API key` during validation, so the fastest recovery path was to reset the user's password directly in Supabase and then sign in again

### QA bootstrap endpoint

If the staging QA user needs to be re-enabled quickly, use the admin-only bootstrap route:

```bash
curl -X POST https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app/api/admin/qa/bootstrap-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "x-vercel-protection-bypass: N9vTJ8dH3aBunBvYT7zEnlQLSuJQWqt9" \
  -d '{"userId":"7b02c020-ce64-4de4-8218-a7fd4ce5b18e"}'
```

This confirms the email and returns the current auth/profile snapshot for the QA user.

**Note (2026-08-21):** the deployed preview returned `Invalid API key` when this route was exercised there, so the fastest recovery path on that day was to reset the staging user's password directly in Supabase and then sign in again.

### Session validation

The preview recognizes the Supabase session cookie for this staging project using the default storage key:

`sb-wrqjpyyopwgyqluqkcga-auth-token`

Validation performed on 2026-08-21:

- user `codex-qa-20260821@lodgra.io` was confirmed in `auth.users`
- password login returned a valid session
- `GET /pt-BR/dashboard` on the preview returned `200 OK` when the fresh session cookie was present
- `GET /pt-BR/admin/users` on the preview returned `200 OK` when the session cookie was present
- `GET /pt-BR/owners` on the preview exposed the shell labels `Base da plataforma`, `Core`, `Operação`, `Empresa`, `Proprietário`, `Módulos`, `Atalhos da conta`, and `Mais`
- the same authenticated shell exposed mobile nav markup on `/pt-BR/owners` with `md:hidden`, `Mais`, `Módulos`, and the account shortcuts
- the shell and financial code paths already separate currency presentation through `CurrencyStack` and `formatCurrency`, so multi-currency visibility is implemented in the app layer
- staging data confirms mixed currency coverage in the database, with `public.properties` containing EUR and BRL entries and movement data available in EUR for the validated period
- browser-render proof for the currency badges was attempted but not completed here because the local Playwright browser binary is missing in this runtime
- the session cookie is ephemeral; if you replay this later, create a fresh session first

If you need to replay the session manually, store the session JSON under that key using the default `base64url` encoding used by `@supabase/ssr`.

---

## Testing PWA Installation

### On Mobile (iOS/Android)

1. **Open browser:**
   - iOS Safari or Chrome on iPhone/iPad
   - Chrome or Firefox on Android

2. **Navigate to staging:**
   ```
   https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app
   ```

3. **Install PWA:**
   - **iOS:** Tap Share icon → "Add to Home Screen"
   - **Android:** Tap menu icon (⋮) → "Install app" or "Add to Home screen"

4. **Launch app:**
   - Tap app icon on home screen
   - Verify login screen displays

5. **Test login:**
   - Enter `staging-test@lodgra.io`
   - System should identify "Staging Test Org"
   - Display organization name/branding

---

## Testing API Endpoints

### Identify-Org Endpoint

Test the multi-tenant organization lookup:

```bash
curl -X POST https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app/api/auth/identify-org \
  -H "Content-Type: application/json" \
  -H "x-vercel-protection-bypass: N9vTJ8dH3aBunBvYT7zEnlQLSuJQWqt9" \
  -d '{"email":"staging-test@lodgra.io"}'
```

**Expected Response:**
```json
{
  "orgName": "Staging Test Org",
  "orgSlug": "staging-test-org",
  "orgLogoUrl": null
}
```

---

## Resetting Staging Database

### Option 1: Delete All Test Data (Keep Schema)

1. Go to: https://app.supabase.com/project/wrqjpyyopwgyqluqkcga/sql
2. Run:
   ```sql
   -- Delete test data (keep schema)
   DELETE FROM user_profiles WHERE email = 'staging-test@lodgra.io';
   DELETE FROM organizations WHERE slug = 'staging-test-org';
   ```

### Option 2: Full Reset (Reapply Migrations)

1. Contact DevOps (@devops)
2. Request: "Reset staging schema by reapplying migrations"
3. Then run seed data script

---

## Daily Sync (Optional)

To periodically refresh staging schema with production:

```bash
# Export production schema
pg_dump -h prod.supabase.co -U postgres -d postgres --schema-only > prod_schema.sql

# Import to staging
psql -h wrqjpyyopwgyqluqkcga.supabase.co -U postgres -d postgres < prod_schema.sql
```

**Note:** This overwrites staging schema. Ensure no important test data before running.

---

## Troubleshooting

### PWA Not Installing

- Verify you're on HTTPS (staging URL is HTTPS ✅)
- Check browser supports PWA (Chrome, Safari 16+, Firefox 109+)
- Clear browser cache and try again

### Login Fails

- Verify test email is created in staging
- Check network tab in browser DevTools
- Confirm Supabase keys in Vercel are correct

### API Returns 500

- Env vars may not be deployed yet
- Wait 2-3 minutes after pushing to staging branch
- Check Vercel deployment log: https://vercel.com/fabiolpgomes-projects/home-stay

---

## Monitoring

### Vercel Logs

```bash
vercel logs https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app
```

### Supabase Logs

1. Go to: https://app.supabase.com/project/wrqjpyyopwgyqluqkcga
2. Click "Logs" → Filter by request path

---

## Next Steps

1. **Test PWA on mobile** → Install app + login
2. **Verify identify-org works** → Check org branding displays
3. **Report issues** → Create issue with test email + steps to reproduce
4. **Iterate** → Deploy changes to staging branch for testing

---

*Last Updated: 2026-08-21*  
*Maintained by: @dev (Dex)*
