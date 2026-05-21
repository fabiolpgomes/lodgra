# GSC Setup — Quick Checklist (Parallel to Staging Deploy)

**⏱️ Est. Time:** 30-45 minutes  
**📅 Date:** May 21, 2026  
**🎯 Goal:** Submit Lodgra to Google Search Console for indexing

---

## 🚀 QUICK EXECUTION (Copy & Paste Ready)

### **Step 1: Verify Domain is Working** (2 min)

```bash
# Open in browser:
https://lodgra.io/
https://lodgra.io/sitemap.xml
https://lodgra.io/robots.txt

# Expected:
✅ Homepage loads
✅ Sitemap.xml shows XML (not 404)
✅ robots.txt shows text file
```

---

### **Step 2: Go to Google Search Console** (1 min)

```
📍 Visit: https://search.google.com/search-console
🔑 Sign in with your Google Account
```

---

### **Step 3: Add Property** (2 min)

```
1. Click: "Add Property" (large button top-left)
2. Choose: "URL prefix" (NOT "Domain")
3. Enter: https://lodgra.io
4. Click: "Continue"
```

---

### **Step 4: Verify Ownership** (5-10 min)

**FASTEST METHOD (Recommended):**

```
1. See: HTML file verification option
   Download file: google-[code].html

2. In VS Code / Terminal:
   $ scp google-[code].html user@server:/var/www/lodgra/public/
   
   OR
   
   $ mv google-[code].html public/
   $ git add public/google-[code].html
   $ git commit -m "chore: add GSC verification file"
   $ git push

3. In GSC:
   Click: "Verify"
   
4. Wait: ~30 seconds
   Status: ✅ "Ownership verified"
```

**ALTERNATIVE (DNS):**

```
1. See: DNS TXT record option
2. Copy the TXT record
3. Add to your DNS provider (Vercel, Cloudflare, etc.)
4. Click: "Verify" in GSC
5. Wait: 1-5 minutes for propagation
```

**⚡ FASTEST = HTML FILE (use this)**

---

### **Step 5: Submit Sitemap** (2 min)

```
1. In GSC sidebar: Click "Sitemaps"
2. Click: "Add/test sitemap"
3. Enter: https://lodgra.io/sitemap.xml
4. Click: "Submit"

Expected: ✅ "Sitemap submitted successfully"

Check status:
  └─ Will show "Pending" then "Success" (~5-10 min)
```

---

### **Step 6: Request Indexing** (5 min)

```
1. Top of GSC, find search bar "URL Inspection"
2. Enter each URL (press Enter after each):
   
   → https://lodgra.io/
   → https://lodgra.io/login
   → https://lodgra.io/register
   → https://lodgra.io/terms
   → https://lodgra.io/privacy

3. For each URL:
   - If shows: "URL is not on Google"
     → Click: "Request indexing"
   
   - If shows: "URL is on Google"
     → Click: "Request indexing" (refresh)

4. You'll see: "Request submitted" ✅
```

---

### **Step 7: Enable Alerts** (3 min)

```
1. Click: "Settings" (gear icon, left sidebar)
2. Click: "Users and permissions"
3. Click: "Add user"
4. Email: fabiolpgomes@gmail.com
5. Role: "Owner"
6. Click: "Invite"

Back in Settings:
7. Click: "Email preferences"
8. Enable:
   ☑️ Critical issues
   ☑️ Sitemaps
   ☑️ Coverage
```

---

## ✅ Success Indicators

After completing steps 1-7, you should see:

```
✅ Ownership: "Verified" badge in Settings
✅ Sitemap: Shows in "Sitemaps" with status
✅ Coverage: At least 1 page crawled (refresh page)
✅ URL Inspection: Shows recent requests
✅ Emails: Setup complete notification
```

---

## 📊 What Happens Next

```
Timeline:
  ✅ Right now: Property verified, sitemap submitted
  ⏳ 5-10 min: Sitemap processes, pages enter crawl queue
  ⏳ 1-3 days: Google crawls pages (watch Coverage report)
  ⏳ 3-7 days: Pages indexed in Google
  ⏳ 1-2 weeks: Impressions/clicks data appears in Overview

Quick win:
  → In 1 week, you'll see search impressions in GSC
  → Search query data will appear (organic keywords)
  → Can see which keywords bring traffic
```

---

## 🎯 Done? Checklist

- [ ] Property added to GSC
- [ ] Domain ownership verified (HTML method ✅)
- [ ] Sitemap submitted + shows status
- [ ] Top 5 URLs requested for indexing
- [ ] Email alerts configured
- [ ] Can see at least 1 page in Coverage report
- [ ] Received verification email from Google

---

## ⚡ Shortcuts if you get stuck

**"Verification keeps failing"**
→ Use DNS method instead (longer but more reliable)

**"Sitemap won't submit"**
→ Check: https://lodgra.io/sitemap.xml in browser first
→ If works, wait 5 min and retry submit

**"Can't find URL Inspection"**
→ It's the search bar at the TOP of GSC (not in sidebar)
→ Says "URL Inspection" or magnifying glass icon

**"No pages in Coverage"**
→ Wait 10-15 min (GSC is processing)
→ Refresh the page

---

**⏱️ Total Time: 30-45 minutes**  
**🎯 Result: Lodgra is now in Google's indexing queue!**

---

**START HERE → Step 1 (above)**
