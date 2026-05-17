# Google Search Console (GSC) Setup Guide

**Purpose:** Verify domain ownership, monitor indexation, track search performance

## Quick Start (5-10 minutes)

### Step 1: Create GSC Account
1. Go to https://search.google.com/search-console
2. Click "Start now" (or sign in with Google account)
3. Select property type: **URL prefix** (https://www.lodgra.io)
4. Enter: `https://www.lodgra.io`

### Step 2: Verify Domain Ownership
**Method: DNS TXT Record (Recommended)**

1. GSC shows verification code: `google-site-verification=XXXXXXXXXXXXX`
2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Add DNS TXT record:
   - **Name:** @ (or leave blank)
   - **Type:** TXT
   - **Value:** `google-site-verification=XXXXXXXXXXXXX`
4. Wait 5-30 minutes for DNS propagation
5. Return to GSC, click "Verify"
6. ✅ Success: "Verification successful"

### Step 3: Check Indexation
1. **Coverage Report:** Left menu → "Coverage"
2. Expected: ≥10 pages showing as "Indexed"

### Step 4: Submit Sitemap
1. **Sitemaps:** Left menu → "Sitemaps"
2. Enter: `https://www.lodgra.io/sitemap.xml`

### Step 5: Baseline Capture
When verification complete:
- [ ] Coverage: _____ pages indexed
- [ ] Core Web Vitals: Available? YES / NO
- [ ] Sitemap: Submitted? YES / NO

