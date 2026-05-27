# Internal Linking Strategy

**Status Update — 2026-05-27:** componentes da Story 2.3 foram reconciliados e integrados nas páginas públicas na Story 2.6: `PublicNav`/`PublicFooter` em `/features`, `/pricing`, `/docs`; `Breadcrumb` em `/docs`; `SimilarProperties` em `/p/[slug]`.

## Overview

Internal linking é fundamental para SEO. Essa documentação descreve como Lodgra implementa uma arquitetura de links internos que:

- Melhora rastreamento e indexação pelo Google
- Distribui PageRank naturalmente entre páginas
- Oferece melhor UX através de navegação intuitiva
- Usa anchor text semântico e otimizado para SEO

## Architecture

### 1. Global Navigation Structure

**Header Navigation (todas as páginas públicas):**
```
Home → Funcionalidades
     → Planos
     → Documentação
     → [Locale Selector]
     → [Login]
     → [Ver Planos CTA]
```

**Footer Navigation:**
```
Navegação:  Home, Funcionalidades, Planos, Documentação
Suporte:    Contactar Suporte, Website Oficial
Legal:      Termos de Serviço, Política de Privacidade
```

### 2. Page-Specific Internal Links

#### Home Page (`/`)
- Hero Section: Link para "Ver Planos" → `/pricing`
- Features Section: Link para "Funcionalidades" → `/features`
- CTA Section: Link para "Documentação" → `/docs`

#### Features Page (`/features`)
- Hero CTA: "Ver Planos e Comparar" → `/pricing`
- Footer: Links de volta para Home, Pricing, Docs

#### Pricing Page (`/pricing`)
- Hero CTA: "Começar Agora" → `/register` (or checkout)
- Related Content: Link para "Funcionalidades" → `/features`

#### Documentation (`/docs`)
- Breadcrumb Navigation:
  ```
  Home > Documentação > [Section] > [Page]
  ```
- Internal Doc Links: Cada seção linkam para outras seções relacionadas

#### Property Pages (`/p/[slug]`)
- Similar Properties Section:
  - Mostra 3-5 propriedades similares na mesma localização
  - Cada uma é um link para `/p/[other-slug]`
  - Listadas em ordem de rating (best-rated first)

### 3. Components

#### PublicNav
Location: `src/components/landing/organisms/PublicNav.tsx`

Componente de navegação reutilizável para todas as páginas públicas:
- Header fixo no topo (z-50)
- Links para /features, /pricing, /docs
- Language selector
- Login + Ver Planos CTAs

```tsx
<PublicNav variant="light" compact={false} />
```

#### PublicFooter
Location: `src/components/landing/organisms/PublicFooter.tsx`

Footer com 4 colunas de links:
- Branding
- Navegação (Home, Funcionalidades, Planos, Documentação)
- Suporte (Contactar, Website)
- Legal (Termos, Privacidade)

```tsx
<PublicFooter />
```

#### SimilarProperties
Location: `src/components/properties/SimilarProperties.tsx`

Componente que renderiza propriedades similares por localização:
- Grid responsivo (1/2/3 colunas)
- Imagem, nome, localização, rating, preço
- Links internos para `/p/[slug]`

```tsx
<SimilarProperties 
  properties={similarProperties}
  title="Propriedades Similares"
/>
```

#### Breadcrumb
Location: `src/components/common/Breadcrumb.tsx`

Navegação breadcrumb para Docs e seções hierárquicas:
- Home > Documentação > Seção > Página
- Links semânticos
- Suporta itens "current" para a página ativa

```tsx
<Breadcrumb items={[
  { label: 'Documentação', href: '/docs' },
  { label: 'Começar', current: true },
]} />
```

## Data Flow

### Similar Properties Lookup

```
GET /p/[slug]
  ↓
getPropertyBySlug(slug)  [OG image + content data]
  ↓
getSimilarProperties(id, { city, limit: 5 })  [Supabase query]
  ↓
Query: properties WHERE city = ? AND id != ? AND is_public = true
       ORDER BY rating DESC LIMIT 5
  ↓
SimilarProperties component renders grid
```

### Query Optimization

- Index em `properties(city, is_public)` para fast filtering
- Limit a 5 resultados por padrão (carregamento rápido)
- Order by rating (mostra melhores propriedades primeiro)
- Exclude current property (evita auto-referência)

**Performance Target:** <200ms query time

## Anchor Text Strategy

### Guidelines

❌ **Avoid:**
- "Click here"
- "Read more"
- "Link"
- "See this page"
- URL como anchor text

✅ **Use:**
- Action-oriented: "Ver Planos", "Começar Agora"
- Descriptive: "Funcionalidades", "Documentação"
- Location-based: "Propriedades Similares em [City]"
- Keyword-relevant: "Preços de Aluguel por Temporada"

### Examples

| Page | Anchor Text | Target | Purpose |
|------|-------------|--------|---------|
| Home | "Funcionalidades" | /features | Distribui PageRank |
| Home | "Ver Planos" | /pricing | Conversion CTA |
| Features | "Comparar Preços" | /pricing | Internal linking |
| Property | "Propriedades em [City]" | /p/[slug] | Similar content |

## Testing

### Automated Checks

```bash
npm run test -- seo/internal-links.test.ts
```

Testes verificam:
- ✅ getSimilarProperties retorna dados corretos
- ✅ Links não incluem anchor text genérico
- ✅ Navegação é consistente
- ✅ Limit e sorting funcionam

### Manual Verification

1. **Navigation Crawl:**
   ```
   1. Aceder a /
   2. Verificar links para /features, /pricing, /docs
   3. Clicar em cada um
   4. Verificar links de volta para Home
   5. Verificar footer em todas as páginas
   ```

2. **Similar Properties:**
   ```
   1. Aceder a uma página de propriedade /p/[slug]
   2. Scroll para "Propriedades Similares"
   3. Verificar que aparecem 3-5 propriedades
   4. Clicar em uma
   5. Verificar que redireciona para /p/[other-slug]
   ```

3. **Breadcrumb:**
   ```
   1. Aceder a /docs
   2. Verificar breadcrumb: Home > Documentação
   3. Navegar para subseção
   4. Verificar breadcrumb: Home > Documentação > Seção
   5. Clicar em links no breadcrumb
   ```

## SEO Impact

### Signals Improved

- **Crawlability:** Google consegue rastrear todas as páginas importantes
- **PageRank Distribution:** Links internos distribuem autoridade entre páginas
- **Relevance:** Anchor text semântico melhora relevância de tópicos
- **User Experience:** Navegação clara reduz bounce rate

### Expected Metrics

- **Crawl Depth:** Máximo 3 clicks para qualquer página pública
- **Link Juice:** HomePage distribui 50% PageRank para Features/Pricing/Docs
- **Internal Link Ratio:** 80% links internos vs 20% externos
- **Anchor Text:** 100% semântico, 0% genérico

## Maintenance

### When Adding New Pages

1. Adicionar ao Header Navigation (`PublicNav`)
2. Adicionar ao Footer Navigation (`PublicFooter`)
3. Adicionar links contextuais na página
4. Testar links de volta para Home/Docs
5. Verificar breadcrumb (se aplicável)

### Monitoring

- Check crawl stats no Google Search Console
- Monitor "Most-Clicked Pages" para link patterns
- Verify "Link Performance" em GSC
- Track internal link CTR no analytics

## Related Files

- `src/components/landing/organisms/PublicNav.tsx` — Header navigation
- `src/components/landing/organisms/PublicFooter.tsx` — Footer links
- `src/components/properties/SimilarProperties.tsx` — Related properties
- `src/components/common/Breadcrumb.tsx` — Breadcrumb navigation
- `src/lib/supabase/properties.ts` — getSimilarProperties() function
- `docs/seo/og-images.md` — Related: Dynamic OG images
- `docs/stories/2.3.story.md` — Implementation story
