# Epic 38: Reconciliação Automática E-mail ↔ iCal

**Status:** Ready for Story Validation  
**Prioridade:** P0 — Integridade de reservas  
**Tipo:** Brownfield / Database / Integration / LLM / UI / Rollout  
**PRD:** `docs/prd/prd-email-ical-reconciliation.md`

## Objetivo

Consolidar automaticamente dados de confirmação recebidos por e-mail com eventos iCal, reduzindo digitação sem permitir que incerteza do LLM produza reservas financeiras incorretas, duplicadas ou associadas ao imóvel errado.

## Contexto brownfield

- Next.js App Router, Supabase/PostgreSQL, Resend, Anthropic, Jest e Playwright.
- Multi-tenancy canônica por `organization_id` e RLS.
- iCal atualmente pode criar `reservations` diretamente.
- Gmail OAuth legado pode criar reserva `draft` sem reconciliação.
- A arquitetura aprovada introduz `calendar_events` e `raw_emails` como staging antes da consolidação.

## Escopo de entrega

### Story 38.1 — Reconciliação E-mail ↔ iCal

Story envelope que executa as Fases 0–7 estritamente em ordem, com evidência obrigatória em cada gate e Fase 3 bloqueando a reconciliação.

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools:
  - unit-tests
  - integration-tests
  - e2e-tests
  - explain-analyze
  - coderabbit
```

Agentes especializados: `@data-engineer` para schema/RLS/índices, `@qa` para gates determinísticos e E2E, `@ux-design-expert` para Fase 5 e `@devops` para PR/deploy/rollout.

## Sequenciamento obrigatório

```text
F0 Schema -> F1 Inbound -> F2 LLM -> F3 Validação determinística
                                       |
                                       +-- gate obrigatório --> F4 Matching
                                                                 -> F5 UI
                                                                 -> F6 Correções
                                                                 -> F7 Piloto
```

Nenhuma fase começa antes da aprovação registrada da anterior.

## Critérios de sucesso do Epic

- [ ] Os oito gates possuem evidência e aprovação.
- [ ] Fase 3 foi executada antes de qualquer tarefa da Fase 4.
- [ ] Extração atinge ≥90% nos campos obrigatórios do corpus.
- [ ] Piloto atinge auto-match ≥70% durante duas semanas.
- [ ] Zero reserva duplicada.
- [ ] Zero reserva associada ao imóvel errado.
- [ ] Quality gates globais e CodeRabbit passam.

## Dependências

- `docs/specs/lodgra-email-ical-reconciliation-spec.md`
- `docs/architecture/adr-0381-email-ical-phase-0.md`
- `docs/architecture/data-0381-email-ical-phase-0.md`
- contrato versionado de extração LLM da Story 38.1.

## Riscos e rollback

- Feature flag por organização desde o primeiro caminho de escrita.
- Organizações fora da flag mantêm o comportamento atual.
- Rollback desabilita a flag e interrompe novos processamentos; dados de staging permanecem auditáveis.
- Nenhuma expansão para Vrbo/outras plataformas antes do Gate 7.

## Quality gates

- Pre-Commit: `@dev`, lint/typecheck/testes/build e CodeRabbit.
- Dados: `@data-engineer`, migration/rollback, RLS, constraints e EXPLAIN.
- Arquitetura: `@architect`, contratos e compatibilidade brownfield.
- Validação: `@qa`, Fase 3, idempotência e E2E.
- Pre-PR/Pre-Deployment: `@devops`, secrets, flag, observabilidade e rollback.

## Definition of Done

- [ ] Story 38.1 concluída com ACs e gates aprovados.
- [ ] Compatibilidade do fluxo legado verificada.
- [ ] Documentação e File List atualizadas.
- [ ] Piloto concluído pelo período obrigatório.
- [ ] Nenhuma regressão, duplicidade ou associação incorreta detectada.

## Change Log

| Data | Versão | Mudança | Autor |
|---|---:|---|---|
| 2026-07-19 | 1.0 | Epic brownfield criado a partir da especificação normativa e do PRD | Morgan (`@pm`) |

