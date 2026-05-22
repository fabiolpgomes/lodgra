# Story 31.1 — Implementation Checklist

**Story:** Configure Wildcard DNS + Vercel for Multi-Tenant Subdomains  
**Status:** Ready for Implementation  
**Timeline:** 1-2 days total  
**Assigned to:** @devops (Gage)  
**Last Updated:** 2026-05-22

---

## 📋 **Pre-Start Verification**

**Before you begin, confirm you have:**

- [ ] Access to domain registrar (where lodgra.io is registered)
  - Provider: _________________ (GoDaddy/Namecheap/Route53/Cloudflare/Other)
  - Account login: _________________
- [ ] Vercel project admin access
  - Logged in: `vercel auth status` ✓
- [ ] Current DNS records documented
  - Run: `dig lodgra.io +short` and save output
- [ ] Testing plan reviewed
  - Understand: Local testing → Staging → Production flow

**If ANY of these is missing, STOP and escalate to @architect.**

---

## ⏱️ **Timeline Estimate**

| Phase | Task | Est. Time | Notes |
|-------|------|-----------|-------|
| **1** | DNS Configuration | 10 min | Registrar UI, add wildcard record |
| **2** | DNS Propagation | 5-30 min | Wait for global DNS propagation |
| **3** | Vercel Configuration | 5 min | Add domain in Vercel Project Settings |
| **4** | SSL Provisioning | 5-10 min | Vercel auto-generates wildcard cert |
| **5** | Local Testing | 15 min | curl + browser testing |
| **6** | Production Validation | 10 min | Verify with real subdomains |
| **7** | QA Setup | 10 min | Create testing documentation |
| **TOTAL** | | **1-2 hours** | Plus waiting for DNS/SSL |

---

## 🔧 **PHASE 1: DNS Configuration (10 minutes)**

### Step 1a: Document Existing DNS Records

Before making changes, save all current DNS records:

```bash
# Run this and save output
dig lodgra.io ANY +short
dig www.lodgra.io ANY +short
dig api.lodgra.io ANY +short
dig mail.lodgra.io ANY +short

# Save output to: docs/dns/current-records-backup-2026-05-22.txt
```

**Current DNS Records (from output above):**
```
[Paste dig output here]
```

### Step 1b: Access Domain Registrar

1. Go to your domain registrar's DNS management:
   - **GoDaddy:** Domain → Manage → DNS
   - **Namecheap:** Domain → Manage → Advanced DNS
   - **Route53:** Hosted Zone → lodgra.io
   - **Cloudflare:** DNS tab

2. **Locate existing DNS records** — you should see:
   - `A` record for `lodgra.io` → Vercel IP
   - `CNAME` record for `www.lodgra.io` → Vercel domain
   - Possibly `MX` records (email)
   - Possibly `TXT` records (verification, SPF, DKIM)

### Step 1c: Add Wildcard DNS Record

**For GoDaddy / Namecheap (CNAME approach):**

1. Click "Add Record" (or "+")
2. **Type:** CNAME
3. **Name:** `*` (or `*.lodgra.io` depending on UI)
4. **Value:** Check Vercel docs for current CNAME target
   - Usually: `cname.vercel-dns.com` or similar
   - Or: Can point to same value as `www.lodgra.io` CNAME
5. **TTL:** 3600 (1 hour for testing, increase later to 86400)
6. Click "Save"

**For Route53 (A + Alias approach):**

1. Create new record:
   - **Name:** `*.lodgra.io`
   - **Type:** A
   - **Value:** Vercel IP (check AWS docs)
   - **TTL:** 300 (5 minutes for testing)
2. Or use Alias to same target as root domain

**For Cloudflare:**

1. DNS → Add record:
   - **Type:** CNAME
   - **Name:** `*`
   - **Target:** Vercel domain
   - **Proxy status:** DNS only (or Proxied depending on your setup)
2. Save

### Step 1d: Verify DNS Record Added

In registrar UI, you should see:

```
Type    Name           Value
-----   ----           -----
CNAME   *.lodgra.io    cname.vercel-dns.com
```

**✅ Checkpoint:** Screenshot registrar showing wildcard record added

---

## ⏳ **PHASE 2: DNS Propagation (5-30 minutes)**

### Step 2a: Wait for Propagation

DNS typically propagates globally in 5-30 minutes, but can take up to 2 hours.

```bash
# Check propagation status (run every 2 minutes)
nslookup test.lodgra.io
# or
dig test.lodgra.io +short

# Expected output: Should resolve to Vercel IP
# If not yet propagated: "NXDOMAIN" or no output
```

### Step 2b: Verify Multiple Regions

Check that DNS resolved in different regions:

```bash
# Google DNS
nslookup test.lodgra.io 8.8.8.8

# Cloudflare DNS
nslookup test.lodgra.io 1.1.1.1

# ISP DNS (your default)
nslookup test.lodgra.io
```

**✅ Checkpoint:** All three commands resolve `test.lodgra.io` to Vercel

---

## 🔐 **PHASE 3: Vercel Configuration (5 minutes)**

### Step 3a: Add Wildcard Domain in Vercel

1. Go to **Vercel Dashboard** → **Project Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `*.lodgra.io`
4. Click "Add"

Vercel will:
- Auto-detect your DNS records
- Show configuration status
- Generate wildcard SSL certificate

### Step 3b: Verify Configuration Status

In Vercel, you should see:

```
Domain: *.lodgra.io
Status: Valid Configuration ✓
SSL:    Provisioned ✓
```

If status shows "Invalid" or "Pending":
- Wait 5-10 minutes
- Refresh page
- If still pending, check DNS records in registrar (Step 1d)

**✅ Checkpoint:** Vercel shows "Valid Configuration" for `*.lodgra.io`

---

## 🎫 **PHASE 4: SSL Certificate Provisioning (5-10 minutes)**

### Step 4a: Verify SSL Certificate

In Vercel → Domains → `*.lodgra.io`:

```
Certificate Status: Issued ✓
Issuer:            Let's Encrypt
Subject:           CN=*.lodgra.io
Validity:          90 days
Auto-renewal:      Enabled ✓
```

### Step 4b: Test SSL in Terminal

```bash
# Test wildcard SSL certificate
curl -I https://test.lodgra.io

# Expected output:
# HTTP/2 200
# content-type: text/html
# date: ...
```

If you get SSL errors:
- Wait 10 more minutes (cert still being provisioned)
- Check that DNS is actually resolving (Phase 2)
- Refresh Vercel domain status

**✅ Checkpoint:** `curl -I https://test.lodgra.io` returns HTTP 200

---

## 🧪 **PHASE 5: Local Testing (15 minutes)**

### Step 5a: Update /etc/hosts (Local Testing)

Add test entries to your local hosts file:

**macOS/Linux:**
```bash
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 test.lodgra.io
127.0.0.1 example.lodgra.io
127.0.0.1 staging.lodgra.io
```

**Windows (Cmd as Admin):**
```
notepad C:\Windows\System32\drivers\etc\hosts

# Add these lines:
127.0.0.1 test.lodgra.io
127.0.0.1 example.lodgra.io
127.0.0.1 staging.lodgra.io
```

### Step 5b: Start Local Dev Server

```bash
npm run dev

# Should show:
# ▲ Next.js 14.x.x
# - ready started server on 0.0.0.0:3000
```

### Step 5c: Test Middleware Header Extraction

```bash
# Test that middleware correctly extracts subdomain
curl -H "Host: test.lodgra.io" http://localhost:3000/booking

# In response, look for header:
# x-org-slug: test
```

Or use browser DevTools:

1. Open browser: `http://test.lodgra.io:3000/booking`
2. Open DevTools → Network → click `/booking` request
3. Scroll to Response Headers → find `x-org-slug: test`

**✅ Checkpoint:** Header `x-org-slug: test` is present in response

### Step 5d: Test Org Lookup

For this test to work, you need an org with slug `test` in database.

**Option A: Create test org in Supabase**

```sql
INSERT INTO organizations (slug, name)
VALUES ('test', 'Test Organization');
```

**Option B: Test with existing org**

If you know an existing org slug (e.g., "pousada"), use that:

```bash
curl -H "Host: pousada.lodgra.io" http://localhost:3000/booking
# Should show: x-org-slug: pousada
```

**✅ Checkpoint:** Org lookup works (page loads with correct org data)

---

## 🌐 **PHASE 6: Production Validation (10 minutes)**

**⚠️ Only after DNS propagates globally (Phase 2) ⚠️**

### Step 6a: Test Real Subdomains (Production DNS)

```bash
# Test with real subdomains (using global DNS, not local hosts)
curl -I https://test.lodgra.io/booking

# Expected output:
# HTTP/2 200
# content-type: text/html
# x-org-slug: test
```

### Step 6b: Test in Browser

1. Open browser (incognito for clean cache): `https://test.lodgra.io/booking`
2. DevTools → Network tab
3. Refresh page
4. Check first request to `/booking`
5. Response Headers should contain: `x-org-slug: test`

### Step 6c: Test Non-Existent Org

```bash
# This org doesn't exist — should return 404 error
curl -I https://nonexistent.lodgra.io/booking

# Expected: HTTP 404 with message "Organization not found"
```

### Step 6d: Test Root Domain (Backward Compatibility)

```bash
# Root domain should still work (shows all properties)
curl -I https://lodgra.io/booking

# Expected: HTTP 200
# No x-org-slug header (or null)
```

**✅ Checkpoint:** All tests pass

---

## 📚 **PHASE 7: QA Documentation (10 minutes)**

### Step 7a: Create Testing Documentation

Create file: `docs/testing/MULTI-TENANT-TESTING.md`

Content template:

```markdown
# Multi-Tenant Testing Guide

## Prerequisites
- DNS wildcard `*.lodgra.io` configured
- Vercel domain `*.lodgra.io` added
- Test organizations created in Supabase

## Test Cases

### TC1: Subdomain Routing (Happy Path)
- URL: `test.lodgra.io/booking`
- Expected: Page loads, shows "Test Organization" properties
- Verify: Header contains `x-org-slug: test`

### TC2: Org Not Found
- URL: `nonexistent.lodgra.io/booking`
- Expected: 404 error, message "Organization not found"

### TC3: Root Domain (Backward Compatibility)
- URL: `lodgra.io/booking`
- Expected: All properties shown (no org filter)

### TC4: SSL Certificate
- URL: Any subdomain
- Expected: HTTPS works, no certificate warnings

### TC5: Rate Limiting
- Make 100+ requests to same subdomain
- Expected: Rate limiting applies correctly
```

### Step 7b: Create Test Org in Supabase (For QA)

For QA to test, ensure test organizations exist:

```sql
-- Insert test organizations
INSERT INTO organizations (slug, name) VALUES
  ('test-qa', 'QA Test Organization'),
  ('test-demo', 'Demo Organization')
ON CONFLICT (slug) DO NOTHING;
```

**✅ Checkpoint:** Documentation created + test orgs in database

---

## ✅ **Acceptance Criteria Validation**

Review Story 31.1 ACs:

- [ ] **AC1:** DNS wildcard `*.lodgra.io` points to Vercel
  - Verify: `dig *.lodgra.io +short` resolves
  
- [ ] **AC2:** Vercel domain configured
  - Verify: Vercel dashboard shows "Valid Configuration"
  
- [ ] **AC3:** Subdomain routing works
  - Verify: `test.lodgra.io/booking` loads page with `x-org-slug: test`
  
- [ ] **AC4:** Fallback for non-existent orgs
  - Verify: `nonexistent.lodgra.io/booking` shows 404 error
  
- [ ] **AC5:** Security validation
  - Verify: Rate limiting works across subdomains
  - Verify: CSRF protection active
  
- [ ] **AC6:** SSL certificate
  - Verify: `curl -I https://test.lodgra.io` shows valid SSL
  
- [ ] **AC7:** Testing documentation
  - Verify: `docs/testing/MULTI-TENANT-TESTING.md` created
  
- [ ] **AC8:** Monitoring
  - Verify: Vercel logs show subdomain requests

---

## 🚨 **Troubleshooting**

### DNS Not Resolving

```bash
# Check propagation status
dig @8.8.8.8 test.lodgra.io

# Still not resolving? Try:
1. Wait another 30 minutes
2. Check registrar DNS records again (Step 1d)
3. Verify CNAME value is correct
4. Clear local DNS cache (macOS: sudo dscacheutil -flushcache)
```

### SSL Certificate Not Issued

```bash
# In Vercel, check domain status
# If "Pending" for >15 min:
1. Refresh Vercel page
2. Check that DNS actually resolved (dig test.lodgra.io)
3. Remove domain from Vercel, wait 5 min, re-add
```

### Subdomain Not Reaching App

```bash
# Test local routing first
curl -H "Host: test.lodgra.io" http://localhost:3000/booking

# If local works but production doesn't:
1. Wait for DNS propagation
2. Check Vercel logs for errors
3. Verify certificate is issued
```

---

## 📝 **Sign-Off**

When all phases complete, update this checklist:

**Completed by:** _________________ (DevOps)  
**Date:** _________________  
**QA Verified by:** _________________ (QA)  
**Date:** _________________  

---

## 📋 **Rollback Procedure (If Needed)**

If anything breaks:

1. **Remove wildcard from registrar:**
   - Delete CNAME record `*.lodgra.io`
   - Takes ~5 min to propagate

2. **Remove from Vercel:**
   - Domains → Select `*.lodgra.io` → Remove
   - Takes ~2 min

3. **System reverts to:** `lodgra.io/booking?orgSlug=X`
   - No code changes, so fully backward compatible

---

**Ready to implement. Good luck! — Gage** ⚡
