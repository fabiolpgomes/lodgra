# Epic 25: OTA Reviews — Social Proof na Página de Reserva Direta

**Status:** Ready for Story Breakdown
**Priority:** High
**Effort:** Medium
**Risk:** Low (sem dependências de APIs externas)

---

## Problem Statement

A página pública de propriedade (`/p/[slug]`) não tem nenhum elemento de social proof. O visitante chega sem contexto sobre a qualidade do alojamento — informação que nas OTAs (Booking.com, Airbnb) é o principal factor de conversão. Sem reviews visíveis, a reserva direta perde credibilidade frente às plataformas que o hóspede já conhece.

## Goal

Adicionar um sistema de reviews gerido pelo gestor — com curadoria manual — que exibe na página pública:
1. **Score agregado por OTA** (Booking.com, Airbnb, Google, outros) com contagem de avaliações
2. **Carousel de review cards** com texto, nome do hóspede, data, estrelas e logo da OTA de origem

A gestão é feita no painel admin: o gestor adiciona reviews manualmente copiadas das OTAs, evitando dependência de APIs externas (algumas das quais não existem publicamente — ex. Airbnb).

---

## Affected Screens

| Área | Ecrã | Impacto |
|------|------|---------|
| Admin | `/properties/[id]/edit` ou nova tab `/properties/[id]/reviews` | Novo — CRUD de reviews |
| Público | `/p/[slug]` (`PropertyPageV2`) | Novo — secção Reviews (score + carousel) |

---

## Acceptance Criteria

### Admin (gestão)
- [ ] Gestor pode adicionar uma review por propriedade: fonte (OTA), nota (1–10 ou 1–5 por OTA), texto do comentário, nome do hóspede, data da review
- [ ] Gestor pode editar e eliminar reviews existentes
- [ ] Gestor pode marcar reviews como "destaque" (aparece no carousel público)
- [ ] Reviews isoladas por `organization_id` (multi-tenant seguro)
- [ ] Validação: nota obrigatória, fonte obrigatória, texto max 500 chars

### Página pública (display)
- [ ] Secção "Avaliações" visível na página `/p/[slug]` apenas se existirem reviews
- [ ] Score agregado: média ponderada por OTA + total de avaliações + label qualitativo (Excelente / Muito Bom / Bom)
- [ ] Logos das OTAs representadas exibidos na secção de score
- [ ] Carousel com mínimo 1 card, máximo 6 cards em destaque
- [ ] Review card: estrelas (visual), texto truncado com "Ver mais", nome do hóspede, mês/ano, logo da OTA
- [ ] Responsivo: carousel horizontal em mobile, grid 2-col em desktop

### Não incluído neste epic
- Auto-sync via API Booking.com (possível epic futuro)
- Resposta a reviews por parte do gestor
- Moderação ou verificação de reviews

---

## Data Model

```sql
-- Nova tabela: property_reviews
create table property_reviews (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  property_id   uuid not null references properties(id) on delete cascade,
  source        text not null, -- 'booking', 'airbnb', 'google', 'tripadvisor', 'direct', 'other'
  reviewer_name text not null,
  rating        numeric(3,1) not null check (rating >= 1 and rating <= 10),
  review_text   text,
  review_date   date not null,
  is_featured   boolean not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
-- RLS: org isolation (select/insert/update/delete por organization_id)
-- Index: (property_id, is_featured) para queries da página pública
```

---

## Stories

- [ ] **Story 25.1** — DB Migration: tabela `property_reviews` + RLS + índices
- [ ] **Story 25.2** — Admin: gestão de reviews por propriedade (CRUD + destaque)
- [ ] **Story 25.3** — Página pública: secção de score agregado por OTA
- [ ] **Story 25.4** — Página pública: carousel de review cards (destaque)

---

## Agents

- **@dev (Dex)** — Implementação completa (25.1 → 25.4 sequencialmente)
- **@devops (Gage)** — Push, deploy e migração Supabase em produção

---

## Strategic Note

Reviews com logo de OTAs reconhecidas (Booking.com, Airbnb) transportam a credibilidade dessas plataformas para a reserva direta. É um dos elementos com maior impacto em conversion rate sem custo de comissão. A abordagem manual elimina dependência de APIs externas e permite curadoria — o gestor escolhe as melhores reviews para exibir.

Implementar neste epic como fundação: um epic futuro pode adicionar auto-sync via Booking.com Content API quando houver credenciais de parceiro.

---

## Roadmap Context

```
Epic 14 (completo) → páginas públicas por propriedade
Epic 25 (agora)    → social proof via reviews curadas
Epic 24 (paralelo) → Google Vacation Rentals (Schema.org)
Futuro             → auto-sync reviews via APIs parceiro
```
