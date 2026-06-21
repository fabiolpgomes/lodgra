# Sistema de Avaliações e Reviews

## Visão Geral

O sistema de avaliações (reviews) do Lodgra coleta e agrega avaliações de múltiplas plataformas OTA (Online Travel Agencies) e apresenta uma avaliação consolidada na página pública da propriedade.

**Data da última atualização:** 2026-06-21  
**Status:** ✅ Corrigido - Cálculo de normalização ajustado

---

## Arquitetura

### Fluxo de Dados

```
Plataformas Externas (API)
    ↓
Review Clients (Google, Airbnb, TripAdvisor, Booking)
    ↓
Normalização para escala 1-10
    ↓
Banco de dados (property_reviews)
    ↓
Página Pública (/p/[slug])
    ↓
Agregação e cálculo de média
    ↓
Exibição (PropertyReviewScore)
```

---

## Escalas Nativas e Normalização

### Escalas das Plataformas

| Plataforma | Escala Nativa | Normalização |
|-----------|---|---|
| **Booking.com** | 1-10 | Sem conversão (já está em 1-10) |
| **Airbnb** | 1-5 | Convertido para 1-10: `(rating / 5) * 10` |
| **Google My Business** | 1-5 | Convertido para 1-10: `(rating / 5) * 10` |
| **TripAdvisor** | 1-5 | Convertido para 1-10: `(rating / 5) * 10` |
| **Reserva Direta** | 1-10 | Sem conversão (já está em 1-10) |
| **Outra** | 1-10 | Sem conversão (já está em 1-10) |

### Exemplo de Normalização

**Antes de salvar no BD:**
- Google rating: 4.25/5 → `(4.25 / 5) * 10` → 8.5/10
- Airbnb rating: 4.5/5 → `(4.5 / 5) * 10` → 9.0/10

**Salvo no BD:** Sempre em escala 1-10
- Todos os ratings estão na coluna `property_reviews.rating` em escala 1-10

---

## Schema do Banco de Dados

### Tabela: `property_reviews`

```sql
CREATE TABLE property_reviews (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid         NOT NULL REFERENCES organizations(id),
  property_id     uuid         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source          text         NOT NULL CHECK (source IN ('booking', 'airbnb', 'google', 'tripadvisor', 'direct', 'other')),
  reviewer_name   text         NOT NULL,
  rating          numeric(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),  -- ⚠️ SEMPRE 1-10!
  review_text     text         CHECK (review_text IS NULL OR char_length(review_text) <= 500),
  review_date     date         NOT NULL,
  is_featured     boolean      NOT NULL DEFAULT false,
  created_at      timestamptz  DEFAULT now(),
  updated_at      timestamptz  DEFAULT now()
);
```

**Pontos-chave:**
- `rating` sempre está em escala **1-10** (garantido pelo CHECK)
- Normalização ocorre **antes** de salvar (nos review clients)
- Cada review mantém o `source` para referência

---

## Cálculo de Avaliação Agregada

### Lógica (Corrigida em 2026-06-21)

```typescript
// Arquivo: /src/app/p/[slug]/page.tsx

if (reviews.length > 0) {
  // ✅ CORRETO: Todos os ratings já estão em escala 1-10 no BD
  const globalAvg = Math.round(
    (reviews.reduce((s: number, r: { rating: number }) =>
      s + Number(r.rating), 0) / reviews.length) * 10
  ) / 10

  // Calcular média por fonte
  const bySourceMap = new Map<string, number[]>()
  for (const r of reviews) {
    if (!bySourceMap.has(r.source)) bySourceMap.set(r.source, [])
    bySourceMap.get(r.source)!.push(Number(r.rating))
  }

  const bySource = Array.from(bySourceMap.entries()).map(([source, ratings]) => {
    const nativeAvg = Math.round((ratings.reduce((s: number, v: number) => s + v, 0) / ratings.length) * 10) / 10
    const nativeMax = 10  // ✅ SEMPRE 10, não diferenciado por source
    return { source: source as ReviewSource, avg: nativeAvg, nativeAvg, nativeMax, count: ratings.length }
  })

  reviewScore = { globalAvg, totalCount: reviews.length, bySource }
}
```

### Exemplo de Cálculo

**Dados no BD:**
- Booking: 8.0/10
- TripAdvisor: 8.5/10 (pré-normalizado de 4.25/5)
- Google: 7.5/10 (pré-normalizado de 3.75/5)

**Cálculo:**
```
globalAvg = (8.0 + 8.5 + 7.5) / 3 = 24.0 / 3 = 8.0/10 ✅
```

**Exibição:**
```
Avaliação global: 8.0/10 (Muito Bom)
  Booking.com: 8.0/10 (1 avaliação)
  TripAdvisor: 8.5/10 (1 avaliação)
  Google: 7.5/10 (1 avaliação)
```

---

## Bug Corrigido (2026-06-21)

### Problema Original

**Sintoma:** A avaliação agregada exibia **12.5/10** para Booking 8.0 + TripAdvisor 8.5

**Causa:** O código tentava re-normalizar ratings que já estavam normalizados

**Código Bugado:**
```typescript
const SOURCE_MAX = {
  booking: 10, airbnb: 5, google: 5, tripadvisor: 5, direct: 10, other: 10
}
const toBase10 = (rating: number, source: string) =>
  (rating / (SOURCE_MAX[source] ?? 10)) * 10

// Resultado: (8.0 + (8.5/5)*10) / 2 = (8.0 + 17) / 2 = 12.5 ❌
```

### Correção Aplicada

- ✅ Removido `SOURCE_MAX` diferenciado
- ✅ Removida função `toBase10()` redundante
- ✅ Simplificado para cálculo direto (ratings já estão normalizados)
- ✅ Documentada a suposição de que todos os ratings estão em 1-10

**Commit:** `c9c0b72` - "fix: correct rating calculation by removing redundant normalization"

---

## Review Clients (Normalização)

### Google My Business Client
**Arquivo:** `/src/lib/reviews/google-client.ts`

```typescript
private normalizeRating(rating: number): number {
  return Math.round((rating / 5) * 10 * 2) / 2 // Round to nearest 0.5, escala 1-5 → 1-10
}
```

### Airbnb Client
**Arquivo:** `/src/lib/reviews/airbnb-client.ts`

```typescript
private normalizeRating(rating: number): number {
  return Math.round((rating / 5) * 10 * 2) / 2 // Round to nearest 0.5, escala 1-5 → 1-10
}
```

### Booking Client
**Arquivo:** `/src/lib/reviews/booking-client.ts`

```typescript
// Nenhuma normalização necessária (já em 1-10)
```

### Review Aggregator
**Arquivo:** `/src/lib/reviews/review-aggregator.ts`

Agrega reviews deduplica por hash (reviewer_name + comment + review_date)

```typescript
const stats: ReviewStats = {
  totalReviews: reviews.length,
  averageRating: reviews.length > 0 
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 
    : 0,
  // ...
}
```

---

## Componentes de UI

### PropertyReviewScore
**Arquivo:** `/src/components/common/public/content/PropertyReviewScore.tsx`

Exibe:
1. **Avaliação Global** (grande, em destaque)
   - Valor: `reviewScore.globalAvg.toFixed(1)`
   - Label de qualidade baseado no valor (Excepcional, Excelente, Muito Bom, Bom, etc.)

2. **Avaliações por Fonte** (cards pequenos)
   - Mostra `nativeAvg / nativeMax` para cada fonte
   - Com 2+ fontes: exibe grid de 2-3 colunas
   - Com 1 fonte: não exibe grid (apenas score global)

**Exemplo de output:**
```
AVALIAÇÕES
8.0/10 Muito Bom
Baseado em 3 avaliações

[Booking.com: 8.0/10]  [TripAdvisor: 8.5/10]  [Google: 7.5/10]
```

---

## Qualidade de Label

```typescript
function qualityLabel(avg: number): { text: string; color: string } | null {
  if (avg >= 9.5) return { text: 'Excepcional', color: 'text-emerald-600' }
  if (avg >= 9)   return { text: 'Excelente',   color: 'text-emerald-600' }
  if (avg >= 8)   return { text: 'Muito Bom',   color: 'text-brand-600' }
  if (avg >= 7)   return { text: 'Bom',         color: 'text-brand-500' }
  if (avg >= 6)   return { text: 'Satisfatório', color: 'text-gray-600' }
  return null
}
```

---

## Testes

### Cobertura

- `src/__tests__/feeds/google-feed-reviews.test.ts` - Google review normalization
- `src/__tests__/seo/schema.test.ts` - JSON-LD schema with ratings

### Executar Testes

```bash
# Testes relacionados a reviews
npm run test:ci -- --testNamePattern="rating|review"

# Suite completa
npm run test:ci
```

---

## Integração com Schema.org

### JSON-LD LodgingBusiness

A avaliação agregada é incluída no schema JSON-LD para SEO:

```json
{
  "@type": "LodgingBusiness",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 8.0,
    "reviewCount": 3,
    "bestRating": 10,
    "worstRating": 1
  },
  "review": [
    {
      "@type": "Review",
      "author": "John Doe",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": 8,
        "bestRating": 10,
        "worstRating": 1
      },
      "reviewBody": "Great property!"
    }
  ]
}
```

**Arquivo:** `/src/lib/seo/lodgingBusinessSchema.ts`

---

## Checklist de Manutenção

- [ ] Ao adicionar nova OTA: Implementar review client com normalização para 1-10
- [ ] Testar cálculo de média com múltiplas fontes
- [ ] Validar schema CHECK no BD está correto (1.0 <= rating <= 10.0)
- [ ] Atualizar documentação se mudar escalas nativas de plataformas

---

## Referências

- **Migrations:** `supabase/migrations/20260510_01_property_reviews.sql`
- **Review Clients:** `/src/lib/reviews/`
- **Page Component:** `/src/app/p/[slug]/page.tsx`
- **UI Component:** `/src/components/common/public/content/PropertyReviewScore.tsx`
- **Schema:** `/src/lib/seo/lodgingBusinessSchema.ts`

