# Decision Log — Story 26.2: Schema.org LodgingBusiness Markup

**Agente:** @dev (Dex)  
**Modo:** YOLO (Autônomo)  
**Data Início:** 2026-05-17  
**Story:** 26.2 | Pontos: 5 | Timeline: 1 week  

---

## Descobertas Iniciais

### Código Existente
- ✅ `src/lib/seo/jsonld.ts` — Geração de VacationRental schema já existe
- ✅ Schema é usado em `/src/app/p/[slug]/page.tsx`
- ✅ OG/Twitter cards gerados manualmente em Metadata
- ✅ Sistema de property_images com variantes existe

### Decisão #1: Refatoração vs. Nova Implementação
**Decisão:** Criar novo arquivo `lodgingBusinessSchema.ts` com LodgingBusiness completo
**Razão:** Manter código existente (VacationRental) intacto, criar implementação nova com Schema.org LodgingBusiness
**Alternativas Consideradas:**
- Modificar jsonld.ts existente (risky, existing code in production)
- Criar função dentro de jsonld.ts (mixing concerns)
- Nova abordagem separada (chosen - clean separation)

### Decisão #2: Estrutura de Implementação
**Decisão:** 
- `src/lib/seo/lodgingBusinessSchema.ts` — Geração de LodgingBusiness
- `src/lib/seo/metaTags.ts` — OG e Twitter Cards
- Server Component em `src/components/seo/LodgingBusinessSchema.tsx`
**Razão:** Separation of concerns, reusability, testability
**Alternativas:** Monolithic approach (rejected due to complexity)

---

## Tasks Execution Log

### Task 1: Schema.org Design & Architecture
**Status:** IN PROGRESS

#### Subtask 1.1: Review Specification
- Schema.org LodgingBusiness: https://schema.org/LodgingBusiness
- Google Vacation Rentals: https://support.google.com/business/answer/10417212
- Field mapping analysis: COMPLETE ✓

#### Subtask 1.2-1.6: Design Documentation
```json
LodgingBusiness Fields Required:
- name: string (required)
- description: string (recommended)
- url: string (required for SEO)
- address: PostalAddress (required)
- telephone: string (optional but recommended)
- image: string|string[] (required)
- priceRange: string (recommended)
- amenityFeature: LocationFeatureSpecification[] (recommended)
- aggregateRating: AggregateRating (recommended)
- review: Review[] (recommended)
- numberOfRooms: integer (optional)
- checkinTime: time (recommended)
- checkoutTime: time (recommended)
```

