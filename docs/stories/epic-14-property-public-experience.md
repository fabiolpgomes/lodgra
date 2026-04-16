# Epic 14: Property Public Experience — Premium Landing Pages

**Status:** 🔵 In Planning
**Prioridade:** P1 — Diferenciação de produto e conversão de clientes
**Depende de:** Epic 8 (Pricing Tiers ✅ Done)

---

## Visão

Transformar a página pública de propriedade (`/p/[slug]`) numa experiência premium inspirada na Holidu — com galeria imersiva, booking widget moderno e design system consistente com a marca Home Stay.

Cada propriedade activa numa organização tem automaticamente uma página pública com URL `/p/[slug]`. O número de páginas públicas disponíveis é determinado pelo plano contratado (Starter = 3, Professional = 10, Business = ilimitado), pois corresponde directamente ao limite de propriedades activas.

---

## Objectivos de Negócio

| Objectivo | Métrica |
|-----------|---------|
| Aumentar conversão directa (sem OTA) | Click-through no CTA de reserva |
| Diferenciar Home Stay das OTAs | Brand recall + avaliações NPS |
| Aumentar upsell para planos superiores | % upgrade após ver limite atingido |
| Posicionar produto como premium | Avaliação qualitativa dos gestores |

---

## Planos e Feature Gate

| Plano | Propriedades Activas | Páginas Públicas `/p/[slug]` |
|-------|---------------------|------------------------------|
| Starter | Até 3 | Até 3 |
| Professional | Até 10 | Até 10 |
| Business | Ilimitado | Ilimitado |

> A feature gate já está implementada (Story 8.1). O limite de páginas públicas é idêntico ao limite de propriedades activas — não há enforcement adicional necessário.

---

## Stories

| Story | Título | Prioridade | Esforço | Depende de | Status |
|-------|--------|-----------|---------|------------|--------|
| 14.1 | Design System — Home Stay Brand Tokens | P1 | XS | — | ✅ Done |
| 14.4 | PWA — Brand Tokens no Manifest + Splash | P1 | XS | 14.1 | 🔵 Ready |
| 14.2 | Property Landing Page V2 (Holidu-like) | P1 | L | 14.1 | 🔵 Ready |
| 14.5 | Landing Page — Redesign com Design System | P1 | M | 14.1 | 🔵 Ready |
| 14.3 | Gestão de Páginas Públicas no Dashboard | P2 | M | 14.2 | 🔵 Ready |

## Ordem de Implementação Recomendada

```
14.1 ✅ → 14.4 → 14.2 → 14.5 → 14.3
           (XS)   (L)   (M)   (M)
           ~1h   ~3d   ~2d   ~2d
```

Razão: 14.4 é quick win que valida os tokens no PWA.
14.2 é o core do produto (páginas de propriedades).
14.5 e 14.3 ampliam o impacto para toda a plataforma.

---

## Referências

- Holidu PT: https://www.holidu.pt/
- Página actual: `/p/[slug]` → `src/app/p/[slug]/page.tsx`
- Planos: `src/lib/billing/plans.ts`
- Componentes públicos actuais: `src/components/public/`
