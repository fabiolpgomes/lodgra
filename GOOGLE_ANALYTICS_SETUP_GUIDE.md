# Google Analytics Setup — Step-by-Step Implementation Guide

## Overview

This guide walks you through setting up Google Analytics tracking for Lodgra (both root domain and multi-tenant subdomains). The implementation is **complete and ready** — you only need to perform these **3 manual steps** in Google Console and Vercel.

**Time Estimate:** 30 minutes  
**Difficulty:** Easy (follow screenshots/links)  
**No coding required** ✅

---

## Step 1: Create Google Analytics Property A (lodgra.io)

This property tracks the root Lodgra platform at https://lodgra.io.

### 1.1 Sign in to Google Analytics
- Go to: https://analytics.google.com/
- Sign in with your Google account
- If you haven't created a Google Analytics account:
  - Click **Create account**
  - Enter account name: "Lodgra"
  - Accept Google Analytics Terms

### 1.2 Create a New Property
1. Click **Admin** (left sidebar, bottom)
2. Select your account on the left: "Lodgra" (or create if needed)
3. Click **Create** → **Create Property**
4. Fill in the form:
   ```
   Property name:        Lodgra (or "Lodgra Platform")
   Reporting timezone:   Portugal (or your preference)
   Currency:             EUR
   Business type:        Software/SaaS (or other)
   Company size:         Medium
   
   Choose your data:     Check all relevant boxes
   ```
5. Click **Create**

### 1.3 Create a Web Data Stream
1. After property creation, go to **Data Streams**
2. Click **Add stream** → **Web**
3. Fill in:
   ```
   Website URL:  https://lodgra.io
   Stream name:  lodgra.io
   ```
4. Click **Create stream**

### 1.4 Copy Your Measurement ID
1. You'll see a page with "Measurement ID" highlighted
2. Copy the ID (format: **G-XXXXXXXXXX**)
   - Example: `G-QDK7Y80G8E`
3. **Save this** — you'll need it in Step 3

### 1.5 Verify Setup
1. Go back to **Data Streams**
2. Click on your stream
3. Copy the full **Measurement ID** (G-XXXXXXXXXX)
4. Note: The ID must be exactly 12 characters (G- + 10 alphanumeric)

---

## Step 2: Create Google Analytics Property B (Example Tenant)

This property is for testing tenant-specific tracking. Create this so you can test the multi-tenant feature.

### 2.1 Create Second Property
1. Go to **Admin**
2. In the **Property** column (middle), click **Create**
3. Click **Create Property**
4. Fill in:
   ```
   Property name:        Lodgra Tenant — Example Hotel
   Reporting timezone:   Portugal
   Currency:             EUR
   ```
5. Click **Create**

### 2.2 Create Web Data Stream for Tenant
1. Go to **Data Streams**
2. Click **Add stream** → **Web**
3. Fill in:
   ```
   Website URL:  https://example-hotel.lodgra.io
   Stream name:  example-hotel.lodgra.io
   ```
4. Click **Create stream**

### 2.3 Copy Tenant Measurement ID
1. Copy the **Measurement ID** (format: G-XXXXXXXXXX)
   - Example: `G-ABCD1234XY`
2. **Save this** — you'll use it to test tenant configuration

### 2.4 Verify Both Properties Exist
Go back to **Admin** → Your account  
You should see:
- ✓ Property A: "Lodgra" with ID G-QDK7Y80G8E
- ✓ Property B: "Lodgra Tenant — Example Hotel" with ID G-ABCD1234XY

---

## Step 3: Set Environment Variables in Vercel

Now add the Measurement IDs to Vercel so the app can use them.

### 3.1 Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select your "lodgra" project

### 3.2 Open Settings → Environment Variables
1. Click **Settings** (top navigation)
2. Click **Environment Variables** (left sidebar)
3. You should see existing variables (Supabase, Stripe, etc.)

### 3.3 Add NEXT_PUBLIC_GA_MEASUREMENT_ID
1. Click **Add New**
2. Fill in:
   ```
   Name:   NEXT_PUBLIC_GA_MEASUREMENT_ID
   Value:  G-QDK7Y80G8E    (your Lodgra Property A ID)
   Scope:  ◉ All (Production, Preview, Development)
   ```
3. Click **Save**

**Note:** If this variable already exists (check your .env.local), you can skip this step.

### 3.4 Add ANALYTICS_ENCRYPTION_KEY
1. Click **Add New**
2. Fill in:
   ```
   Name:   ANALYTICS_ENCRYPTION_KEY
   Value:  cabd41177e9b5a373385886ae933c79e32cf81d1067ce51a9532a7995dde468c
   Scope:  ◉ All (Production, Preview, Development)
   ```
3. Click **Save**

**Important:** This is your encryption key for tenant GA IDs. Keep it secure. If you want to generate your own key instead:
```bash
openssl rand -hex 32
# Copy the output and use instead of the provided key
```

### 3.5 Verify Variables are Set
1. Scroll down to **Environment Variables** list
2. You should see both:
   - ✓ NEXT_PUBLIC_GA_MEASUREMENT_ID = G-QDK7Y80G8E
   - ✓ ANALYTICS_ENCRYPTION_KEY = (hidden)

---

## Step 4: Deploy and Test

### 4.1 Redeploy Your App (Optional)
If you want to force a deployment with the new environment variables:

```bash
vercel redeploy
# or
vercel deploy --prod
```

Vercel might redeploy automatically. Check your Deployments page.

### 4.2 Test on Staging (Recommended)
```bash
vercel --prod=false
# Deploys to preview environment
```

### 4.3 Verify GA is Loading
1. Visit your deployed site (production or staging)
2. Open browser **DevTools** (F12 or Cmd+Option+I)
3. Go to **Network** tab
4. **Refresh the page**
5. Filter for **"gtag"** in the Network tab
6. You should see:
   ```
   gtag/js?id=G-QDK7Y80G8E    Status: 200
   ```
   ✅ If you see this, GA is loading correctly!

### 4.4 Check Google Analytics Real-Time
1. Go to your Lodgra property in Google Analytics
2. In the left sidebar, click **Real-time** → **Overview**
3. **Refresh your website** in another tab (the one you deployed)
4. Within 5-10 seconds, you should see:
   ```
   Active users: 1
   Events: [page_view, session_start]
   ```
   ✅ If you see this, tracking is working!

---

## Step 5: Test Tenant Configuration (Optional)

This step tests the multi-tenant feature with your example tenant property.

### 5.1 Access Tenant Dashboard
Where you normally configure tenant settings (e.g., Settings → Analytics):
- Location: To be determined based on your dashboard
- You should find an "Analytics Settings" or "Integrations" section

### 5.2 Connect Tenant GA
1. Click **Connect Google Analytics** (or similar button)
2. Paste the **Tenant Measurement ID** you copied earlier:
   ```
   G-ABCD1234XY
   ```
3. Click **Connect** or **Save**
4. You should see:
   ```
   ✓ Connected
   GA Measurement ID: G-●●●●●●●●●●
   ```

### 5.3 Test Tenant Tracking
1. Visit the tenant's subdomain: `https://example-hotel.lodgra.io`
2. Open **DevTools** → **Network** → **Filter: "gtag"**
3. You should see:
   ```
   gtag/js?id=G-ABCD1234XY    Status: 200
   ```
   ✅ Note the different GA ID! (custom tenant ID)

### 5.4 Verify in Tenant's GA Property
1. Go to your "Lodgra Tenant — Example Hotel" property in Google Analytics
2. Go to **Real-time** → **Overview**
3. Visit your tenant's site in another tab
4. Within 5-10 seconds, you should see active users
   ✅ Data flowing to tenant's property, not Lodgra's!

---

## Troubleshooting

### Issue: "No gtag requests in Network tab"

**Check 1:** Is the page fully loaded?
- Refresh the page
- Wait 3-5 seconds

**Check 2:** Are you on the right URL?
- Root domain: https://lodgra.io (or your staging domain)
- Tenant domain: https://something.lodgra.io

**Check 3:** Is the environment variable set?
```bash
# In Vercel Settings → Environment Variables
# Verify NEXT_PUBLIC_GA_MEASUREMENT_ID is set and shows G-XXXXXXXXXX
```

**Check 4:** Check browser console for errors
- Open DevTools → **Console**
- Look for red error messages
- Common error: "gtag.js 404 Not Found" = wrong GA ID

---

### Issue: "Google Analytics shows 0 active users"

**Check 1:** Did you wait long enough?
- GA Real-time can take 5-10 seconds to show data
- Wait, refresh, then check again

**Check 2:** Is GA properly initialized?
- In DevTools **Console**, run:
  ```javascript
  window.gtag
  // Should output: ƒ function() { ... }
  // If undefined, GA script didn't load
  ```

**Check 3:** Are cookies enabled?
- GA requires cookies to be enabled
- Check DevTools → **Application** → **Cookies**
- You should see `_ga` cookie after page load

**Check 4:** Is your GA account receiving traffic from other sites?
- Go to **Real-time** → **Traffic source**
- Verify your domain appears
- If you see `(direct)` but not your domain, check domain filter

---

### Issue: "Tenant's custom GA ID not being used"

**Check 1:** Verify tenant config was saved
```bash
# In your database, run:
SELECT * FROM tenant_analytics_config WHERE tenant_id = '...';
# Should return a row with ga_enabled = true
```

**Check 2:** Check that encryption key is set
- The app needs ANALYTICS_ENCRYPTION_KEY to decrypt the GA ID
- Verify it's in Vercel Environment Variables

**Check 3:** Check that tenant's subdomain is correct
- Expected format: `subdomain.lodgra.io`
- In database: `organizations.slug = 'subdomain'`
- URL must match exactly

---

## Deployment Checklist

Before you consider GA setup complete:

- [ ] Google Analytics Property A created (Lodgra)
- [ ] Google Analytics Property B created (Example tenant)
- [ ] NEXT_PUBLIC_GA_MEASUREMENT_ID set in Vercel
- [ ] ANALYTICS_ENCRYPTION_KEY set in Vercel
- [ ] App deployed to staging or production
- [ ] gtag/js loads in DevTools Network tab
- [ ] Google Analytics shows active users in Real-time
- [ ] Tenant configuration tested (optional but recommended)

---

## Next Steps (After Setup)

1. **Monitor Google Analytics for 24 hours**
   - Check Real-time → Overview
   - Look for incoming traffic
   - Verify page views are accurate

2. **Configure GA Properties as Needed**
   - Add filters (exclude internal IPs, etc.)
   - Set up goals/conversions
   - Configure user properties
   - Create custom reports

3. **Train team members**
   - Show them where to view analytics
   - Explain tenant GA configuration process
   - Document any custom tracking events

4. **Set up alerts (Optional)**
   - Create alerts for traffic anomalies
   - Set up email reports
   - Configure API integrations

---

## Support Resources

**Google Analytics Help:**
- Setup Guide: https://support.google.com/analytics/answer/12270356
- Measurement ID: https://support.google.com/analytics/answer/9539570
- Troubleshooting: https://support.google.com/analytics/answer/2614430

**Lodgra Documentation:**
- See: `GOOGLE_ANALYTICS_IMPLEMENTATION.md` (full technical guide)
- See: `GOOGLE_ANALYTICS_VERIFICATION.md` (testing & verification)

---

## Summary

**What you did:**
1. ✅ Created 2 Google Analytics properties
2. ✅ Set 2 environment variables in Vercel
3. ✅ Deployed and tested

**What the system does now:**
- ✅ Lodgra.io tracks to Property A
- ✅ Each tenant can configure custom GA ID
- ✅ Tenant subdomains track to their custom property (if configured)
- ✅ Falls back to Lodgra GA if tenant doesn't configure
- ✅ GA IDs encrypted in database
- ✅ All changes audited

**Total setup time:** 30 minutes  
**Code changes needed:** 0 (everything pre-built)  
**Ongoing maintenance:** Minimal (configure tenants as needed)

---

## Questions or Issues?

Refer to the full technical documentation:
- **Implementation details:** `GOOGLE_ANALYTICS_IMPLEMENTATION.md`
- **Testing & verification:** `GOOGLE_ANALYTICS_VERIFICATION.md`
- **Database schema:** See Supabase migrations (2026-06-03)

All code is tested and production-ready. Once you complete the 3 manual steps above, GA tracking will be fully operational!
