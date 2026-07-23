# Epic 39: Evolução do Dashboard — Analytics do Gestor

**Status:** Story 39.1 em elaboração
**Prioridade:** P1 — Visibilidade operacional do gestor
**Tipo:** Brownfield / Database / UI / Analytics
**Fonte:** `docs/specs/lodgra-dashboard-spec-consolidada.md` (spec funciona como PRD desta epic)
**Empresa gestora de referência:** Algarve Home Stay (dono do "Lucro Real" — nível 4 do modelo de receita abaixo)

---

## Objetivo

Evoluir o dashboard operacional do gestor (`/dashboard`) com comparação temporal (MoM/YoY), métricas de ADR/RevPAR, granularidade por canal e por propriedade, alertas operacionais via sino e indicador de saúde de sincronização — mantendo Receita Bruta como base de cálculo dos cards operacionais (visão do gestor) e preservando o design system atual.

## Contexto brownfield

- Next.js App Router, página monolítica: `src/app/[locale]/dashboard/page.tsx` (848 linhas, server component, sem componentização dos cards).
- Supabase/PostgreSQL, multi-tenant por `organization_id` com RLS.
- **Campos de schema já existentes** que reduzem o escopo original da spec — não recriar:
  - `reservations.commission_amount` / `commission_rate` / `commission_calculated_at` + materialized view `commission_summary` (migration `20260326020000_add_commission_tracking.sql`) — já cobre o requisito de "comissão por reserva" da spec (lá chamado `comissao_valor`).
  - `properties.management_percentage` (migration `20260313010000_add_management_percentage.sql`) — é o "Percentual de Gestão do Imóvel" usado no nível 3/4 do modelo de receita.
  - `properties.cleaning_fee` / `cleaning_fee_type`, `properties.pet_fee` / `pet_fee_type` (migration `20260506_01_property_amenities_rooms_fees.sql`) — são os valores-base de taxa de serviço mencionados na spec.
  - `reservations.booking_source` — cobre "canal".
- **Ainda faltam** (escopo real da Story 39.1): `reservations.discount_amount`, um campo de snapshot da soma de taxas de serviço na própria reserva (a spec exige valor copiado no momento da criação, não recalculado), e `monthly_property_metrics`.
- Componentes órfãos existentes, não referenciados pela página atual — avaliar reaproveitamento antes de criar do zero: `src/components/features/dashboard/ProfitCard.tsx`, `FinancialOverviewCharts.tsx`, `src/components/dashboard/ProfitSummary.tsx`, `RevenueBreakdown.tsx`.
- **Mudança de comportamento confirmada por Fabio:** o card "Lucro Real" atual (`page.tsx` linhas ~585-640) calcula `lucro = receita − despesas` usando a tabela `expenses` (despesas por propriedade). A spec redefine Lucro Real como `Σ comissão de gestão de todas as propriedades − despesas da operação da empresa gestora (Algarve Home Stay)` no mês, isto é, deve passar a usar `company_expenses` (tabela de organização, sem `property_id`), não `expenses`. Isso é tratado explicitamente na Story 39.2 e muda o valor visível do card em produção — comunicar antes do deploy.

## Modelo de receita (4 níveis) — vincula todas as stories de métricas

| Nível | Fórmula | Uso nesta epic |
|---|---|---|
| 1. Receita Bruta | `total_amount` da reserva, sem deduções | ADR, RevPAR, Receita do Mês, Mix de Canais, Concentração — **todos os cards operacionais desta epic usam este nível** |
| 2. Faturamento da Propriedade | `total_amount + taxas de serviço − comissão − descontos` | Fora de escopo — reservado para futura Prestação de Contas ao proprietário |
| 3. Repasse ao Proprietário | Faturamento da Propriedade − comissão de gestão − despesas do imóvel | Fora de escopo desta epic |
| 4. Lucro Real (Algarve Home Stay) | `Σ comissão de gestão de todas as propriedades − despesas da operação da empresa (company_expenses)` no mês | Card "Lucro Real" — Story 39.2 |

## Escopo de entrega (Stories)

| # | Story | Grupo (spec §7) | Pontos (estimativa) | Depende de |
|---|---|---|---|---|
| [39.1](39.1-schema-foundation-metrics.md) | Fundação de Dados (schema + `monthly_property_metrics`) | Pré-requisito bloqueante | 5 | — | **Done** |
| [39.2](39.2-adr-revpar-badges-lucro-real.md) | Badges MoM/YoY + Card ADR/RevPAR + Ajuste Lucro Real | Grupo A (mesmo agente — tocam o mesmo card) | 8 | 39.1 | Ready |
| [39.3](39.3-receita-por-canal.md) | Card Receita por Canal | Grupo B | 5 | 39.1 | Ready |
| [39.4](39.4-ranking-propriedades.md) | Card Ranking de Propriedades | Grupo C | 5 | 39.1 | Ready |
| [39.5](39.5-indicador-status-sincronizacao.md) | Indicador de Status de Sincronização | Grupo D | 3 | — (pode rodar a qualquer momento, inclusive antes de 39.1) | Ready |
| [39.6](39.6-card-hoje-alertas-sino.md) | Card "Hoje" + Painel de Alertas + Sino de Notificações | Grupo E | 8 | 39.1, soft: 39.5 e 39.3 | Ready |
| [39.7](39.7-despesas-do-mes.md) | Card Despesas do Mês | Grupo F | 3 | 39.1, sugerido depois de 39.2 | Ready |

**Total:** 37 pontos (39.5 revisado de 2→3 durante o detalhamento — `sync_logs` não era gravada pelo fluxo inbound, achado que ampliou o escopo real). Todas as 7 stories estão detalhadas e validadas pelo `@po`. Ver `EPIC-39-INDEX.md` para os achados que ajustaram escopo/dependências de cada uma.

## Regra de despacho paralelo (herdada da seção 7 do documento-fonte)

```
39.1 (bloqueante) ──┬── 39.2 (Grupo A, agente único)
                     ├── 39.3 (Grupo B)
                     ├── 39.4 (Grupo C)
                     ├── 39.6 (Grupo E)
                     └── 39.7 (Grupo F)

39.5 (Grupo D) ── sem dependência, paralelo a qualquer fase, inclusive antes de 39.1
```

- **Nunca** despachar 39.2 como duas stories/agentes separados (badges MoM/YoY vs ajuste Lucro Real) — ambos alteram o mesmo card e geram conflito de merge.
- Após 39.1 concluída (`Done`), 39.2 a 39.7 (exceto 39.5, que já pode ter rodado antes) podem ser despachadas em paralelo entre si — tocam componentes/arquivos distintos.

## Critérios de sucesso da Epic

- [ ] Nenhum card novo quebra o grid existente em ≥1280px.
- [ ] Todos os valores monetários respeitam o toggle EUR/BRL.
- [ ] Reservas com `booking_source` ou `total_amount` ausentes são excluídas ou sinalizadas — nunca tratadas como zero.
- [ ] Badges MoM/YoY mostram "—" quando não há período de comparação (nunca "0%").
- [ ] Filtro de propriedade no topo afeta todos os cards novos.
- [ ] RevPAR = ADR × Ocupação validado por teste automatizado.
- [ ] Concentração por canal (60%), por propriedade (40%) e ocupação baixa (30%) são alertas independentes e configuráveis, nenhum limiar hardcoded.
- [ ] Sino de notificações cobre: hóspede com nome placeholder (`hóspede`/`Reserved`), falha de sync, pagamentos pendentes, ocupação baixa por imóvel (com nome do imóvel na mensagem).
- [ ] Indicador de sincronização abaixo do botão "Sincronizar" mostra texto verde + data/hora (sucesso) ou vermelho + data/hora (falha).
- [ ] Design segue `docs/design-system/design.md` (light mode, cards claros) — identidade "Lamborghini" (preto/gold) não é usada.
- [ ] ADR, RevPAR, Receita do Mês, Mix de Canais e Concentração usam Receita Bruta — sem misturar níveis 2/3 do modelo de receita.
- [ ] Qualquer limiar ou taxa não definida na spec é perguntada ao Fabio antes de hardcode.

## Dependências

- `docs/specs/lodgra-dashboard-spec-consolidada.md`
- `docs/design-system/design.md`

## Riscos e rollback

- Migration da Story 39.1 é aditiva (`ADD COLUMN IF NOT EXISTS`, `CREATE MATERIALIZED VIEW IF NOT EXISTS`) — reversível via `DROP`.
- Mudança de fonte de dados do "Lucro Real" (39.2) é visível em produção — validar com Fabio antes do deploy, considerar anunciar a mudança.
- Nenhum componente órfão (`ProfitCard.tsx` etc.) deve ser removido sem confirmação de que está realmente sem uso — grep antes de deletar.

## Quality gates

- Pre-Commit: `@dev` — lint/typecheck/testes/build + CodeRabbit.
- Dados (39.1): `@data-engineer` — migration/rollback, RLS, índices, EXPLAIN.
- QA: `@qa` — gate padrão de 7 checks por story.

---

**Criado por:** Claude Code (orquestração solicitada por Fabio) — papel equivalente a `@pm`/`@architect` nesta sessão.
**Data:** 2026-07-22
