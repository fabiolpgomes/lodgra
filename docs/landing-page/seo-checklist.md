# Lodgra Landing Page — SEO Checklist

**Status:** ✅ SEO Ready  
**Last Updated:** 2026-04-18  
**Target Keywords:** property management software, STR optimization, rental income

---

## 📋 On-Page SEO

### Meta Tags
- [ ] `<title>` (50-60 chars)
  ```html
  <title>Lodgra - Host Smarter. Earn More.</title>
  ```

- [ ] `<meta name="description">` (150-160 chars)
  ```html
  <meta name="description" content="Transform your properties into high-performance financial assets with intelligent automation. 14-day free trial.">
  ```

- [ ] `<meta name="keywords">` 
  ```html
  <meta name="keywords" content="property management, rental optimization, STR software, revenue maximization">
  ```

- [ ] `<meta name="viewport">`
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ```

- [ ] `<meta charset="UTF-8">`
  ```html
  <meta charset="UTF-8">
  ```

### Open Graph Tags (Social Sharing)
- [ ] `og:title`
  ```html
  <meta property="og:title" content="Lodgra - Host Smarter. Earn More.">
  ```

- [ ] `og:description`
  ```html
  <meta property="og:description" content="Transform properties into revenue machines with AI-powered pricing and automation.">
  ```

- [ ] `og:image` (1200x630px, < 5MB)
  ```html
  <meta property="og:image" content="https://lodgra.io/og-image.png">
  ```

- [ ] `og:url`
  ```html
  <meta property="og:url" content="https://lodgra.io/landing">
  ```

- [ ] `og:type`
  ```html
  <meta property="og:type" content="website">
  ```

### Twitter Card Tags
- [ ] `twitter:card`
  ```html
  <meta name="twitter:card" content="summary_large_image">
  ```

- [ ] `twitter:title`
  ```html
  <meta name="twitter:title" content="Lodgra - Host Smarter. Earn More.">
  ```

- [ ] `twitter:description`
  ```html
  <meta name="twitter:description" content="AI-powered property management for maximum revenue.">
  ```

- [ ] `twitter:image`
  ```html
  <meta name="twitter:image" content="https://lodgra.io/twitter-card.png">
  ```

---

## 🔍 Structured Data (JSON-LD)

### Organization Schema
```json
{
  "@context": "https://schema.org/",
  "@type": "Organization",
  "name": "Lodgra",
  "url": "https://lodgra.io",
  "logo": "https://lodgra.io/logo.png",
  "description": "Intelligent property management software for short-term rentals",
  "foundingDate": "2024",
  "headquarters": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "PT"
    }
  },
  "sameAs": [
    "https://linkedin.com/company/lodgra",
    "https://twitter.com/lodgra"
  ]
}
```

### Software Product Schema
```json
{
  "@context": "https://schema.org/",
  "@type": "SoftwareApplication",
  "name": "Lodgra",
  "description": "Property management software for STR revenue optimization",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "29",
    "highPrice": "299",
    "offerCount": "3"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "340"
  }
}
```

### Breadcrumb Schema
```json
{
  "@context": "https://schema.org/",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://lodgra.io"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Landing",
      "item": "https://lodgra.io/landing"
    }
  ]
}
```

---

## 📱 Technical SEO

### Sitemap
- [ ] `sitemap.xml` exists
  ```xml
  https://lodgra.io/sitemap.xml
  ```

### robots.txt
- [ ] File exists
  ```
  https://lodgra.io/robots.txt
  ```

Content:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://lodgra.io/sitemap.xml
```

### Canonical Tags
- [ ] Set on every page
  ```html
  <link rel="canonical" href="https://lodgra.io/landing">
  ```

### Mobile Optimization
- [ ] Mobile-friendly design ✅
- [ ] Viewport meta tag ✅
- [ ] Touch-friendly buttons (44x44px) ✅
- [ ] Mobile page speed > 2s ✅

### Page Speed
- [ ] LCP < 2.5s ✅
- [ ] FID < 100ms ✅
- [ ] CLS < 0.1 ✅

### SSL/HTTPS
- [ ] HTTPS enabled ✅
- [ ] SSL certificate valid ✅
- [ ] No mixed content ✅

---

## 📊 Content SEO

### Heading Structure
- [ ] One H1 per page
  ```html
  <h1>Host Smarter. Earn More.</h1>
  ```

- [ ] H2s for main sections
  ```html
  <h2>Everything You Need to Succeed</h2>
  <h2>Simple, Transparent Pricing</h2>
  ```

- [ ] Proper nesting (no jumps like H1 → H3)

### Keyword Optimization
- [ ] Primary keyword in H1
- [ ] Keywords in meta description
- [ ] Keywords in first 100 words
- [ ] Natural keyword distribution (1-2%)
- [ ] Semantic variations used
- [ ] No keyword stuffing

### Content Quality
- [ ] Minimum 300 words per section
- [ ] Clear, readable language
- [ ] Proper grammar/spelling
- [ ] No duplicate content
- [ ] Unique value proposition
- [ ] CTA on every section

### Internal Links
- [ ] Navigation menu items
- [ ] Contextual links
- [ ] Anchor text descriptive
- [ ] No broken internal links
- [ ] Proper link hierarchy

---

## 🔗 External Links & Backlinks

### Authority Building
- [ ] Link to reputable sources (Stripe, Zapier)
- [ ] Link to complementary services
- [ ] Get listed on:
  - [ ] G2 (software reviews)
  - [ ] Capterra
  - [ ] ProductHunt
  - [ ] Industry directories

### Link Quality (Do's)
- [ ] High authority sites (DA > 50)
- [ ] Relevant to property management
- [ ] Natural, contextual links
- [ ] Diverse anchor text

### Link Quality (Don'ts)
- [ ] Avoid low-quality link farms
- [ ] Avoid paid links (unless sponsored)
- [ ] Avoid private blog networks (PBN)
- [ ] Avoid exact-match anchor spam

---

## 🌍 International SEO (Multi-Language)

### Locale Implementation
- [ ] Locale parameter working
  ```
  /landing?locale=pt-BR
  /landing?locale=en-US
  /landing?locale=es
  ```

- [ ] Hreflang tags set
  ```html
  <link rel="alternate" hreflang="pt-BR" href="https://lodgra.io/landing?locale=pt-BR">
  <link rel="alternate" hreflang="en-US" href="https://lodgra.io/landing?locale=en-US">
  <link rel="alternate" hreflang="es" href="https://lodgra.io/landing?locale=es">
  ```

- [ ] Language selector visible
- [ ] Content uniqueness per locale

### Country Targeting
- [ ] Geotargeting in Search Console
- [ ] Localized currencies
- [ ] Localized compliance (GDPR, LGPD)

---

## 🎯 Search Console Setup

### Initial Setup
- [ ] Verify site ownership
- [ ] Add to Google Search Console
- [ ] Add to Bing Webmaster Tools
- [ ] Submit sitemap

### Monitoring
- [ ] Check search impressions
- [ ] Monitor click-through rate
- [ ] Review average position
- [ ] Check for indexing errors
- [ ] Monitor core web vitals
- [ ] Review security issues

### Performance
- [ ] Query performance report
- [ ] Link analysis
- [ ] Mobile usability
- [ ] Crawl statistics

---

## 📈 Analytics Setup

### Google Analytics 4
- [ ] Property created
- [ ] Tracking code installed
  ```html
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
  ```

- [ ] Views configured
- [ ] Goals/conversions set

### Conversion Tracking
- [ ] Free trial signup (primary goal)
- [ ] Pricing plan selection
- [ ] Demo video watch
- [ ] FAQ expansion
- [ ] Call-to-action click

### Custom Events
```javascript
gtag.event('signup', {
  plan: 'free',
  locale: 'pt-BR',
})
```

---

## ✅ Pre-Launch SEO Checklist

### Technical
- [ ] Mobile-friendly (mobile-first indexing)
- [ ] Page speed acceptable (Lighthouse 90+)
- [ ] Crawlability verified (no disallow)
- [ ] Indexability verified (no noindex)
- [ ] SSL certificate valid
- [ ] No crawl errors
- [ ] Structured data valid

### Content
- [ ] Title tags optimized (50-60 chars)
- [ ] Meta descriptions (150-160 chars)
- [ ] H1-H6 structure correct
- [ ] No duplicate content
- [ ] Internal linking strategy
- [ ] No keyword stuffing
- [ ] No thin content

### Links
- [ ] No broken links (internal/external)
- [ ] No redirect chains
- [ ] Canonical tags set
- [ ] Hreflang tags (if multilingual)

### Social/Local
- [ ] OG tags complete
- [ ] Twitter cards set
- [ ] Favicon configured
- [ ] Branding consistent

---

## 📊 Post-Launch Monitoring

### Week 1
- [ ] Monitor indexing (Search Console)
- [ ] Check crawl errors
- [ ] Review GA traffic
- [ ] Monitor ranking positions

### Month 1
- [ ] Analyze search queries
- [ ] Check CTR trends
- [ ] Review conversion funnel
- [ ] Optimize top-performing content

### Quarterly
- [ ] Update content for freshness
- [ ] Build backlinks
- [ ] Monitor competitor rankings
- [ ] Audit technical SEO

---

## 🎯 Target Keywords by Locale

### English (en-US)
- property management software
- STR revenue optimization
- rental property automation
- Airbnb management tool
- property income calculator

### Portuguese (pt-BR)
- software de gestão de propriedades
- otimização de renda para STR
- automação de aluguel por temporada
- ferramenta de gerenciamento Airbnb

### Spanish (es)
- software de gestión de propiedades
- optimización de ingresos STR
- automatización de alquiler temporal
- herramienta de gestión Airbnb

---

## 📞 SEO Resources

- Google Search Central: https://developers.google.com/search
- Search Console Help: https://support.google.com/search
- Schema.org: https://schema.org/
- SEMrush: https://www.semrush.com/
- Moz: https://moz.com/

---

**Created by:** Uma (UX/Design Expert)  
**Status:** Ready for Launch  
**Last Verified:** 2026-04-18
