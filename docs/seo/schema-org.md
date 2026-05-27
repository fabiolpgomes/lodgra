# Schema.org & Rich Snippets Implementation

## Overview

Lodgra implementa dados estruturados em **JSON-LD** para melhorar a visibilidade nos motores de busca com **rich snippets** e rich results.

**Benefícios:**
- Rich snippets aumentam CTR em 20-30%
- Google indexa melhor propriedades com markup validado
- Melhora a confiança do utilizador (ratings, preços visíveis)
- Suporte para Google Vacation Rentals Program

---

## Architecture

### Ficheiros Principais

```
src/lib/seo/
├── jsonld.ts                # Generators para todos os schemas
│   ├── generatePropertyJsonLd()         → VacationRental (propriedades)
│   ├── generateLocalBusinessJsonLd()    → LocalBusiness (pages de prop)
│   ├── generateBreadcrumbJsonLd()       → BreadcrumbList (navegação)
│   ├── generateOrganizationJsonLd()     → Organization (empresa)
│   └── generateWebsiteJsonLd()          → WebSite (busca)
├── metadata.ts              # Metadata config
└── metaTags.ts              # Meta tags helpers
```

---

## Schemas Implementados

### 1. VacationRental (Propriedades)

**Localização:** `src/app/p/[slug]/page.tsx` (via `generatePropertyJsonLd`)

**Tipos inclusos:**
- **VacationRental** — tipo principal (Google Vacation Rentals)
- **Accommodation** — detalhes físicos (quartos, hóspedes)
- **Offer** — preço, moeda, disponibilidade
- **AggregateRating** — ratings e reviews
- **LocationFeatureSpecification** — amenities

**Exemplo:**
```json
{
  "@context": "https://schema.org",
  "@type": "VacationRental",
  "name": "Beach House Algarve",
  "description": "Luxury beach house with pool",
  "url": "https://lodgra.io/p/beach-house-algarve",
  "image": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua da Praia 123",
    "addressLocality": "Lagos",
    "postalCode": "8600-001",
    "addressCountry": "PT"
  },
  "containsPlace": {
    "@type": "Accommodation",
    "numberOfBedrooms": 3,
    "numberOfBathroomsTotal": 2,
    "occupancy": { "@type": "QuantitativeValue", "value": 6 }
  },
  "makesOffer": {
    "@type": "Offer",
    "price": 250,
    "priceCurrency": "EUR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 8.5,
    "ratingCount": 42,
    "bestRating": 10,
    "worstRating": 1
  }
}
```

---

### 2. LocalBusiness (Páginas de Propriedade)

**Localização:** `src/app/p/[slug]/page.tsx` (via `generateLocalBusinessJsonLd`)

**Tipos inclusos:**
- **LocalBusiness** — tipo principal
- **PostalAddress** — endereço
- **GeoCoordinates** — coordenadas GPS
- **AggregateRating** — ratings
- **Offer** — preço

**Diferença vs VacationRental:**
- Menos detalhes físicos
- Foco em ratings + contacto
- Ideal para rich snippets de negócio local

**Exemplo:**
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://lodgra.io/p/beach-house-algarve",
  "name": "Beach House Algarve",
  "description": "Luxury beach house with pool",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Rua da Praia 123",
    "addressLocality": "Lagos",
    "postalCode": "8600-001",
    "addressCountry": "PT"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.1644,
    "longitude": -8.6734
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 8.5,
    "ratingCount": 42
  },
  "offers": {
    "@type": "Offer",
    "price": 250,
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
```

---

### 3. BreadcrumbList (Navegação)

**Localização:** Futuro — páginas de navegação hierárquica

**Tipo:** BreadcrumbList com ListItem

**Exemplo:**
```json
{
  "@context": "https://schema.org",
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
      "name": "Documentação",
      "item": "https://lodgra.io/docs"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Getting Started",
      "item": "https://lodgra.io/docs/getting-started"
    }
  ]
}
```

---

### 4. Organization (Home Page)

**Localização:** `src/app/page.tsx` (via `generateOrganizationJsonLd`)

**Tipos inclusos:**
- **Organization** — tipo principal
- **ContactPoint** — contacto

**Exemplo:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Lodgra",
  "url": "https://lodgra.io",
  "logo": "https://lodgra.io/logo.png",
  "description": "Software de gestão de alojamentos para Airbnb, Booking.com e outros OTAs",
  "sameAs": [
    "https://facebook.com/lodgra",
    "https://twitter.com/lodgra",
    "https://linkedin.com/company/lodgra"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "suporte@lodgra.io",
    "availableLanguage": ["pt", "es", "en"]
  }
}
```

---

### 5. WebSite (Configuração Global)

**Localização:** `src/app/page.tsx` (via `generateWebsiteJsonLd`)

**Tipo:** WebSite com SearchAction

**Propósito:** Habilita search box no Google

---

## Integration with Next.js

### Metadata Export

Next.js 15 suporta `jsonLd` diretamente em `generateMetadata`:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const data = await fetchData(params)
  
  return {
    title: data.title,
    description: data.description,
    openGraph: { /* ... */ },
    jsonLd: [
      generateVacationRentalSchema(data),
      generateLocalBusinessSchema(data),
    ],
  }
}
```

**Rendered Output:**
```html
<script type="application/ld+json">
{...schema1...}
</script>
<script type="application/ld+json">
{...schema2...}
</script>
```

---

## Validation

### Online Validators

1. **Schema.org Validator** (oficial)
   - URL: https://validator.schema.org/
   - Valida sintaxe e conformidade

2. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Simula como Google vê o markup
   - **Recomendado para VacationRental**

3. **Structured Data Testing Tool** (Google)
   - URL: https://search.google.com/structured-data/testing-tool/
   - Legado mas útil para debugging

### How to Validate

1. **Local Dev:**
   ```bash
   npm run dev
   # Abrir http://localhost:3000/p/[slug]
   # Inspecionar HTML, procurar <script type="application/ld+json">
   # Copiar JSON para validator.schema.org
   ```

2. **Production:**
   - Usar Google Search Console → Enhancements
   - Verificar "Rich Results" status
   - Monitorar errors/warnings

---

## Testing

### Teste Unitário (src/__tests__/seo/schema.test.ts)

```typescript
import { generateLocalBusinessJsonLd } from '@/lib/seo/jsonld'

describe('Schema.org Generators', () => {
  it('should generate valid LocalBusiness JSON-LD', () => {
    const schema = generateLocalBusinessJsonLd({
      name: 'Test Property',
      city: 'Lagos',
      country: 'Portugal',
      // ... more fields
    })
    
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('LocalBusiness')
    expect(schema.name).toBe('Test Property')
    expect(schema.address.addressCountry).toBe('PT')
  })
})
```

### Manual Testing

1. **Inspecionar HTML:**
   ```bash
   curl http://localhost:3000/p/beach-house-algarve | grep "application/ld+json"
   ```

2. **Validar em validator.schema.org:**
   - Copiar JSON completo
   - Colar em Schema.org Validator
   - Verificar errors/warnings

3. **Testar em Google Rich Results Test:**
   - Colocar URL da property
   - Google simula como renderiza

---

## i18n Considerations

Schema.org é **agnóstico a idioma** — recomendação:

- ✅ Usar o idioma da página em `description` (em português para `/pt/p/[slug]`)
- ✅ Não duplicar schema para cada idioma
- ✅ Usar códigos de país standard (PT, ES, BR, EN)
- ❌ Não traduzir nomes de schema ou propriedades

**Exemplo:**
```typescript
// Correcto: Descrição em PT, schema igual
const locale = 'pt'
const description = 'Propriedade em Lagos com piscina' // PT
const schema = generateLocalBusinessJsonLd({ 
  description, // Usa PT
  // ... rest igual
})

// Funciona em /pt/p/slug e /es/p/slug sem duplicação
```

---

## Performance

### Caching Strategy

- **Properties:** Revalidate a cada mudança (dinâmico)
- **Organization/WebSite:** Cache indefinido (estático)
- **No CDN impact:** JSON-LD é renderizado server-side

### File Size

Exemplo de LocalBusiness com ratings:
```
Generated JSON: ~1.2 KB
HTML <script> overhead: ~200 bytes
---
Total: ~1.4 KB per page
```

**Impact:** Negligível (< 0.1% do page size)

---

## Troubleshooting

### JSON-LD não aparece em validator

1. ✅ Verificar que URL é pública (is_public=true)
2. ✅ Verificar que slug existe em DB
3. ✅ Inspecionar HTML: `curl URL | grep "application/ld+json"`
4. ✅ Verificar console errors

### Schema.org Validator mostra erros

1. ✅ Verificar que '@context' = 'https://schema.org'
2. ✅ Verificar que '@type' é schema válido
3. ✅ Verificar required properties conforme tipo
4. ✅ Usar validator.schema.org para erro exacto

### Google Rich Results Test mostra warnings

1. ✅ Verificar que URL é indexada (robots.txt permite)
2. ✅ Verificar que schema é tipo reconhecido por Google
3. ✅ Re-testar depois de 24h (Google cache)

---

## Future Improvements

- [ ] FAQSchema para FAQ pages
- [ ] ArticleSchema para blog posts
- [x] BreadcrumbList completo para /docs
- [ ] ProductSchema para /pricing (opcional)
- [ ] Video markup para property videos
- [ ] Analytics tracking para social shares
- [ ] A/B test diferentes schemas para CTR

---

## Related Files

- [`src/lib/seo/jsonld.ts`](../../src/lib/seo/jsonld.ts) — Generator functions
- [`src/app/p/[slug]/page.tsx`](../../src/app/p/[slug]/page.tsx) — Property page metadata
- [`src/app/page.tsx`](../../src/app/page.tsx) — Home page metadata
- [`docs/seo/og-images.md`](./og-images.md) — OG images (complementary)
- [`docs/seo/technical-issues.md`](./technical-issues.md) — SEO audit details

---

## References

- **Google Vacation Rentals:** https://developers.google.com/search/docs/appearance/structured-data/vacation-rental
- **Schema.org:** https://schema.org/
- **JSON-LD:** https://json-ld.org/
- **Next.js Metadata:** https://nextjs.org/docs/app/building-your-application/optimizing/metadata
