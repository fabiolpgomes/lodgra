# Epic Modularização IA Native - Index

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for execution
**Purpose:** mapear a estrutura de trabalho antes da implementação

## Overview

Esta epic separa a evolução do Lodgra em módulos claros e prepara um MVP de IA Native que pode ser validado fora do core antes de ser integrado.
O PRD oficial do módulo é a fonte de verdade para o MVP, e a story 46.1 define o primeiro corte funcional CLI-first.

## Waves

### Wave 1 - Foundation
- `pm-1-modulos-submodulos.md`
- `arch-1-fronteiras-contratos.md`
- `ux-1-navegacao-por-publico.md`
- `dev-1-shell-modular.md`
- `epic-modularizacao-ia-native-wave-1.md`

### Wave 2 - Environments and Governance
- `dev-2-staging-espelho.md`
- `qa-1-checklist-validacao.md`
- `ops-1-rollout-rollback.md`
- `epic-modularizacao-ia-native-wave-2.md`

### Wave 3 - IA Native MVP
- `pm-2-recorte-mvp-ia.md`
- `arch-2-arquitetura-viabilidade.md`
- `ux-2-fluxo-mvp-ia.md`
- `dev-3-mvp-ia-isolado.md`
- `qa-2-validacao-mvp-ia.md`
- `epic-modularizacao-ia-native-wave-3.md`

### Wave 4 - Integration
- `dev-4-integracao-lodgra.md`
- `ux-3-entrada-mvp-no-shell.md`
- `pm-3-expansao-capabilities.md`
- `epic-modularizacao-ia-native-wave-4.md`

### Closeout - Expansion Governance Validation
- `qa-3-validar-expansao-capabilities.md`

## Sequence Documents

- `epic-modularizacao-ia-native-sequencia.md`
- `epic-modularizacao-ia-native-responsabilidades.md`
- `epic-modularizacao-ia-native-handoff.md`
- `epic-modularizacao-ia-native-consolidated-view.md`
- `../product/lodgra-property-intelligence-prd.md`
- `46.1-property-intelligence-cli.story.md`

## Working Rules

- Nenhuma story avança sem módulo e público definidos.
- O MVP de IA Native começa isolado.
- Staging espelha produção antes de qualquer rollout.
- Novas features entram como capability, não como remendo.

## Suggested Owners

- PM: visão, escopo, priorização
- Architect: fronteiras, contratos, escalabilidade
- UX: arquitetura da informação e jornada
- Dev: shell modular, integração e rollout
- QA: validação de comportamento, segurança de fluxo e regressão

## Order of Execution

1. PM-1
2. ARCH-1
3. UX-1
4. DEV-1
5. DEV-2
6. QA-1
7. OPS-1
8. PM-2
9. ARCH-2
10. UX-2
11. DEV-3
12. QA-2
13. DEV-4
14. UX-3
15. PM-3
16. QA-3

## Governance Notes

- PM owns product decisions
- Architect owns boundaries and contracts
- UX owns clarity and navigation
- Dev owns implementation and staging readiness
- QA owns validation and release confidence
- DevOps owns rollout, rollback and promotion control

## Current Alignment

- Wave 1, Wave 2, Wave 3 and Wave 4 are ready in the story chain
- QA-3 has a reusable expansion policy artifact for closeout governance
- OPS-1 is documented with staging restore explicit and production restore as follow-up

## Handoff Package

Use `epic-modularizacao-ia-native-handoff.md` as the single entry point for execution readiness.
