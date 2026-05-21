# SEO Week 1 — Execution Tracker

**Branch:** `feat/seo-week1-meta-tags`  
**Period:** May 21-27, 2026  
**Owner:** @dev (Dex)  
**Status:** 🟢 IN PROGRESS  

---

## 📋 Week 1 Checklist

### Task 1.1: Meta Description Implementation
- [ ] **Monday (May 21)**
  - [ ] Audit all pages for existing meta descriptions
  - [ ] Create spreadsheet with URLs + proposed descriptions
  - [ ] Review keyword-tracking data for priority pages
  
- [ ] **Tuesday (May 22)**
  - [ ] Implement meta descriptions in Next.js Head component
  - [ ] Ensure 80-160 character limit
  - [ ] Include primary keyword + CTA
  - [ ] Deploy to staging
  - [ ] Test in PageSpeed Insights

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 6-8 hours  
**Deliverable:** All pages with meta descriptions

---

### Task 1.2: Meta Title Implementation
- [ ] **Wednesday (May 23)**
  - [ ] Review current title tags
  - [ ] Create spreadsheet with URLs + optimized titles
  - [ ] Format: "[Keyword] - Lodgra | [Diferencial]"
  
- [ ] **Thursday (May 24)**
  - [ ] Implement in Next.js Head
  - [ ] 50-60 character limit
  - [ ] Keyword at start
  - [ ] Deploy to staging
  - [ ] Test

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 4-6 hours  
**Deliverable:** All pages with meta titles

---

### Task 1.3: Open Graph Tags
- [ ] **Thursday (May 24)**
  - [ ] Design OG image (1200x630)
  - [ ] Create Figma mockup or use Canva
  
- [ ] **Friday (May 25)**
  - [ ] Add OG tags to layout
  - [ ] Upload image to `/public/og-image.png`
  - [ ] Test on Facebook/Twitter
  - [ ] Deploy to staging

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 3-4 hours  
**Deliverable:** OG tags implemented, image renders correctly

---

### Task 1.4: hreflang Configuration
- [ ] **Friday (May 25)**
  - [ ] DECISION: Subdomain vs Subpath?
  - [ ] Plan DNS/redirect structure
  
- [ ] **Saturday (May 26)**
  - [ ] Implement hreflang in all pages
  - [ ] Setup redirects (if needed)
  - [ ] Deploy to staging
  - [ ] Test across regions

- [ ] **Sunday (May 27)**
  - [ ] Final validation
  - [ ] Prepare for production deploy

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 6-8 hours  
**Deliverable:** hreflang on all pages, regions work correctly

---

### Task 1.5: Sitemap & Robots Optimization
- [ ] **Saturday (May 26)**
  - [ ] Check if sitemap.xml exists
  - [ ] If not, setup next-sitemap
  - [ ] Include all priority pages
  - [ ] Setup robots.txt

- [ ] **Sunday (May 27)**
  - [ ] Validate sitemap.xml (XML parse test)
  - [ ] Test robots.txt rules
  - [ ] Deploy to staging

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 2-3 hours  
**Deliverable:** sitemap.xml + robots.txt optimized

---

### Task 1.6: Google Search Console
- [ ] **Sunday (May 27)**
  - [ ] Verify domain (already done?)
  - [ ] Submit sitemap.xml
  - [ ] Request indexing for top pages
  - [ ] Setup email alerts

**Status:** ⏳ NOT STARTED  
**Time Estimate:** 1-2 hours  
**Deliverable:** GSC setup + sitemap submitted

---

## 🎯 Success Criteria (End of Week 1)

- ✅ All meta descriptions implemented (100%)
- ✅ All meta titles implemented (100%)
- ✅ Open Graph tags working on social
- ✅ hreflang configured for all regions
- ✅ sitemap.xml submitted to GSC
- ✅ robots.txt optimized
- ✅ Zero GSC indexation errors
- ✅ Code ready for production deploy

---

## 📊 Progress Dashboard

```
Tasks Completed:     0/6
Hours Used:          0/20-24
Branch Status:       ACTIVE (feat/seo-week1-meta-tags)
Staging Tests:       0/6
Production Ready:    ❌ NOT YET
```

---

## 📝 Notes & Decisions

### Decision 1: hreflang Structure
**Options:**
- [ ] Subdomain: br.lodgra.io, pt.lodgra.io, es.lodgra.io
- [ ] Subpath: lodgra.io/pt-br/, /pt-pt/, /es/

**DECISION:** _________________ (TBD)  
**Reason:** _____________________________  
**Date Decided:** _____

---

## 🚀 Next Steps

1. **TODAY (May 21):** Start Task 1.1 (meta descriptions)
2. **Wednesday:** Move to Task 1.2 (titles)
3. **Friday:** Start Task 1.3-1.4 (OG + hreflang)
4. **Sunday:** Task 1.5-1.6 (Sitemap + GSC)
5. **End of Week:** Deploy to production

---

**Week 1 Status:** 🟢 READY TO START  
**Owner:** @dev  
**Last Updated:** 2026-05-21
