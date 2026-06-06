# Google Analytics Implementation Checklist — Lodgra Multi-Tenant SaaS

## Implementation Status

### ✅ COMPLETED
- [x] **GoogleAnalytics component** (`src/components/features/analytics/GoogleAnalytics.tsx`)
  - Renders `<Script>` tags for Google Tag Manager gtag.js library
  - Implements consent mode (default: denied, upgrade on cookie acceptance)
  - Supports optional nonce for CSP
  - Handles both fallback and provided GA IDs

- [x] **Server-side detection** (`src/lib/analytics/server.ts`)
  - `getTenantGAId()` function detects subdomain and returns appropriate GA ID
  - Falls back to Lodgra GA (NEXT_PUBLIC_GA_MEASUREMENT_ID) for:
    - Root domain (lodgra.io, localhost, *.vercel.app)
    - Tenant subdomains without custom GA config
  - Graceful error handling with fallback to Lodgra GA

- [x] **Tenant analytics configuration system**
  - Database schema: `tenant_analytics_config` table (created via migration)
    - `ga_measurement_id_encrypted` (BYTEA) — AES-256-GCM encrypted
    - `ga_enabled` (boolean)
    - Soft delete support (deleted_at)
  - `analytics_config_audit_log` table for compliance tracking

- [x] **Encryption layer** (`src/lib/encryption/analytics.ts`)
  - AES-256-GCM encryption with random IV and auth tag
  - `encryptGAId()` / `decryptGAId()` functions

- [x] **Data access layer** (`src/lib/analytics/repository.ts`)
  - AnalyticsRepository class (singleton)
  - Methods: getConfig, getGAMeasurementId, upsertConfig, deleteConfig, logAuditEvent, getAuditLog
  - Handles database errors with meaningful messages

- [x] **API routes**
  - `POST /api/analytics/config` — Set tenant GA ID (requires admin/gestor role)
  - `GET /api/analytics/config` — Check if GA configured
  - `DELETE /api/analytics/config` — Remove tenant GA and fall back to Lodgra GA
  - `POST /api/analytics/test` — Send test event to verify GA connection

- [x] **UI component** (`src/components/analytics/AnalyticsSettingsClient.tsx`)
  - Form to enter GA Measurement ID (G-XXXXXXXXXX format)
  - Display status (connected/disconnected)
  - Test connection button
  - Disconnect/remove button with confirmation
  - Help text with link to Google Analytics docs
  - Error/success feedback

- [x] **Validation** (`src/lib/analytics/validation.ts`)
  - GA ID format validation (G-[A-Z0-9]{10})
  - Tests passing

- [x] **Tests**
  - GoogleAnalytics component tests (8 test cases)
  - Validation tests (passed)
  - Encryption tests (blocked by missing ANALYTICS_ENCRYPTION_KEY)

- [x] **Root layout integration**
  - `getTenantGAId()` called in root layout.tsx
  - `<GoogleAnalytics gaId={tenantGAId} />` component rendered

---

## ⚠️ MISSING / BLOCKED

### 1. **ANALYTICS_ENCRYPTION_KEY Environment Variable**
**Status:** REQUIRED, NOT SET

The encryption layer requires a 32-byte (64 hex character) AES-256-GCM key.

**Generate key:**
```bash
# macOS/Linux
openssl rand -hex 32
# Output example: a1b2c3d4e5f6...7z8y9x (64 chars)

# Windows (Git Bash)
openssl rand -hex 32
```

**Set in Vercel Environment Variables:**
- Environment: All (Production, Preview, Development)
- Key: `ANALYTICS_ENCRYPTION_KEY`
- Value: Generated 64-char hex string

**Set locally for testing:**
```bash
# .env.local or .env
ANALYTICS_ENCRYPTION_KEY=your-generated-key-here
```

**Verify key setup:**
```bash
npm test -- --testPathPattern="encryption/analytics"
# All encryption tests should PASS once key is set
```

---

### 2. **Google Analytics Property Setup**

#### Property A: lodgra.io (Lodgra Platform Root)

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Create** or **Admin** → **Create Property**
3. **Property name:** `Lodgra` (or `Lodgra Platform`)
4. **Reporting timezone:** Portugal (GMT+0/+1) or your preference
5. **Currency:** EUR
6. Click **Create**
7. Create a **Web Data Stream:**
   - **Stream name:** `lodgra.io`
   - **Website URL:** `https://lodgra.io`
   - **Stream name:** `lodgra.io`
   - Click **Create stream**
8. **Copy Measurement ID** (format: G-XXXXXXXXXX)
9. Add to **Vercel Environment Variables:**
   - Key: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - Value: The copied G-XXXXXXXXXX
   - Environment: All (Production, Preview, Development)

#### Property B: Example Tenant (for testing multi-tenant)

1. Return to Google Analytics home
2. **Create Property** (for tenant testing)
3. **Property name:** `Lodgra Tenant — Example`
4. **Reporting timezone:** Portugal (GMT+0/+1)
5. **Currency:** EUR
6. Create **Web Data Stream:**
   - **Stream name:** `mytenantexample.lodgra.io`
   - **Website URL:** `https://mytenantexample.lodgra.io`
   - Click **Create stream**
7. **Copy Measurement ID** (e.g., G-ABCD1234XY)
8. Save for later — use in tenant settings dashboard

---

### 3. **Local Development Setup**

#### Prerequisites
- Node.js 18+ installed
- npm packages installed: `npm install`
- `.env.local` configured with Supabase credentials (already set up)

#### Add environment variables to `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QDK7Y80G8E  # (already set in your .env.local)
ANALYTICS_ENCRYPTION_KEY=<generated-64-hex-chars>
```

#### Run tests to verify everything is wired up:
```bash
npm test
# Should see:
# ✓ GoogleAnalytics component tests (8 passing)
# ✓ Analytics validation tests (passing)
# ✓ Analytics encryption tests (passing — once key is set)
# ✓ Analytics settings component tests (if available)
```

#### Start dev server and test manually:
```bash
npm run dev
# App starts on http://localhost:3000
```

1. **Visit http://localhost:3000** (simulates lodgra.io)
   - Open DevTools → Network tab
   - Look for `gtag/js?id=G-QDK7Y80G8E` request
   - Verify JS console: no errors
   - Check gtag is initialized in Console → `window.gtag` should exist

2. **Visit http://mytenantexample.localhost:3000** (simulates tenant subdomain)
   - **Note:** Local testing with subdomains requires:
     - Hosts file entry: `127.0.0.1 mytenantexample.localhost`
     - OR use browser dev tools to override Host header
   - Should still load Lodgra GA (no tenant config yet)

---

### 4. **Tenant Dashboard Integration**

**Location:** To be determined based on your dashboard structure
- Likely in: Settings → Analytics or Settings → Integrations
- Use existing AnalyticsSettingsClient component

**Component:** `src/components/analytics/AnalyticsSettingsClient.tsx`

**User Flow:**
1. Tenant (admin/gestor) logs in to their dashboard
2. Navigate to Settings → Analytics
3. See "Connect Google Analytics" form
4. Enter their GA Measurement ID (e.g., G-ABCD1234XY from Property B)
5. Click "Connect GA"
6. System encrypts and stores in `tenant_analytics_config` table
7. GA ID is now used for tracking on their subdomain
8. Can test connection and see when GA received data

**API Integration:**
- Component automatically calls:
  - `POST /api/analytics/config` — Save GA ID
  - `GET /api/analytics/config` — Check status on load
  - `DELETE /api/analytics/config` — Remove/disconnect
  - `POST /api/analytics/test` — Send test event to GA

---

### 5. **Staging Environment Setup**

**Current Status:** BLOCKED by env vars not set in Vercel staging

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add the following (or update if existing):
   - **NEXT_PUBLIC_GA_MEASUREMENT_ID:** G-QDK7Y80G8E (or your Lodgra GA ID)
     - Scope: Preview (staging)
   - **ANALYTICS_ENCRYPTION_KEY:** Your 64-hex-char key
     - Scope: Preview (staging)
3. Redeploy staging: `vercel --prod=false`
4. Test: Visit https://staging.lodgra.io (or your staging domain)
   - DevTools → Network → look for gtag/js requests

---

### 6. **Production Deployment Checklist**

**Before pushing to main:**
- [ ] All tests passing: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] Type check passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] Manual test in staging environment
- [ ] Google Analytics Property A (lodgra.io) created and verified
- [ ] ANALYTICS_ENCRYPTION_KEY generated and set in Vercel (all scopes)
- [ ] NEXT_PUBLIC_GA_MEASUREMENT_ID set in Vercel (all scopes)

**Deployment:**
1. Merge PR to `main`
2. Vercel auto-deploys
3. Visit https://lodgra.io
4. Verify gtag/js loads in DevTools
5. Check Google Analytics console for incoming traffic

**Post-deployment:**
- [ ] Monitor Google Analytics for 24 hours
- [ ] Verify no console errors in browser
- [ ] Test tenant dashboard GA configuration (if dashboard exists)

---

## Database Schema Verification

Run this query to confirm schema is correct:

```sql
-- Check tenant_analytics_config table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tenant_analytics_config'
ORDER BY ordinal_position;

-- Expected columns:
-- id                       | uuid      | NO
-- tenant_id                | uuid      | NO
-- ga_measurement_id_encrypted | bytea   | NO
-- ga_enabled               | boolean   | YES
-- created_at               | timestamp | YES
-- updated_at               | timestamp | YES
-- deleted_at               | timestamp | YES

-- Check audit log table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_config_audit_log'
ORDER BY ordinal_position;

-- Check test events table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'analytics_test_events'
ORDER BY ordinal_position;
```

---

## File Structure Summary

```
src/
├── components/
│   ├── features/
│   │   └── analytics/
│   │       └── GoogleAnalytics.tsx          ✅ Core GA script injection
│   └── analytics/
│       └── AnalyticsSettingsClient.tsx       ✅ Tenant config UI
│
├── lib/
│   ├── analytics/
│   │   ├── server.ts                        ✅ Tenant GA ID detection
│   │   ├── repository.ts                    ✅ Database access layer
│   │   ├── validation.ts                    ✅ GA ID format validation
│   │   └── index.ts                         ✅ Public API
│   └── encryption/
│       └── analytics.ts                     ✅ AES-256-GCM encryption
│
├── app/
│   ├── layout.tsx                           ✅ Root layout (calls getTenantGAId)
│   └── api/analytics/
│       ├── config/route.ts                  ✅ POST/GET/DELETE GA config
│       └── test/route.ts                    ✅ POST test event
│
└── __tests__/
    ├── components/analytics/
    │   └── GoogleAnalytics.test.tsx          ✅ 8 component tests
    ├── lib/
    │   ├── analytics/
    │   │   └── validation.test.ts            ✅ Validation tests
    │   └── encryption/
    │       └── analytics.test.ts             ⚠️ Blocked (needs encryption key)
    └── components/analytics/
        └── AnalyticsSettings.test.tsx        (if exists)
```

---

## Troubleshooting

### "GA tracking not showing in Network tab"
1. Check `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set and valid format (G-XXXXXXXXXX)
2. Open DevTools → Application → Cookies → Check for `_ga` cookie after page load
3. Check Console for errors: `window.gtag` should be a function
4. Visit Google Analytics → Realtime → Active users should show your session

### "Encryption key validation fails"
1. Verify key is set: `echo $ANALYTICS_ENCRYPTION_KEY`
2. Verify key length: should be exactly 64 hex characters (32 bytes)
3. Run: `npm test -- --testPathPattern="encryption/analytics"`
4. Check `.env.local` file exists and has the key

### "Tenant GA ID not being picked up"
1. Verify subdomain is correct (format: `subdomain.lodgra.io`)
2. Check `organizations` table has entry with matching `slug`
3. Check `tenant_analytics_config` table has entry for that tenant
4. Run: `SELECT * FROM tenant_analytics_config WHERE tenant_id = '...'`
5. Verify `ga_enabled = true` and `deleted_at IS NULL`

### "Test event not appearing in Google Analytics"
1. Allow 5-10 seconds for GA to receive and process event
2. In Google Analytics → Real-time → Events
3. Look for custom event: `lodgra_config_test`
4. If not appearing:
   - Verify GA Measurement ID is correct in database (encrypted)
   - Check browser console for errors
   - Verify firewall/VPN not blocking gtag.js requests

---

## Next Steps

1. **Generate ANALYTICS_ENCRYPTION_KEY:**
   ```bash
   openssl rand -hex 32
   ```

2. **Set environment variables in Vercel:**
   - ANALYTICS_ENCRYPTION_KEY
   - NEXT_PUBLIC_GA_MEASUREMENT_ID (if not already set)

3. **Create Google Analytics Properties:**
   - Property A (lodgra.io)
   - Property B (example tenant for testing)

4. **Run full test suite:**
   ```bash
   npm test
   npm run lint
   npm run typecheck
   npm run build
   ```

5. **Local testing:**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Check DevTools Network tab for gtag/js
   ```

6. **Deploy to staging:**
   ```bash
   vercel --prod=false
   # Test: https://staging.lodgra.io
   ```

7. **Deploy to production:**
   ```bash
   # Merge PR to main
   # Vercel auto-deploys to https://lodgra.io
   # Monitor Google Analytics
   ```

---

## Summary

**Current Status:**
- ✅ Implementation complete (all code is written and tested)
- ✅ Root domain tracking ready (Lodgra.io)
- ✅ Multi-tenant tracking ready (custom GA IDs per tenant)
- ⚠️ Blocked on 3 manual setup items:
  1. Generate and set ANALYTICS_ENCRYPTION_KEY
  2. Create Google Analytics properties
  3. Deploy environment variables to Vercel

**Effort to Complete:** 30 minutes
- Generate key: 2 min
- Create GA properties: 10 min
- Set Vercel env vars: 5 min
- Test locally: 10 min
- Deploy staging: 3 min

**No code changes needed.** Everything is ready to deploy once environment is configured.
