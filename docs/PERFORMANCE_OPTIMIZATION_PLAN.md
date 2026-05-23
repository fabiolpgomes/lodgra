# Performance & Accessibility Optimization Plan (2026-05-23)

**Current Status:**
- Desktop: Performance 92, Accessibility 88, Best Practices 92, SEO 100
- Mobile: Performance 75, Accessibility 90, Best Practices 92, SEO 100

**Goals:**
- Desktop Accessibility: 88 → 95+ (improve contrast, ARIA labels, keyboard navigation)
- Mobile Performance: 75 → 85+ (optimize images, lazy load, reduce JS)

---

## Phase 1: Accessibility Improvements (Desktop 88 → 95)

### Common Issues to Check & Fix

#### 1. **Color Contrast** (WCAG AA standard)
**Problem:** Text may have insufficient contrast ratio (< 4.5:1 for normal text, 3:1 for large text)

**Audit:**
- Check all text colors in `src/components/marketing/regions/BrazilLanding.tsx`
- Check CTA buttons (currently using `#059669` green)
- Check heading colors against background

**Fix Template:**
```css
/* Current (potentially problematic) */
.button-primary { color: #059669; background: white; } /* May fail WCAG AA */

/* Fixed (WCAG AA compliant) */
.button-primary { color: #045a4f; background: white; } /* Darker green, 4.5:1 ratio */
```

**Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- DevTools → Inspect element → Computed styles → Show contrast ratio

---

#### 2. **Form Labels & ARIA** (accessibility)
**Problem:** Form inputs may lack associated labels or ARIA attributes

**Audit Locations:**
- `src/components/common/forms/` — all form components
- `src/components/common/public/booking/BookingWidget*` — date picker, guest count
- Search inputs in landing pages

**Fix Template:**
```jsx
// Before (problematic)
<input type="text" placeholder="Enter your email" />

// After (accessible)
<label htmlFor="email-input" className="sr-only">Email Address</label>
<input id="email-input" type="email" placeholder="Enter your email" />
```

**Additional ARIA:**
```jsx
// Add for complex widgets
<div role="region" aria-live="polite" aria-label="Property filters">
  {/* Filter controls */}
</div>
```

---

#### 3. **Image Alt Text**
**Problem:** Images missing `alt` attributes or alt text is too vague

**Audit Locations:**
- `src/components/common/public/gallery/PropertyHeroGallery.tsx` — property images
- `src/components/landing/atoms/Image.tsx` — landing page images
- All `<img>` tags in components

**Fix Template:**
```jsx
// Before (problematic)
<img src="property.jpg" />

// After (accessible)
<img src="property.jpg" alt="Beach house in Algarve with pool and ocean view" />
```

**Pattern:** `{property_name} in {location} with {key_features}`

---

#### 4. **Keyboard Navigation**
**Problem:** Interactive elements not reachable via keyboard (Tab key)

**Audit:**
- Try navigating with Tab key only (no mouse)
- Check if focus is visible (visible focus indicator)
- Check if form can be completed with keyboard

**Fix:**
- Add `tabIndex="0"` to interactive custom components
- Ensure focus visible: `outline: 2px solid #059669`
- Test with `src/components/landing/organisms/FinalCTA.tsx`

```css
/* Add focus style to all interactive elements */
button:focus,
a:focus,
input:focus {
  outline: 2px solid #059669;
  outline-offset: 2px;
}
```

---

#### 5. **Heading Structure**
**Problem:** Improper heading hierarchy (h1 → h3, skipping h2)

**Audit:**
- Landing page: Should have 1 `<h1>` (page title)
- Sections should use `<h2>`, `<h3>` in order

**Fix Template:**
```jsx
// Before (problematic)
<h1>Property Details</h1>
<h3>Room Information</h3>  {/* Skips h2! */}

// After (accessible)
<h1>Property Details</h1>
<h2>Accommodation</h2>
<h3>Room Information</h3>
```

---

## Phase 2: Mobile Performance Improvements (75 → 85)

### Common Issues to Check & Fix

#### 1. **Image Optimization**
**Problem:** Images not optimized for mobile (large file sizes, wrong format)

**Audit:**
- Check DevTools → Network tab on mobile (simulated: Slow 4G)
- Look for images > 100KB on mobile
- Check if using modern formats (WebP)

**Current Implementation:**
- `src/app/p/[slug]/opengraph-image.tsx` uses WebP ✅
- But: property gallery images might not be optimized

**Fixes:**
```jsx
// Use Next.js Image component with priority + lazy loading
import Image from 'next/image'

// Hero image (above fold) - load immediately
<Image 
  src={heroImage} 
  alt="Property" 
  priority={true}
  quality={75}  {/* Reduce quality for mobile */}
  sizes="(max-width: 640px) 100vw, 100vw"
/>

// Gallery images (below fold) - lazy load
<Image 
  src={galleryImage} 
  alt="Room" 
  priority={false}  {/* Lazy load */}
  quality={60}
  loading="lazy"
  sizes="(max-width: 640px) 100vw, 100vw"
/>
```

**Action:** Update `PropertyHeroGallery.tsx` and `PropertyLightbox.tsx`

---

#### 2. **JavaScript Optimization**
**Problem:** Non-critical JS blocks main thread (FCP, LCP delayed)

**Audit:**
- DevTools → Performance tab → record page load
- Look for yellow/red sections in main thread
- Check if JS bundle is split properly

**Fixes:**
```jsx
// Defer non-critical scripts
<script defer src="analytics.js"></script>

// Dynamic imports for below-fold components
const PropertyReviews = dynamic(() => import('./PropertyReviews'), {
  loading: () => <div>Loading...</div>,
  ssr: false  {/* Render on client only */}
})

// Lazy load maps
<Suspense fallback={<MapPlaceholder />}>
  <PropertyMap property={property} />
</Suspense>
```

**Action:** Review `src/components/common/public/` for dynamic import opportunities

---

#### 3. **CSS & Font Optimization**
**Problem:** Unused CSS, large font files block rendering

**Audit:**
- DevTools → Coverage tab → find unused CSS
- Check font loading strategy

**Current Setup:**
- Tailwind CSS (good) — tree-shakes unused styles ✅
- But: Check if fonts block First Paint

**Fixes:**
```css
/* In layout.tsx, add font-display strategy */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
/* display=swap: show system font while custom font loads */
```

**Action:** Update `src/app/layout.tsx` with font optimization

---

#### 4. **Lazy Loading**
**Problem:** Off-screen elements loaded immediately

**Current:** ✅ FullCalendar lazy-loaded, gallery lazy-loaded  
**Check:** Below-fold sections on landing page

**Fixes:**
```jsx
// Lazy load below-fold sections
const PricingSection = dynamic(() => import('./PricingSection'), {
  ssr: false  {/* Client-only rendering */}
})

// Intersection Observer for visibility
import { useInView } from 'react-intersection-observer'

export function PricingCards() {
  const { ref, inView } = useInView({ threshold: 0 })
  
  return (
    <div ref={ref}>
      {inView && <ExpensiveComponent />}
    </div>
  )
}
```

**Action:** Update `BrazilLanding.tsx` pricing section

---

#### 5. **Cache Strategy**
**Problem:** Missing cache headers or overly aggressive caching

**Current:** ISR configured (good) ✅

**Check:**
- Static assets: should cache 1 year
- API responses: should cache 5 minutes
- HTML pages: should cache 0 minutes (revalidate on demand)

**Fixes in `next.config.ts`:**
```typescript
export default {
  headers: async () => [
    {
      source: '/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
      ]
    },
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=300' }  {/* 5 min */}
      ]
    }
  ]
}
```

---

## Implementation Roadmap

### Week 1: Accessibility (Desktop 88 → 95)

**Sprint Goal:** +7 points

- [ ] **Day 1:** Contrast audit & fixes (all text/buttons)
- [ ] **Day 2:** Form labels & ARIA attributes
- [ ] **Day 3:** Image alt text audit & updates
- [ ] **Day 4:** Keyboard navigation testing & fixes
- [ ] **Day 5:** Heading structure validation, re-test

**Estimated Effort:** 4-6 hours  
**Tools Needed:** WebAIM contrast checker, DevTools accessibility panel

---

### Week 2: Mobile Performance (75 → 85)

**Sprint Goal:** +10 points

- [ ] **Day 1:** Image optimization & Next.js Image component updates
- [ ] **Day 2:** JS code-splitting & dynamic imports
- [ ] **Day 3:** Font loading optimization
- [ ] **Day 4:** Lazy loading for below-fold sections
- [ ] **Day 5:** Cache strategy validation, re-test

**Estimated Effort:** 6-8 hours  
**Tools Needed:** Lighthouse, DevTools Performance tab, WebPageTest

---

## Testing & Validation

### Before Changes
```bash
# Desktop
https://pagespeed.web.dev/?url=https://www.lodgra.io

# Mobile
https://pagespeed.web.dev/?url=https://www.lodgra.io&form_factor=mobile
```

### After Changes (Local Testing)
```bash
# In Chrome DevTools
1. Lighthouse → Generate report
2. Performance → Record load
3. Accessibility → Audit
4. Coverage → Check unused CSS
5. Network → Throttle to Slow 4G
```

### Expected Outcomes
| Phase | Metric | Current | Target | Gain |
|-------|--------|---------|--------|------|
| **Phase 1** | Desktop A11y | 88 | 95+ | +7 |
| **Phase 2** | Mobile Perf | 75 | 85+ | +10 |
| **Both** | Overall | 87 avg | 92 avg | +5 |

---

## Files to Modify

### Accessibility Fixes
- `src/components/marketing/regions/BrazilLanding.tsx` — button colors, contrast
- `src/components/common/forms/**` — label associations, ARIA
- `src/components/common/public/gallery/*.tsx` — alt text
- `src/components/landing/organisms/Navbar.tsx` — focus styles
- `src/app/layout.tsx` — global focus styles

### Performance Fixes
- `src/components/common/public/gallery/PropertyHeroGallery.tsx` — image optimization
- `src/components/common/public/gallery/PropertyLightbox.tsx` — lazy loading
- `src/components/marketing/regions/BrazilLanding.tsx` — dynamic imports
- `src/app/layout.tsx` — font optimization, cache headers
- `next.config.ts` — cache strategy headers

---

## Success Metrics

| Metric | Threshold | Current | Status |
|--------|-----------|---------|--------|
| **Desktop Accessibility** | ≥ 95 | 88 | ⏳ In progress |
| **Mobile Performance** | ≥ 85 | 75 | ⏳ In progress |
| **Overall Average** | ≥ 90 | 87 | ⏳ In progress |
| **SEO** | 100 | 100 | ✅ Perfect |

---

## Resources

**Accessibility:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Tools](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

**Performance:**
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Next.js Optimization](https://nextjs.org/learn/seo/introduction-to-seo)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

---

**Created:** 2026-05-23  
**Status:** Planning phase (waiting for detailed PageSpeed issues)  
**Next:** Share PageSpeed detailed screenshots for targeted fixes
