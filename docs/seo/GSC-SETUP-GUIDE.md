# Google Search Console Setup — Task 1.6

**Date:** May 21, 2026  
**Status:** 🟢 READY FOR IMPLEMENTATION  
**Time Estimate:** 30-45 minutes  

---

## 📋 Pre-Setup Checklist

Before you start, verify:

- [ ] You have a Google Account
- [ ] Sitemap is accessible at: https://lodgra.io/sitemap.xml ✅
- [ ] robots.txt is accessible at: https://lodgra.io/robots.txt ✅
- [ ] Homepage loads without errors ✅
- [ ] You have access to domain DNS (for verification)

---

## 🚀 Step-by-Step Setup

### **Step 1: Add Property to GSC**

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **"Add Property"**
3. Select **"URL prefix"** (not Domain property)
4. Enter: `https://lodgra.io`
5. Click **"Continue"**

**Expected Time:** 2 minutes

---

### **Step 2: Verify Domain Ownership**

Choose ONE verification method:

#### **Option A: HTML File Upload** (RECOMMENDED)
1. Download the HTML verification file
2. Upload to `/public/google-[verification-code].html`
3. Click **"Verify"**
4. Wait for confirmation (~1 minute)

#### **Option B: DNS TXT Record**
1. Copy the DNS TXT record
2. Add to domain DNS settings (e.g., Vercel DNS, Route53, Cloudflare)
3. Click **"Verify"**
4. Wait for DNS propagation (~1-5 minutes)

#### **Option C: Google Analytics** (if already connected)
1. GSC can verify via Analytics
2. Click **"Verify"**

**⏱️ Choose fastest available (usually HTML file)**

**Expected Time:** 5-10 minutes

---

### **Step 3: Submit Sitemap**

1. In GSC, go to **"Sitemaps"** (left sidebar)
2. Click **"Add/Test Sitemap"**
3. Enter: `https://lodgra.io/sitemap.xml`
4. Click **"Submit"**

**Expected Response:**
- "Sitemap submitted successfully"
- Status shows "Pending" → "Success" after processing (~10 minutes)

**Expected Time:** 2 minutes

---

### **Step 4: Request Indexing for Top Pages**

1. Go to **"URL Inspection"** (search bar at top)
2. Enter each URL:
   - `https://lodgra.io/`
   - `https://lodgra.io/login`
   - `https://lodgra.io/register`
   - `https://lodgra.io/terms`
   - `https://lodgra.io/privacy`

3. For each URL:
   - If shows "URL is not on Google" → Click **"Request Indexing"**
   - If shows "URL is on Google" → Click **"Request Indexing"** (refresh crawl)

**Expected Time:** 5 minutes

---

### **Step 5: Setup Monitoring & Alerts**

1. Go to **"Settings"** (left sidebar)
2. Click **"Users and permissions"**
3. Add email: `fabiolpgomes@gmail.com`
4. Set role: **"Owner"** (to receive alerts)

**Email Alerts to Enable:**
1. Go to **"Settings"** → **"Email preferences"**
2. Enable:
   - [ ] Critical issues with your site
   - [ ] Sitemaps
   - [ ] Coverage
   - [ ] Mobile usability

**Expected Time:** 5 minutes

---

### **Step 6: Verify Meta Tags & Robots**

1. Go to **"Coverage"** (left sidebar)
2. Check for errors/warnings
3. If any errors:
   - "Excluded by robots.txt" = Check robots.ts (should be fixed ✅)
   - "Blocked by robots.txt" = Recrawl (wait 1-2 days)
   - "Noindex" = Check meta robots tag

4. Go to **"URL Inspection"** → Enter homepage
5. Verify:
   - [ ] "Page is indexed"
   - [ ] Meta description shows correctly
   - [ ] Meta title shows correctly
   - [ ] Mobile friendly: "Yes"

**Expected Time:** 10 minutes

---

## 📊 What to Monitor After Setup

### **Dashboard Metrics** (check weekly)

| Metric | Location | What to Track |
|--------|----------|---------------|
| Impressions | Overview | Total search impressions |
| Clicks | Overview | Total clicks from search |
| CTR | Overview | Click-through rate |
| Position | Overview | Average ranking position |
| Coverage | Coverage | % pages indexed vs errors |
| Mobile Usability | Enhancements | Mobile-friendly issues |

### **First 30 Days Timeline**

```
Day 1: Submit sitemap + verify (TODAY)
Day 2-3: Crawl queue processes (1-2M URLs)
Day 5-7: First data appears in GSC (impressions, clicks)
Day 14: Enough data for trends
Day 30: Full month of data for analysis
```

---

## ✅ Completion Checklist

After GSC setup, verify:

- [ ] Property added to GSC
- [ ] Domain ownership verified
- [ ] Sitemap submitted successfully
- [ ] Top pages requested for indexing
- [ ] Email alerts configured
- [ ] Coverage report shows >90% indexed
- [ ] Mobile usability shows "No issues" or minor
- [ ] Meta tags verified in GSC

---

## 🎯 Next Steps After GSC Setup

1. **Monitor daily for 1 week**
   - Watch Coverage for errors
   - Check if pages get indexed
   
2. **After Week 1:**
   - Analyze impressions & clicks
   - Identify which keywords appear
   - Track ranking positions

3. **After Week 2:**
   - Deploy Task 1.3 & 1.4 (OG images + hreflang)
   - Resubmit sitemap
   - Request re-crawl of affected pages

4. **After Week 4:**
   - Full GSC analysis (30 days data)
   - Compare before/after SEO changes
   - Identify quick wins (CTR optimization)

---

## 🔗 Useful Links

- [Google Search Console](https://search.google.com/search-console)
- [Sitemap Status](https://search.google.com/search-console/sitemaps) (after added)
- [Coverage Report](https://search.google.com/search-console/coverage) (after added)
- [Mobile Usability](https://search.google.com/search-console/mobile-usability) (after added)

---

## 💡 Pro Tips

1. **Verification via HTML file** = Fastest
2. **Submit sitemap immediately** = Starts indexing queue
3. **Request top 5 URLs** = Prioritizes crawl
4. **Setup email alerts** = Won't miss critical issues
5. **Check weekly** = Catch issues early

---

## ❓ FAQs

**Q: How long until pages are indexed?**  
A: 24-48 hours for sitemap processing, 3-7 days for actual indexing.

**Q: Why does GSC show "URL not on Google" if it's in sitemap?**  
A: Normal. GSC hasn't crawled it yet. Once submitted, will queue for crawl.

**Q: What if I see indexing errors?**  
A: Most common = robots.txt blocking (should be fixed ✅). Wait 2-3 days for recrawl.

**Q: Should I use DNS or HTML verification?**  
A: HTML is faster (1 minute vs 1-5 min DNS propagation).

---

**Task 1.6 Status:** 🟢 READY TO EXECUTE  
**Est. Time:** 30-45 minutes  
**Go Live:** Execute steps 1-6 above
