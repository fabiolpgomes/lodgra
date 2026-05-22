# Multi-Tenant Testing Guide

**Story:** 31.1 — Configure Wildcard DNS + Vercel for Multi-Tenant Subdomains  
**Date:** 2026-05-22  
**Status:** QA Ready  
**Test Environment:** Production + Staging

---

## 📋 **Prerequisites**

Before testing, confirm:

- [ ] DNS wildcard `*.lodgra.io` is configured and propagated globally
- [ ] Vercel domain `*.lodgra.io` is added with "Valid Configuration" status
- [ ] SSL wildcard certificate is issued (Vercel shows "Provisioned")
- [ ] Test organizations exist in database (see "Setup Test Data" below)

---

## 🗄️ **Setup Test Data**

### Create Test Organizations

Execute in Supabase SQL editor:

```sql
-- Create test organizations if they don't exist
INSERT INTO organizations (slug, name, created_at)
VALUES
  ('test-qa', 'QA Test Organization', now()),
  ('test-demo', 'Demo Organization', now()),
  ('test-staging', 'Staging Test Org', now())
ON CONFLICT (slug) DO NOTHING;

-- Verify creation
SELECT id, slug, name FROM organizations WHERE slug LIKE 'test-%';
```

### Add Test Properties (Optional)

If you want to test with actual properties:

```sql
-- Get org ID
SELECT id FROM organizations WHERE slug = 'test-qa' LIMIT 1;
-- Copy the ID, then:

-- Insert test properties
INSERT INTO properties (organization_id, name, slug, city, country, base_price, currency, is_public, bedrooms, bathrooms, max_guests)
VALUES
  ('YOUR_ORG_ID', 'Test Property 1', 'test-prop-1', 'Lisbon', 'Portugal', 100, 'EUR', true, 2, 1, 4),
  ('YOUR_ORG_ID', 'Test Property 2', 'test-prop-2', 'Porto', 'Portugal', 150, 'EUR', true, 3, 2, 6);
```

---

## 🧪 **Test Cases**

### TC1: Subdomain Routing — Happy Path

**Objective:** Verify that requests to `test-qa.lodgra.io/booking` route correctly and show org-specific properties.

**Steps:**

1. Open browser: `https://test-qa.lodgra.io/booking`
2. Wait for page to load

**Expected Result:**

- ✅ Page loads without errors
- ✅ URL shows: `test-qa.lodgra.io/booking`
- ✅ If properties exist for org, they are displayed
- ✅ No generic "All Properties" page

**How to Verify:**

1. Open **DevTools** (F12)
2. Go to **Console** tab
3. You should see NO errors about "Organization not found"
4. If you inspect Network tab, the `/api/properties?orgSlug=test-qa` request should return 200

**Pass/Fail:** _______________

---

### TC2: Subdomain Routing — Non-Existent Org

**Objective:** Verify that requests to non-existent org subdomains show clear error.

**Steps:**

1. Open browser: `https://nonexistent-org-12345.lodgra.io/booking`
2. Wait for page to load

**Expected Result:**

- ✅ Page loads (does NOT hang or timeout)
- ✅ Shows clear error message: "Organization not found"
- ✅ No 404 or blank page
- ✅ User can navigate back or go to root domain

**How to Verify:**

1. Check console for errors
2. Network tab should show `/api/properties?orgSlug=nonexistent...` returning 404
3. Error page shows Lodgra branding (not blank)

**Pass/Fail:** _______________

---

### TC3: Root Domain — Backward Compatibility

**Objective:** Verify that root domain `lodgra.io/booking` still works and shows ALL properties (no org filter).

**Steps:**

1. Open browser: `https://lodgra.io/booking`
2. Wait for page to load

**Expected Result:**

- ✅ Page loads without errors
- ✅ Shows properties from ALL organizations
- ✅ No org-specific filtering applied
- ✅ Booking flow works normally

**How to Verify:**

1. Scroll through properties — should see from multiple organizations
2. Network tab: `/api/properties` request has NO `orgSlug` parameter
3. Booking flow completes without errors

**Pass/Fail:** _______________

---

### TC4: SSL/TLS Certificate Validation

**Objective:** Verify that HTTPS works for all subdomains with valid certificate.

**Steps:**

1. Open terminal:
```bash
curl -I https://test-qa.lodgra.io/booking
curl -I https://test-demo.lodgra.io/booking
curl -I https://test-staging.lodgra.io/booking
```

2. Check for SSL warnings in browser:
   - Open `https://test-qa.lodgra.io/booking` in browser
   - Look for lock icon (🔒) in address bar
   - Click lock → Certificate info

**Expected Result:**

- ✅ All curl requests return `HTTP/2 200` (no SSL errors)
- ✅ Browser shows 🔒 lock icon (secure connection)
- ✅ Certificate Subject: `CN=*.lodgra.io`
- ✅ Certificate Issuer: Let's Encrypt
- ✅ No certificate warnings or errors

**How to Verify:**

1. Terminal: `curl -I https://test-qa.lodgra.io/booking` should show `HTTP/2 200`
2. Browser DevTools → Security tab shows certificate details
3. No mixed content warnings (all assets HTTPS)

**Pass/Fail:** _______________

---

### TC5: Rate Limiting Across Subdomains

**Objective:** Verify that rate limiting applies to requests across all subdomains equally.

**Steps:**

1. Rapid requests to one subdomain:
```bash
for i in {1..100}; do
  curl -s https://test-qa.lodgra.io/booking -o /dev/null &
done
wait
```

2. Check Vercel logs for rate limit hits

**Expected Result:**

- ✅ After ~50 requests, some return 429 (Too Many Requests)
- ✅ Rate limit applied consistently
- ✅ Other subdomains are also rate limited
- ✅ Rate limiting doesn't break the site permanently

**How to Verify:**

1. Check Vercel Dashboard → Logs
2. Filter for `429` status code
3. Verify that rate limits reset after waiting (usually 1 hour)

**Pass/Fail:** _______________

---

### TC6: CSRF Protection Across Subdomains

**Objective:** Verify that CSRF tokens work correctly for subdomains.

**Steps:**

1. Open `https://test-qa.lodgra.io/booking` in browser
2. Open DevTools → Application tab → Cookies
3. Look for CSRF token cookie (usually starts with `csrf-` or `__host-`)

4. Try to book a property:
   - Fill form
   - Submit booking
   - Verify request includes CSRF token

**Expected Result:**

- ✅ CSRF token is present in cookies
- ✅ CSRF token is included in booking form submission
- ✅ Booking is accepted (CSRF validation passes)
- ✅ No "Invalid CSRF token" errors

**How to Verify:**

1. DevTools → Network → Click booking POST request
2. Check headers: should include CSRF token
3. Request succeeds (200 OK or redirect to success page)

**Pass/Fail:** _______________

---

### TC7: Multiple Subdomains in Parallel

**Objective:** Verify that system handles multiple subdomain requests simultaneously.

**Steps:**

1. Open these URLs in separate browser tabs:
   - `https://test-qa.lodgra.io/booking`
   - `https://test-demo.lodgra.io/booking`
   - `https://test-staging.lodgra.io/booking`

2. Refresh all tabs simultaneously (Cmd+R or F5)

3. Check that each loads correct org data

**Expected Result:**

- ✅ All three pages load without interference
- ✅ Each shows correct organization properties
- ✅ No cross-contamination (test-qa doesn't show test-demo properties)
- ✅ No performance degradation with parallel requests

**How to Verify:**

1. Compare properties shown in each tab
2. Check Network tab for correct `orgSlug` in each request
3. No errors in console across any tab

**Pass/Fail:** _______________

---

### TC8: Subdomain with Query Parameters

**Objective:** Verify that query parameters work correctly with subdomains.

**Steps:**

1. Navigate to: `https://test-qa.lodgra.io/booking?location=Lisbon&priceMin=100&priceMax=200`
2. Verify filters are applied

**Expected Result:**

- ✅ Page loads with filters applied
- ✅ Only Lisbon properties show
- ✅ Only €100-200 price range shows
- ✅ Subdomain isolation still respected

**How to Verify:**

1. Check displayed properties match filters
2. Network tab: `/api/properties?orgSlug=test-qa&location=...` includes both org and filters

**Pass/Fail:** _______________

---

### TC9: Browser Back/Forward Navigation

**Objective:** Verify that browser history works correctly with subdomains.

**Steps:**

1. Navigate: `https://test-qa.lodgra.io/booking`
2. Click on a property (if available)
3. Click browser **Back** button
4. Should return to booking page
5. Click browser **Forward** button

**Expected Result:**

- ✅ Back button returns to booking page
- ✅ Forward button returns to property detail
- ✅ Organization context maintained
- ✅ No errors during navigation

**Pass/Fail:** _______________

---

### TC10: Subdomain Case Sensitivity

**Objective:** Verify that subdomain matching is case-insensitive (if configured).

**Steps:**

1. Try accessing: `https://TEST-QA.lodgra.io/booking`
2. Try accessing: `https://Test-Qa.lodgra.io/booking`
3. Both should resolve to same org

**Expected Result:**

- ✅ Both URLs work (or fail consistently)
- ✅ Subdomain handling is case-insensitive OR clearly documented as case-sensitive

**Pass/Fail:** _______________

---

## 📊 **Performance Benchmarks**

| Metric | Target | Actual | Pass |
|--------|--------|--------|------|
| Page load time (subdomain) | < 2s | _____ | ☐ |
| API response time | < 500ms | _____ | ☐ |
| SSL handshake time | < 100ms | _____ | ☐ |
| No increase vs root domain | ±0% | _____ | ☐ |

---

## 🔍 **Browser Console Check**

**In DevTools Console, verify:**

- [ ] No JavaScript errors
- [ ] No CSP (Content Security Policy) warnings
- [ ] No CORS errors
- [ ] No Sentry errors (or only expected ones)

```javascript
// Paste in console to check
console.log('Current org:', document.location.hostname);
console.error.length > 0 ? console.warn('Errors found') : console.log('No errors ✓');
```

---

## 🔐 **Security Checks**

### Subdomain Isolation

- [ ] Cannot access `test-qa` org data from `test-demo` subdomain
- [ ] Session cookies are scoped correctly
- [ ] Authorization headers not leaked across subdomains

### Data Leakage

- [ ] Error messages don't expose org IDs or internal data
- [ ] API responses are filtered by organization
- [ ] Database queries use proper WHERE clauses with org_id

---

## 📝 **Bugs Found**

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| B1 | | | ☐ New ☐ Fixed ☐ Skipped |
| B2 | | | ☐ New ☐ Fixed ☐ Skipped |
| B3 | | | ☐ New ☐ Fixed ☐ Skipped |

---

## ✅ **QA Sign-Off**

| Field | Value |
|-------|-------|
| **Tester Name** | _________________ |
| **Test Date** | _________________ |
| **Environment** | ☐ Staging ☐ Production ☐ Local |
| **Browser/Version** | _________________ |
| **Overall Result** | ☐ PASS ☐ FAIL ☐ CONCERNS |
| **Notes** | _________________ |

---

## 📞 **Rollback Procedure**

If critical issues found:

1. **Remove wildcard from Vercel:**
   - Vercel Dashboard → Domains → Remove `*.lodgra.io`
   - Takes ~2 minutes

2. **Remove wildcard from DNS:**
   - Registrar → Remove CNAME record `*.lodgra.io`
   - Takes ~5-30 minutes to propagate

3. **Result:** System reverts to `lodgra.io/booking?orgSlug=X`
   - No code changes needed
   - Fully backward compatible

---

**End of QA Test Plan**

*Generated: 2026-05-22 by @devops (Gage)*
