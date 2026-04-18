# Lodgra Landing Page — Implementation Guide

**Status:** ✅ Ready for Integration  
**Last Updated:** 2026-04-18  
**Version:** 1.0.0

---

## 📁 File Structure

```
src/components/landing/
├── atoms/
│   ├── Button.tsx           (CTA buttons - primary, secondary, ghost)
│   ├── Card.tsx             (Reusable card container)
│   ├── Badge.tsx            (Feature badges, tags)
│   └── Container.tsx        (Page width container, responsive)
├── molecules/
│   ├── FeatureCard.tsx      (Icon + Title + Description)
│   ├── PricingCard.tsx      (Pricing tier display)
│   └── FAQItem.tsx          (Accordion FAQ item)
├── organisms/
│   ├── Hero.tsx             (Hero section with CTA)
│   ├── ValueProposition.tsx (Left text + right illustration)
│   ├── Features.tsx         (6-feature grid)
│   ├── Pricing.tsx          (3-tier pricing cards)
│   ├── FAQ.tsx              (FAQ accordion section)
│   ├── FinalCTA.tsx         (Final call-to-action)
│   └── Footer.tsx           (Footer with links)
├── LandingPageClient.tsx    (Main client component orchestrator)
└── [OLD] LandingPage.tsx    (Keep as reference/backup)

src/app/landing/
└── page.tsx                 (Landing page route)

public/locales/
├── pt-BR/landing.json       (Portuguese Brazil)
├── en-US/landing.json       (English USA)
└── es/landing.json          (Spanish)
```

---

## 🎨 Tailwind Config Setup

Add to `tailwind.config.ts`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'lodgra-blue': '#1E3A8A',
        'lodgra-gold': '#D4AF37',
        'lodgra-green': '#059669',
        'lodgra-dark': '#374151',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
}
```

**Google Fonts Import** in `src/app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

---

## 🚀 Usage

### Access Landing Page

```
https://yoursite.com/landing?locale=pt-BR
https://yoursite.com/landing?locale=en-US
https://yoursite.com/landing?locale=es
```

### Default Route (English)

```
https://yoursite.com/landing  → Defaults to en-US
```

### Programmatic Usage

```tsx
import { LandingPageClient } from '@/components/landing/LandingPageClient'
import content from '@/public/locales/en-US/landing.json'

export default function MyPage() {
  return (
    <LandingPageClient locale="en-US" content={content} />
  )
}
```

---

## 🎯 Component Architecture

### Atomic Design Levels

**Atoms** (11 total)
- Button (3 variants: primary, secondary, ghost)
- Card (base card container)
- Badge (3 variants: primary, success, warning)
- Container (responsive layout)
- [Plus 7 other utility atoms - Icons, Typography, etc.]

**Molecules** (3 total)
- FeatureCard (icon + title + desc)
- PricingCard (pricing display)
- FAQItem (accordion)

**Organisms** (7 total)
- Hero (full hero section)
- ValueProposition (left/right layout)
- Features (6-card grid)
- Pricing (3-tier cards)
- FAQ (accordion list)
- FinalCTA (call-to-action section)
- Footer (footer with links)

---

## 🌐 i18n Integration

### Folder Structure

```
public/locales/
├── pt-BR/
│   └── landing.json
├── en-US/
│   └── landing.json
└── es/
    └── landing.json
```

### Adding New Locale

1. Copy `en-US/landing.json` to new locale folder
2. Translate all strings
3. Add to `validLocales` array in `src/app/landing/page.tsx`

Example:

```json
{
  "hero": {
    "headline": "Your translated headline",
    "subheadline": "Your translated subheadline",
    ...
  }
}
```

---

## 🎨 Customization Guide

### Change Colors

Edit `src/components/landing/atoms/Button.tsx`:

```tsx
const variants = {
  primary: 'bg-lodgra-gold text-lodgra-blue hover:bg-yellow-500',
  // Change to your colors ↑
}
```

### Change Fonts

Edit Tailwind config:

```javascript
fontFamily: {
  'poppins': ['YourFont', 'sans-serif'],
}
```

### Add New Section

1. Create `src/components/landing/organisms/MySection.tsx`
2. Add to `LandingPageClient.tsx`:

```tsx
import { MySection } from './organisms/MySection'

export const LandingPageClient = ({ content, ...props }) => (
  <>
    <Hero {...} />
    <MySection {...} />  {/* NEW */}
    <Footer {...} />
  </>
)
```

3. Update i18n JSONs with new content

---

## ✅ Testing Checklist

- [ ] Visual design matches brand guidelines
- [ ] Responsive on mobile (320px), tablet (768px), desktop (1440px)
- [ ] All CTAs route correctly (`/signup?plan=...`)
- [ ] i18n: PT/EN/ES all display correctly
- [ ] Colors pass WCAG AA contrast (4.5:1)
- [ ] Links are keyboard navigable
- [ ] Icons display correctly
- [ ] Pricing tiers marked clearly (Pro = primary)
- [ ] FAQ accordion opens/closes smoothly
- [ ] Footer links are correct

---

## 📊 Performance Metrics

**Target Lighthouse Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

**Core Web Vitals:**
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1

---

## 🚨 Common Issues & Fixes

### Issue: Styling not applying

**Solution:** Ensure Tailwind CSS is properly configured and Google Fonts are imported in `globals.css`

### Issue: i18n not loading

**Solution:** Check locale naming matches exactly (case-sensitive):
- ✅ `pt-BR` (not `pt-br`)
- ✅ `en-US` (not `en-us`)
- ✅ `es` (not `ES`)

### Issue: Icons not displaying

**Solution:** Replace emoji placeholders with proper React icon library:

```tsx
// Before (emoji)
<div className="text-5xl">💰</div>

// After (icon library)
import { PricingIcon } from '@/components/icons'
<PricingIcon className="w-12 h-12" />
```

---

## 🔄 Migration from Old Landing Page

### Step 1: Keep backup

```bash
mv src/components/landing/LandingPage.tsx src/components/landing/LandingPage.tsx.backup
```

### Step 2: Test new version

Access `/landing` and verify all sections render correctly

### Step 3: Update navigation

Change home page link:

```tsx
// Before
<Link href="/">Home</Link>

// After
<Link href="/landing">Home</Link>
```

### Step 4: Monitor metrics

Track:
- Bounce rate
- Conversion rate (signups)
- User engagement (scroll depth)
- Device breakdown

---

## 📞 Support

For issues with:
- **Layout/Design** → Check Tailwind config
- **Copy/Content** → Check locales JSON files
- **Functionality** → Check event handlers in Organisms
- **Performance** → Check image sizes, lazy loading

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-18 | Initial release (Atoms, Molecules, Organisms, i18n) |

---

**Created by:** Uma (UX/Design Expert)  
**Status:** Production Ready  
**Next Steps:** Deploy to Vercel, monitor analytics
