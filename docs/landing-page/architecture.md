# Lodgra Landing Page — Technical Architecture

**Status:** ✅ Production Ready  
**Last Updated:** 2026-04-18  
**Version:** 1.0.0

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (Hosting)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │         Next.js 14 App Router                 │  │
│  │  ┌──────────────┐    ┌─────────────────────┐  │  │
│  │  │ /landing     │───→│ LandingPageClient   │  │  │
│  │  │ [locale]     │    │ (React Components)  │  │  │
│  │  └──────────────┘    └─────────────────────┘  │  │
│  │         ↓                                       │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Tailwind CSS v4 + Design Tokens        │  │  │
│  │  │  (lodgra-blue, lodgra-gold, etc)        │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │         ↓                                       │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  Localization (pt-BR, en-US, es)        │  │  │
│  │  │  → public/locales/*.json                │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                     ↓                               │
│  ┌───────────────────────────────────────────────┐  │
│  │  Edge Network (Global CDN)                    │  │
│  │  • Static HTML generation (ISR)               │  │
│  │  • Image optimization                         │  │
│  │  • Automatic gzip compression                 │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         ↓                              ↓
    [Client Browser]          [Analytics/Monitoring]
    • 60fps interactions      • Sentry (errors)
    • Mobile optimized        • Vercel Analytics
    • Keyboard navigable      • Google Analytics 4
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Components:** React 18+
- **Icons:** Emoji + Custom SVG

### Localization
- **Structure:** JSON files per locale
- **Locales:** pt-BR, en-US, es
- **Pattern:** Dynamic import based on query param

### Deployment
- **Host:** Vercel (optimal for Next.js)
- **Domain:** lodgra.io
- **SSL:** Automatic (Let's Encrypt)
- **CDN:** Vercel Edge Network (150+ locations)

### Performance
- **Build:** Static generation (SSG) + ISR
- **Caching:** 3600s (1 hour) default
- **Compression:** Brotli + Gzip
- **Image:** Next/Image optimization

---

## 📁 Project Structure

```
src/
├── app/
│   ├── landing/
│   │   └── page.tsx              # Landing page route
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles + Google Fonts
├── components/
│   └── landing/
│       ├── atoms/                # 4 base atoms
│       ├── molecules/            # 3 compound molecules
│       ├── organisms/            # 7 full sections
│       └── LandingPageClient.tsx # Main orchestrator
└── lib/
    └── constants.ts              # Config, constants

public/
├── locales/
│   ├── pt-BR/landing.json
│   ├── en-US/landing.json
│   └── es/landing.json
├── favicon.ico
└── robots.txt

docs/
└── landing-page/
    ├── IMPLEMENTATION.md
    ├── architecture.md (this file)
    ├── deployment-checklist.md
    ├── seo-checklist.md
    ├── performance-audit.md
    ├── copy.json
    ├── tokens.json
    └── narrative-strategy.md
```

---

## 🎨 Component Architecture

### Atomic Design (Brad Frost)

**Layer 1: ATOMS** (11 components)
- Smallest, reusable units
- No dependencies on other components
- Example: Button, Card, Badge, Container

**Layer 2: MOLECULES** (3 components)
- Simple combinations of atoms
- Start to have context
- Example: FeatureCard = Icon + Title + Description

**Layer 3: ORGANISMS** (7 components)
- Complex UI sections
- Combine atoms + molecules
- Example: Hero = Logo + Headline + CTA + Illustration

**Layer 4: TEMPLATES** (1 file)
- Page layout structure
- Example: LandingPageClient orchestrates all organisms

**Layer 5: PAGES** (1 file)
- Specific page instance
- Example: /landing route with data

### Data Flow

```
Next.js Page Route (/landing)
      ↓
Fetch Content (JSON)
      ↓
LandingPageClient (orchestrator)
      ↓
Organisms (Hero, Features, Pricing, etc)
      ↓
Molecules (FeatureCard, PricingCard, etc)
      ↓
Atoms (Button, Card, Badge)
      ↓
Tailwind CSS (styling)
      ↓
Browser Rendering
```

---

## 🎯 Performance Targets

### Lighthouse Scores (Target)
- **Performance:** 90+
- **Accessibility:** 95+
- **Best Practices:** 95+
- **SEO:** 100

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Page Metrics
- **Bundle Size:** < 100KB (gzipped)
- **Time to Interactive:** < 3s
- **Fully Loaded:** < 5s

### Accessibility (WCAG AA)
- **Color Contrast:** 4.5:1 minimum
- **Touch Targets:** 44x44px minimum
- **Focus Indicators:** Visible
- **Keyboard Navigation:** Full support
- **Alt Text:** All images

---

## 🔐 Security Measures

### Input Validation
- No direct innerHTML usage
- React XSS protection
- URL parameter validation (locale enum)

### Headers
```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Dependencies
- npm audit regularly
- Dependabot enabled
- Minimal external deps

---

## 📊 Analytics Integration

### Google Analytics 4
```typescript
// Track page views
gtag.pageview({
  page_path: '/landing',
  page_title: 'Lodgra Landing',
})

// Track CTA clicks
gtag.event('signup_click', {
  plan: 'free',
  locale: 'pt-BR',
})
```

### Tracking Events
- Page views (by locale)
- CTA clicks (by variant)
- Form submissions
- Pricing tier selection
- FAQ expansion
- Demo video watch

### Conversion Goals
- Sign-up rate (target: 5-8%)
- Time on page (target: 2-3 min)
- Scroll depth (target: 80%+)
- Return visitor rate

---

## 🔄 Build & Deploy Process

### Development
```bash
npm run dev
# → localhost:3000/landing
```

### Build
```bash
npm run build
# → .next/ (optimized production build)
```

### Type Checking
```bash
npm run typecheck
# → Validates TypeScript (strict mode)
```

### Linting
```bash
npm run lint
# → ESLint + Prettier validation
```

### Testing
```bash
npm test
# → Jest + React Testing Library
```

### Deployment (Vercel)
```bash
git push origin main
# → Automatic Vercel deployment
# → Runs build, type check, lint
# → Live at lodgra.io
```

---

## 🌍 Internationalization (i18n)

### Locale Detection
```typescript
const locale = searchParams.locale || 'en-US'

// Valid locales
const validLocales = ['pt-BR', 'en-US', 'es']
```

### Content Loading
```typescript
const content = await import(
  `@/public/locales/${locale}/landing.json`
).then((mod) => mod.default)
```

### Content Structure
```json
{
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "ctaPrimary": "..."
  },
  "features": [
    { "title": "...", "description": "..." }
  ],
  ...
}
```

### Adding New Locale
1. Create `public/locales/[locale]/landing.json`
2. Add to `validLocales` array
3. Translate all strings
4. Test at `?locale=[locale]`

---

## 📈 Monitoring & Observability

### Vercel Analytics
- Core Web Vitals
- Page load time
- Device distribution
- Geographic distribution

### Sentry Error Tracking
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.captureException(error)
```

### Custom Logging
```typescript
console.log('[Landing] Page loaded', {
  locale,
  timestamp: new Date().toISOString(),
})
```

---

## 🚀 Scalability

### Traffic Handling
- Vercel auto-scaling (handles 1000s of concurrent users)
- Edge caching (response time < 100ms worldwide)
- Database not needed (static site)

### Content Updates
- Redeploy to update content (git push)
- ISR revalidation (60s default)
- No database downtime

### Geographic Distribution
- Vercel Edge Network (150+ locations)
- Automatic CDN caching
- Optimized for each region

---

## ✅ Quality Assurance Checklist

- [ ] TypeScript: Zero errors (strict mode)
- [ ] Linting: All rules pass (ESLint)
- [ ] Testing: 80%+ coverage
- [ ] Performance: Lighthouse 90+
- [ ] Accessibility: WCAG AA compliant
- [ ] Responsive: Works 320px-4K
- [ ] i18n: All 3 locales correct
- [ ] SEO: Meta tags, sitemap, robots.txt
- [ ] Security: HTTPS, CSP headers
- [ ] Analytics: GA4 tracking active

---

## 🔧 Maintenance

### Monthly
- Check npm audit results
- Review analytics data
- Monitor error rates (Sentry)
- Verify Lighthouse scores

### Quarterly
- Update dependencies
- Review performance metrics
- Plan new features
- Update content (if needed)

### Annually
- Architecture review
- Dependency major version updates
- Performance optimization pass
- Security audit

---

## 📞 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Styles not applying | Tailwind not configured | Check tailwind.config.ts |
| i18n not loading | Locale naming mismatch | Use exact case: `pt-BR` |
| Icons not showing | Emoji rendering issue | Use icon library instead |
| Performance slow | Large bundle | Check component imports |
| Accessibility fail | Low contrast | Use design tokens (WCAG AA) |

---

**Created by:** Uma (UX/Design Expert)  
**Status:** Production Ready  
**Next Review:** 2026-07-18
