# Google Analytics 4 (GA4) Setup Guide

**Purpose:** Track events, conversions, user behavior

## Quick Start (5-10 minutes)

### Step 1: Create GA4 Property
1. Go to https://analytics.google.com
2. Click "Create" → "Property"
3. Property name: `lodgra.io SEO Tracking`
4. Reporting timezone: Portugal (UTC+0)
5. Currency: EUR

### Step 2: Get Measurement ID
1. After property created: Copy **Measurement ID** (format: G-XXXXXXXXXX)
2. Store in: `.env` → `GA4_MEASUREMENT_ID=G-XXXXXXXXXX`

### Step 3: Deploy Tracking Code
**Option A: Via Google Tag Manager (GTM)**
- Add GTM container ID to website
- GTM automatically deploys GA4

**Option B: Direct gtag.js**
Add to `<head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Step 4: Configure Events
In GA4 Admin → "Events":
- ✅ Automatically captured: page_view, scroll, click
- ✅ Configure custom events:
  - `goal_contact` (contact form submit)
  - `goal_inquiry` (property inquiry)
  - `goal_newsletter` (newsletter signup)

### Step 5: Verify Data Flow
1. Visit www.lodgra.io in new tab
2. Open GA4 → Real-time dashboard
3. Expected: page_view event appears within 30 seconds
4. Click on page
5. Expected: click event appears

### Step 6: Baseline Capture
When data flowing:
- [ ] Measurement ID: G-__________
- [ ] Events firing: YES / NO
- [ ] Data visible in Realtime: YES / NO
- [ ] 7-day avg sessions: _____
- [ ] 7-day avg bounce rate: _____%

