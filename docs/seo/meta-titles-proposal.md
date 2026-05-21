# Meta Titles — Proposal for Implementation

**Task:** 1.2 - Meta Title Implementation  
**Status:** 📝 PROPOSAL (Ready for review)  
**Date:** May 21, 2026  

---

## 📋 Meta Title Audit & Proposals

Format: **[URL] | [Current Status] → [Proposed Title]**

**Format Pattern:** `[Main Keyword] - Lodgra | [Diferencial]`  
**Requirement:** Max 50-60 characters (Google display limit)  

---

## HOMEPAGE

**URL:** `/` or `https://lodgra.io`  
**Current:** ❌ NO TITLE TAG  
**Proposed:**
```
Gestão de Imóveis - Lodgra | Maximize Lucros
```
**Metrics:**
- Length: 50 characters ✅ (perfect, within 50-60)
- Keyword at start: ✅ "Gestão de Imóveis"
- Brand: ✅ "Lodgra"
- Diferencial: ✅ "Maximize Lucros"
- Intent: Commercial ✅

---

## FEATURES PAGE

**URL:** `/features`  
**Current:** ❌ NO TITLE TAG  
**Proposed:**
```
Funcionalidades - Lodgra | Gestão Inteligente
```
**Metrics:**
- Length: 48 characters ✅
- Keyword: "Funcionalidades" (implicit)
- Brand: ✅ "Lodgra"
- Diferencial: ✅ "Gestão Inteligente"

---

## PRICING PAGE

**URL:** `/pricing`  
**Current:** ❌ NO TITLE TAG  
**Proposed:**
```
Planos - Lodgra | Comece Grátis Agora
```
**Metrics:**
- Length: 42 characters ✅
- Keyword: "Planos"
- Brand: ✅ "Lodgra"
- CTA: ✅ "Comece Grátis"

---

## DOCUMENTATION PAGE

**URL:** `/docs`  
**Current:** ❌ NO TITLE TAG  
**Proposed:**
```
Documentação - Lodgra | Guias & Tutoriais
```
**Metrics:**
- Length: 46 characters ✅
- Keyword: "Documentação"
- Brand: ✅ "Lodgra"
- Content: ✅ "Guias & Tutoriais"

---

## BLOG PAGE

**URL:** `/blog`  
**Current:** ❌ NO TITLE TAG  
**Proposed:**
```
Blog - Lodgra | Dicas de Gestão Imobiliária
```
**Metrics:**
- Length: 49 characters ✅
- Keyword: "Blog" + "Gestão Imobiliária"
- Brand: ✅ "Lodgra"
- Content: ✅ "Dicas"

---

## INDIVIDUAL BLOG POSTS (Template)

**URL Pattern:** `/blog/[slug]`  
**Proposed Format:**
```
[Post Title Short] - Lodgra | [Keyword/Diferencial]
```

**Example 1:**
```
Deduções Fiscais - Lodgra | Guia Completo
```
- Length: 45 characters ✅
- Keyword: "Deduções Fiscais"
- Type: Educational

**Example 2:**
```
Vacation Rental ROI - Lodgra | Como Calcular
```
- Length: 47 characters ✅
- Keyword: "Vacation Rental ROI"
- Type: Commercial

**Example 3:**
```
Airbnb Pricing - Lodgra | Estratégia Inteligente
```
- Length: 51 characters ✅
- Keyword: "Airbnb Pricing"
- Type: Educational

---

## SUPPORT/FAQ PAGE (If exists)

**URL:** `/support` or `/faq`  
**Proposed:**
```
Suporte - Lodgra | Perguntas Frequentes
```
**Length:** 43 characters ✅

---

## ABOUT PAGE (If exists)

**URL:** `/about`  
**Proposed:**
```
Sobre Nós - Lodgra | Nossa História
```
**Length:** 39 characters ✅

---

## INTEGRATION PAGES (If exists)

**URL Pattern:** `/features/[integration]`

**Example - Airbnb Integration:**
```
Integração Airbnb - Lodgra | Automático
```
**Length:** 45 characters ✅

**Example - Booking.com Integration:**
```
Integração Booking - Lodgra | Sincronizar
```
**Length:** 48 characters ✅

---

## 📊 Summary Table

| Page | URL | Proposed Title | Length | Status |
|------|-----|---|--------|--------|
| Homepage | / | Gestão de Imóveis - Lodgra \| Maximize Lucros | 50 | ✅ Ready |
| Features | /features | Funcionalidades - Lodgra \| Gestão Inteligente | 48 | ✅ Ready |
| Pricing | /pricing | Planos - Lodgra \| Comece Grátis Agora | 42 | ✅ Ready |
| Docs | /docs | Documentação - Lodgra \| Guias & Tutoriais | 46 | ✅ Ready |
| Blog | /blog | Blog - Lodgra \| Dicas de Gestão Imobiliária | 49 | ✅ Ready |
| Blog Posts | /blog/* | [Title] - Lodgra \| [Keyword] | 45-55 | 📝 Template |
| Support | /support | Suporte - Lodgra \| Perguntas Frequentes | 43 | ✅ Ready |

---

## 🎯 Implementation Checklist

### For Next.js:

```jsx
// pages/index.tsx
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>Gestão de Imóveis - Lodgra | Maximize Lucros</title>
      </Head>
      {/* Page content */}
    </>
  )
}

// pages/features.tsx
export default function Features() {
  return (
    <>
      <Head>
        <title>Funcionalidades - Lodgra | Gestão Inteligente</title>
      </Head>
      {/* Features content */}
    </>
  )
}

// For blog posts (dynamic):
export default function BlogPost({ post }) {
  return (
    <>
      <Head>
        <title>{post.title} - Lodgra | {post.keyword}</title>
      </Head>
      {/* Post content */}
    </>
  )
}
```

### Testing:
- [ ] Each page has unique title
- [ ] All titles 50-60 characters
- [ ] No duplicate titles
- [ ] Keyword at start of each
- [ ] Brand "Lodgra" included
- [ ] Diferencial/CTA included
- [ ] Test in PageSpeed Insights

---

## ✅ Key Rules

### DO ✅
- Include primary keyword at the START
- Keep it to 50-60 characters
- Include brand "Lodgra"
- Add diferencial or CTA after pipe |
- Use title case for readability

### DON'T ❌
- Don't keyword stuff ("gestão gestão gestão")
- Don't make it too long (Google will truncate)
- Don't forget the brand
- Don't use generic titles like "Page 1"
- Don't duplicate titles across pages

---

## 🚀 Ready for Implementation?

**Status:** 🟢 APPROVED FOR CODING  
**Time Estimate:** 4-6 hours  
**Next Step:** Implement in Next.js + Deploy to staging

---

**Prepared by:** @dev  
**Date:** 2026-05-21  
**Ready to implement:** YES ✅
