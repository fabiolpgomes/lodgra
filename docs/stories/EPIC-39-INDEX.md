# EPIC 39: Evolução do Dashboard — Analytics do Gestor — Stories Index

**Status:** 3/7 Done (39.1, 39.4, 39.5). 39.2 e 39.3 em implementação (worktrees paralelos). 39.6, 39.7 aguardando.
**Total Points (estimado):** 36
**Epic doc:** [epic-39-dashboard-analytics-evolution.md](epic-39-dashboard-analytics-evolution.md)
**Spec-fonte:** `docs/specs/lodgra-dashboard-spec-consolidada.md`
**Última atualização:** 2026-07-23

---

## Stories

| # | Story | Grupo | Pontos | Status | Depende de |
|---|-------|-------|--------|--------|------------|
| **39.1** | [Fundação de Dados (schema + monthly_property_metrics)](39.1-schema-foundation-metrics.md) | Pré-requisito bloqueante | 5 | **Done** (QA PASS, aplicada em produção) | — |
| **39.2** | [Badges MoM/YoY + Card ADR/RevPAR + Ajuste Lucro Real](39.2-adr-revpar-badges-lucro-real.md) | A (agente único) | 8 | **Em implementação** (worktree, YOLO) | 39.1 |
| **39.3** | [Card Receita por Canal](39.3-receita-por-canal.md) | B | 5 | **Em implementação** (worktree relançado, YOLO) | 39.1 |
| **39.4** | [Card Ranking de Propriedades](39.4-ranking-propriedades.md) | C | 5 | **Done** (QA PASS) | 39.1 |
| **39.5** | [Indicador de Status de Sincronização](39.5-indicador-status-sincronizacao.md) | D | 3 | **Done** (QA PASS) | — |
| **39.6** | [Card "Hoje" + Painel de Alertas + Sino](39.6-card-hoje-alertas-sino.md) | E | 8 | Ready (PO GO 9/10) — aguardando | 39.1, soft: 39.5 (Done), 39.3 |
| **39.7** | [Card Despesas do Mês](39.7-despesas-do-mes.md) | F | 3 | Ready (PO GO 10/10) — aguardando | 39.1, ordem sugerida: depois de 39.2 |

**Total:** 37 pontos (39.5 revisado de 2 para 3 durante o detalhamento — ver nota abaixo).

---

## Achados do detalhamento que mudaram o escopo original

- **39.2 (Lucro Real):** já existem utilitários prontos para o cálculo correto (`calcManagementFee` em `src/lib/financial/calculations.ts`, `sumCompanyExpensesForYear` em `src/lib/financial/company-expenses.ts`, ambos já usados em `/dashboard/empresa`) — reduz o esforço de implementação, não precisa construir do zero.
- **39.5 (Indicador de sync):** a tabela `sync_logs` existe mas **não é gravada** pelo fluxo inbound (`cron/sync-ical`, `sync/import`) — só pelo fluxo outbound. A story precisa instrumentar a gravação além de construir a UI. Pontos ajustados de 2 para 3.
- **39.6 (Sino):** cria uma **dependência leve, não bloqueante**, no gatilho "falha de sync" com a 39.5 (que agora precisa gravar `sync_logs` para o sino ter o que ler). Os outros 3 gatilhos do sino são independentes.
- **39.6 (Painel de Alertas):** "faturas de proprietários pendentes", mencionado na spec-fonte, **não tem modelo de dados no schema atual** — removido do escopo desta story, registrado como pendência a perguntar a Fabio antes de qualquer story futura tentar isso.
- **39.7 (Despesas do Mês):** a query já existe em `page.tsx` (hoje alimenta o Lucro Real antigo) — fica livre após a 39.2 trocar a fonte do Lucro Real. Sugerida ordem 39.2 → 39.7 para evitar conflito de merge na mesma região do arquivo.

---

## Ordem de despacho

```
39.1 (Done)
  │
  ├── 39.2 (Grupo A, agente único) ──► 39.7 (Grupo F, depois da 39.2 — mesma região de page.tsx)
  ├── 39.3 (Grupo B) ──────────────┐
  ├── 39.4 (Grupo C)               ├─ 39.6 pode reaproveitar concentração por canal da 39.3 se pronta antes
  └── 39.6 (Grupo E) ──────────────┘  (soft dependency, não bloqueante)

39.5 (Grupo D) — sem dependência de 39.1, pode já ter rodado antes; 39.6 depende dela (soft) só para o gatilho de falha de sync
```

**Paralelizável com segurança agora (39.1 Done):** 39.2, 39.3, 39.4, 39.5 podem ir em paralelo, agentes/PRs distintos. 39.6 pode começar em paralelo também, mas idealmente depois de 39.3/39.5 estarem avançadas para reaproveitar em vez de duplicar. 39.7 fica para depois da 39.2.

**Regra de não-conflito:** 39.2 nunca é fatiada em dois agentes (badges MoM/YoY e ajuste do Lucro Real tocam o mesmo componente).

---

## Próximos passos

1. ~~Confirmar com Fabio os 2 pontos em aberto da 39.6~~ — **Resolvido 2026-07-23:** "faturas de proprietários pendentes" vira **story futura** (39.8 ou epic separada, a definir quando chegar a vez) — não é escopo da 39.6. Prazo de "pagamento pendente" ainda pendente de confirmação quando a 39.6 for implementada.
2. **Em andamento (2026-07-23, YOLO mode, dispatch paralelo em worktrees isolados):** `@dev` implementando 39.2, 39.3, 39.4, 39.5.
3. Despachar 39.6 depois, reaproveitando o que 39.3/39.5 tiverem pronto.
4. Despachar 39.7 por último, depois da 39.2.
5. `@qa` gate em cada story ao terminar.

## Pendência registrada — Story futura (fora desta epic)

**"Faturas de proprietários pendentes de pagamento"** — mencionado na spec-fonte (seção 4, item 11) como parte do Painel de Alertas, mas sem modelo de dados no schema atual (sem tabela `owner_invoices` ou equivalente). Confirmado por Fabio (2026-07-23): vira uma story/epic futura, própria, não faz parte da Epic 39. Precisa de definição de schema (o que é uma "fatura de proprietário", como e quando é gerada, o que significa "pendente") antes de virar story — não é um simples ajuste de UI.
