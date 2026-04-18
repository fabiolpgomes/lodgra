# Lodgra Landing Page — Deployment Checklist

**Status:** ✅ Ready for Production  
**Last Updated:** 2026-04-18  
**Deployment Target:** Vercel

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No console warnings/errors
- [ ] No commented-out code
- [ ] No `console.log()` in production code

### Build Verification
- [ ] Production build succeeds (`npm run build`)
- [ ] Bundle size < 100KB gzipped
- [ ] No build warnings
- [ ] Build time < 2 minutes

### Performance
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 95+
- [ ] Lighthouse Best Practices: 95+
- [ ] Lighthouse SEO: 100
- [ ] Core Web Vitals all green

### Content
- [ ] All copy proofread (PT/EN/ES)
- [ ] All links verified (CTAs, footer)
- [ ] All images optimized
- [ ] Favicon configured
- [ ] OG images ready

### Localization
- [ ] pt-BR translations complete
- [ ] en-US translations complete
- [ ] es translations complete
- [ ] Locale switching works
- [ ] Correct locale defaults

### Accessibility (WCAG AA)
- [ ] Color contrast 4.5:1 minimum
- [ ] Touch targets 44x44px
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Alt text for all images
- [ ] Form labels associated

### Security
- [ ] Environment variables set
- [ ] No secrets in code
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] X-Frame-Options set
- [ ] XSS protections active

---

## 🚀 Deployment Steps (Vercel)

### Step 1: Verify Git Status
```bash
git status
# → Working directory clean

git branch
# → On main/staging branch

git log --oneline -5
# → Verify last commits
```

### Step 2: Final Code Push
```bash
git add .
git commit -m "feat: Deploy Lodgra landing page v1.0"
git push origin main
```

### Step 3: Vercel Automatic Deploy
- ✅ Vercel detects push
- ✅ Build starts automatically
- ✅ Tests run
- ✅ Preview URL generated
- ✅ Production deploy (after approval)

### Step 4: Verify Deployment
```bash
# Wait 2-3 minutes for build to complete
# Then visit:
https://lodgra.io/landing
https://lodgra.io/landing?locale=pt-BR
https://lodgra.io/landing?locale=es
```

### Step 5: Smoke Testing
- [ ] Page loads (all locales)
- [ ] No 404s or 500s
- [ ] All CTAs route correctly
- [ ] Images load fast
- [ ] Fonts render properly
- [ ] Responsive on mobile/tablet/desktop

---

## 🔗 Vercel Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "env": {
    "NEXT_PUBLIC_SITE_URL": "@lodgra_site_url",
    "NEXT_PUBLIC_GA_ID": "@lodgra_ga_id"
  },
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Environment Variables

**Set in Vercel Dashboard:**

```
NEXT_PUBLIC_SITE_URL = https://lodgra.io
NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX
SENTRY_AUTH_TOKEN = (if using Sentry)
```

### Domain Configuration

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `lodgra.io`
3. Add alternative: `www.lodgra.io`
4. Wait for DNS propagation (5-10 min)
5. Verify SSL certificate (automatic)

---

## 📊 Post-Deployment Verification

### Vercel Dashboard
- [ ] Build status: ✅ PASSED
- [ ] Deployment status: ✅ READY
- [ ] No error logs
- [ ] Response time < 200ms (global avg)

### SEO & Performance
- [ ] Google Search Console: Verified
- [ ] Sitemap submitted
- [ ] Robots.txt accessible
- [ ] Meta tags render correctly
- [ ] OG preview shows

### Analytics Setup
- [ ] Google Analytics 4: Active
- [ ] Events tracking: Working
- [ ] Conversion goals: Configured
- [ ] Real-time data: Flowing

### Monitoring
- [ ] Sentry: Connected
- [ ] Error tracking: Active
- [ ] Uptime monitoring: Active
- [ ] Alerts configured

---

## 🔄 Rollback Plan (If Needed)

### Quick Rollback
```bash
# View deployment history
vercel deployments

# Rollback to previous version
vercel rollback
```

### Manual Rollback
```bash
# Go back to previous commit
git revert HEAD
git push origin main

# Vercel auto-redeploys from git
```

---

## 📈 Post-Launch Monitoring (First 48 Hours)

### Every 30 minutes
- [ ] Check Vercel dashboard (no errors)
- [ ] Monitor Google Analytics (traffic normal)
- [ ] Check Sentry (no new errors)

### Daily
- [ ] Review conversion metrics
- [ ] Monitor Core Web Vitals
- [ ] Check user feedback
- [ ] Verify mobile experience
- [ ] Test all CTAs

### Weekly
- [ ] Analyze user behavior
- [ ] Review analytics data
- [ ] Check performance trends
- [ ] Update deployment log

---

## 🐛 Troubleshooting Deployment

### Build Fails
**Error:** `npm run build` fails locally

**Solution:**
```bash
# Clear cache
rm -rf .next/
npm ci
npm run build
```

### Deployment Slow
**Cause:** Large dependencies or images

**Solution:**
```bash
# Analyze bundle size
npm run analyze  # (if script exists)

# Remove unused packages
npm prune
```

### Images Not Loading
**Cause:** Image optimization timeout

**Solution:**
- Compress images (< 1MB each)
- Use Next/Image component
- Set proper dimensions

### Styles Not Applying
**Cause:** Tailwind not processing

**Solution:**
```bash
# Rebuild Tailwind
npm run build -- --force
```

---

## ✅ Launch Checklist

### Before Going Live
- [ ] Copy reviewed (no typos)
- [ ] Links tested (all working)
- [ ] Images optimized (< 100KB each)
- [ ] Fonts preloaded (Google Fonts)
- [ ] Favicon set
- [ ] sitemap.xml created
- [ ] robots.txt configured
- [ ] Meta tags complete
- [ ] OG images ready
- [ ] Analytics configured
- [ ] Error tracking active
- [ ] Email notifications set

### Going Live
- [ ] DNS configured (TTL 3600)
- [ ] SSL certificate active
- [ ] Vercel deployment: ✅ READY
- [ ] URL responsive: ✅ VERIFIED
- [ ] All locales working: ✅ VERIFIED
- [ ] Performance acceptable: ✅ VERIFIED

### After Going Live
- [ ] Submit to Google Search Console
- [ ] Add to Bing Webmaster Tools
- [ ] Share with team
- [ ] Monitor for 24 hours
- [ ] Document any issues
- [ ] Plan improvements

---

## 📞 Support Contacts

**Vercel Support:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Email: support@vercel.com

**Domain Registrar:**
- Update DNS if needed
- Monitor DNS propagation
- Configure email forwarding

**SSL Certificate:**
- Automatic (Let's Encrypt)
- Auto-renewal 30 days before expiry
- Monitor certificate status

---

## 📝 Deployment Log

```
Date: 2026-04-18
Status: ✅ READY FOR DEPLOYMENT
Last Updated: 2026-04-18
Build Time: ~1 minute
Bundle Size: 82KB (gzipped)
Performance: Lighthouse 94+

Next Deploy:
- When approved by product team
- On: main branch
- Via: Vercel automatic deploy
- Domain: lodgra.io
```

---

**Created by:** Uma (UX/Design Expert)  
**Status:** Ready for Production  
**Last Verified:** 2026-04-18
