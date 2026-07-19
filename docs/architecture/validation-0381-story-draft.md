# Revalidação PO — Story 38.1

**Data:** 2026-07-19  
**Workflow:** `validate-next-story`  
**Modo:** YOLO  
**Veredito:** **GO**  
**Status resultante:** `Ready`  
**Implementation Readiness Score:** 9/10  
**Confiança:** Alta

## Escopo validado

- `AGENTS.md`, `.aiox-core/constitution.md`, `.aiox-core/core-config.yaml`, `story-tmpl.yaml` e o workflow completo `validate-next-story`;
- Story 38.1, PRD brownfield, Epic 38 e especificação normativa interna;
- ADR 0381, Data Design 0381 e contrato de extração LLM v1;
- `docs/framework/coding-standards.md`, `tech-stack.md` e `source-tree.md`;
- executor/quality gate, estrutura, caminhos, AC↔tasks, testes, segurança, CodeRabbit, sequenciamento e anti-alucinação.

## Comparação com o NO-GO anterior

| Must-fix de 6/10 | Evidência atual | Resultado |
|---|---|---|
| Prompt/contrato LLM ausente | `contract-0381-llm-extraction-v1.md` define prompt versionado, Zod estrito, `confidence`, duas tentativas, destino de falhas e corpus reproduzível | Resolvido |
| Épico/PRD pai ausente | `prd-email-ical-reconciliation.md` contém FR/NFR/constraints e `epic-38-email-ical-reconciliation.md` vincula explicitamente a Story 38.1 | Resolvido |
| Fonte normativa externa e não portável | `docs/specs/lodgra-email-ical-reconciliation-spec.md` foi internalizada e é referenciada por caminhos relativos | Resolvido |
| Contexto DEV obrigatório ausente | Os três `devLoadAlwaysFiles` configurados existem, possuem conteúdo e fontes rastreáveis | Resolvido |

Não restam bloqueadores **Must Fix** do relatório anterior.

## Template e executor assignment

PASS para Status, Executor Assignment, Story, Acceptance Criteria, CodeRabbit Integration, Tasks/Subtasks, Dev Notes/Testing, Change Log, Dev Agent Record/File List e QA Results. Não há placeholders residuais do template; `{{source_platform}}` e `{{raw_content}}` pertencem intencionalmente ao prompt versionado, não ao template da story.

`executor: @dev`, `quality_gate: @architect` e `quality_gate_tools` são válidos e distintos. A natureza cross-stack justifica `@dev` como executor principal, mantendo `@data-engineer`, `@qa`, `@ux-design-expert` e `@devops` nos gates de suas especialidades.

## Estrutura, rastreabilidade e anti-alucinação

Os caminhos citados pela story existem e correspondem à árvore brownfield. PRD, Epic, spec, ADR, Data Design e contrato LLM formam uma cadeia rastreável sem requisito novo não suportado. `organization_id`, Resend Inbound, `calendar_events` como staging, preservação dos nomes físicos de `reservations` e separação do Gmail legado estão alinhados entre os artefatos.

O contrato v1 impede JSON permissivo, coerção, divergência de plataforma e falha silenciosa. A saída probabilística continua subordinada à Fase 3. Ambiguidade nunca autoriza auto-match, e idempotência é exigida no serviço e no banco.

Code Intelligence foi verificado conforme o workflow e não havia provider inicializado; o passo de duplicidade foi omitido silenciosamente como previsto. O Epic 38 contém somente a Story 38.1, portanto não existe contexto acumulado de stories anteriores a incorporar.

## AC, tarefas, testes e segurança

Os AC1–AC10 têm tarefas correspondentes e critérios mensuráveis. Os oito gates seguem ordem estrita. O Gate 3 aparece no contexto, AC4, tarefas e Registro dos Gates como pré-condição bloqueante da Fase 4; teste manual da Fase 2 não pode substituí-lo.

Há instruções para migration/rollback, RLS positiva e negativa com JWT real, quatro `EXPLAIN (ANALYZE, BUFFERS)` com massa e limiares objetivos, inbound assinado, corpus anonimizado, validação determinística, score/ambiguidade/idempotência, E2E, correções e piloto de duas semanas. Os quality gates globais incluem lint, typecheck, testes, build e CodeRabbit sem CRITICAL.

CodeRabbit está habilitado e a story contém tipo/complexidade, agentes, Pre-Commit, Pre-PR, Pre-Deployment, self-healing e focos adequados. O perfil `@dev` light descrito na story é coerente com o workflow de implementação; o perfil full global continua reservado ao ciclo de QA.

## Should-fix não bloqueantes

1. Materializar a allowlist exata/versionada de remetentes e domínios durante a Fase 1, antes da primeira chamada ao LLM, como já exige NFR-05.
2. Executar a story com checkpoints/handoffs por fase, porque o Gate 7 exige uma janela real de duas semanas; isso não altera a ordem nem relaxa qualquer gate.

O método e as fixtures anonimizadas do gate de 90%, anteriormente classificados como should-fix, já foram resolvidos pelo contrato v1.

## Decisão

**GO (9/10).** Os quatro bloqueadores do NO-GO anterior foram resolvidos e a story fornece contexto suficiente, testável e rastreável para desenvolvimento. Status atualizado de `Draft` para `Ready` e transição registrada no Change Log.

Próximo handoff autorizado: `@dev *develop 38.1`. O desenvolvimento deve começar pela Fase 0 e não pode iniciar a Fase 4 antes da aprovação registrada do Gate 3.
