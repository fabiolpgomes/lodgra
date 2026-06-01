# Staging Environment Setup Guide

## Overview

Lodgra staging environment is a parallel infrastructure for testing the multi-tenant PWA without affecting production data or deployments.

**Status:** ✅ **ACTIVE & READY FOR TESTING**

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
| **Deployment URL** | https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app |
| **Environment** | Preview (staging branch) |
| **Status** | ✅ Ready |

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

1. Navigate to: https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app
2. Click "Sign up"
3. Enter email: `staging-test@lodgra.io` (or any test email)
4. System automatically creates user_profile + links to test organization

---

## Testing PWA Installation

### On Mobile (iOS/Android)

1. **Open browser:**
   - iOS Safari or Chrome on iPhone/iPad
   - Chrome or Firefox on Android

2. **Navigate to staging:**
   ```
   https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app
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
curl -X POST https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app/api/auth/identify-org \
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
vercel logs https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app
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

*Last Updated: 2026-06-01*  
*Maintained by: @dev (Dex)*
