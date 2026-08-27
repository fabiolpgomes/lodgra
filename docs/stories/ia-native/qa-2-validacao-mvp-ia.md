# Story QA-2 - Validar o MVP de IA Native isolado

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for DEV-4  
**Owner:** @qa  
**Depends On:** PM-2, ARCH-2, UX-2, DEV-3

---

## QA Intent

O MVP de IA Native só pode avançar para integração se a validação em staging mostrar que o fluxo é compreensível, estável e consistente.

## Story

**Como** QA da plataforma,  
**Quero** validar o MVP de IA Native isolado,  
**Para que** a integração no Lodgra aconteça apenas quando o valor estiver provado.

## Context

Esta story valida:
- qualidade da entrada
- clareza da saída
- estabilidade da execução
- isolamento da capability

## QA-2 Baseline

Esta validação parte de quatro contratos já fechados:

- PM-2 definiu o problema, o público, as entradas, as saídas e os limites do MVP
- ARCH-2 definiu o fluxo, os estados rastreáveis, os serviços comuns e o desligamento seguro
- UX-2 definiu a leitura do resultado, a hierarquia da informação e a experiência de decisão
- DEV-3 entregará o MVP isolado em staging com telemetria mínima e feature gate

O papel da QA-2 é verificar se a capability funciona como suporte à decisão, com estabilidade e isolamento suficientes para só então permitir a integração futura.

## Acceptance Criteria

### AC1: Fluxo compreensível
- [ ] A entrada do MVP segue o wireflow aprovado
- [ ] O resultado pode ser interpretado sem apoio técnico
- [ ] O usuário entende que está a receber uma previsão assistida

### AC2: Estabilidade
- [ ] O MVP responde de forma consistente com entradas equivalentes
- [ ] Erros são observáveis
- [ ] Falhas não propagam para o restante sistema

### AC3: Isolamento
- [ ] O MVP continua desligável
- [ ] O MVP não depende do shell modular para existir
- [ ] O MVP não altera módulos já existentes

### AC4: Readiness para integração
- [ ] Há confiança para levar o MVP ao shell
- [ ] Há confiança para promover a capability de forma controlada
- [ ] Há nota clara sobre limitações e próximos ajustes

## Scope

### In scope
- validação funcional do MVP
- validação de consistência
- validação de isolamento
- validação de compreensão do output

### Out of scope
- integração ao shell
- rollout em produção
- expansão de capacidades
- mudanças na navegação principal

## Deliverables

- checklist de validação do MVP
- relatório de riscos e inconsistências
- recomendação para DEV-4 ou correção

## QA-2 Validation Checklist

### 1. Entry flow
- [ ] Verify the MVP accepts the approved entry format from UX-2
- [ ] Verify the first interaction feels like analysis, not a CRUD form
- [ ] Verify blocker questions are asked only when necessary
- [ ] Verify the flow matches the wireflow and state model

### 2. Output clarity
- [ ] Verify the result states viability clearly
- [ ] Verify confidence and risk are readable without extra explanation
- [ ] Verify the recommendation is understandable to product users
- [ ] Verify the output remains readable across comparable inputs

### 3. Consistency
- [ ] Run the same or equivalent input more than once
- [ ] Compare scenario outputs across sessions
- [ ] Confirm stable calculation behavior
- [ ] Confirm provenance and assumptions stay attached to the result

### 4. Isolation and safety
- [ ] Confirm the MVP can be toggled off safely
- [ ] Confirm the MVP does not depend on the Lodgra shell
- [ ] Confirm failures stay contained inside the capability
- [ ] Confirm no operational module is modified as a side effect

### 5. Telemetry and observability
- [ ] Confirm execution start and end are visible
- [ ] Confirm blocked inputs are surfaced clearly
- [ ] Confirm duration is visible
- [ ] Confirm audit failures and error categories are visible
- [ ] Confirm trace id can be followed for debugging

### 6. Readiness decision
- [ ] Capture whether the MVP is ready for DEV-4
- [ ] Capture known limitations that must travel with the handoff
- [ ] Capture any correction needed before integration
- [ ] Keep the recommendation tied to the observed evidence

## Handoff Notes

- esta story bloqueia a integração ao Lodgra
- a próxima story da cadeia é DEV-4

## QA-2 Handoff Package

### For DEV-4
- only proceed if the MVP can be toggled off safely
- only proceed if the flow is stable across repeated runs
- only proceed if telemetry and audit visibility are sufficient

### For product and architecture follow-up
- keep the capability isolated until the integration point is explicitly approved
- preserve the decision-support language if UI changes are introduced later
- do not widen the scope to additional use cases during this validation

### Evidence to collect
- input acceptance results
- scenario consistency results
- error and telemetry visibility
- isolation / toggle-off verification
- final readiness recommendation

## DEV-3 Evidence Pack

The DEV-3 implementation already produced a runnable CLI baseline for QA-2.

### Execution command
- `npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both`

### Observed result
- status: `ready`
- duration: `2 ms`
- blockers: none for the example input
- recommendation: `long-stay`
- publish approval: pending
- telemetry: start and end events emitted with trace id

### Input used
- `docs/stories/ia-native/property-intelligence-example.input.json`

### Implementation notes for QA
- the CLI is deterministic and does not depend on the Lodgra shell
- the runner uses a Node-only wrapper so the command is reproducible in this environment
- the output is emitted in both Markdown and JSON
- the example includes one clear blocker-free run and the code also supports blocked-input runs

### QA focus for the first pass
- rerun the same input more than once and compare the outputs
- verify the recommendation, confidence and provenance fields are readable
- verify the telemetry trace is present
- verify a missing-location or missing-typology input returns blockers instead of inventing data

## QA-2 Yolo Mode Script

Use this script exactly as written when running the QA agent in yolo mode.

> Execute QA-2 in yolo mode against the DEV-3 evidence pack.  
> Run the commands locally in the agent environment; do not hand off to another thread or ask for a `threadId`.  
> Start with `docs/stories/ia-native/property-intelligence-example.input.json`.  
> Run `npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both` twice.  
> Compare the trace id, status, recommendation, confidence and scenario values between runs.  
> Confirm the CLI is deterministic, shell-independent and emits both Markdown and JSON.  
> Then rerun with a broken input that removes `property.location` and `property.typology`.  
> Confirm the output returns blockers instead of inventing data.  
> Record whether telemetry start/end events are visible, whether provenance stays attached, and whether any failure escapes the capability boundary.  
> If everything matches, mark the run as `Approved for DEV-4`; otherwise list the exact blocker and keep the capability isolated.

### Yolo checklist
- [x] Run the same valid input twice
- [x] Compare trace id, status, recommendation and scenario outputs
- [x] Confirm output is stable across runs
- [x] Confirm Markdown and JSON are both emitted
- [x] Confirm telemetry start/end events are visible
- [x] Confirm provenance stays attached to the result
- [x] Run a broken input without `property.location`
- [x] Run a broken input without `property.typology`
- [x] Confirm blocked-input output does not invent missing data
- [x] Decide `Approved for DEV-4` or `Needs changes`

## QA Results

**Review Type:** Execution QA review
**Decision:** APPROVED FOR DEV-4

### Summary
Local execution of the DEV-3 baseline confirmed that the MVP behaves deterministically for equivalent inputs, emits Markdown and JSON, surfaces telemetry start/end, and returns blockers instead of inventing data when required fields are missing. The latest reruns on 2026-08-22 stayed within a 1-3 ms band and preserved the same logical recommendation and scenario ordering.

### Evidence
- `npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both`
- same input run twice with stable logical outputs and different trace ids
- blocked-input runs without `property.location` and without `property.typology`
- telemetry start/end visible in the CLI output with `analysis.blocked_inputs` on missing-field cases
- telemetry start/end visible in the CLI output
- provenance retained on the computed scenarios and comparables

### Strengths
- clear separation between orchestration, deterministic finance and output rendering
- stable recommendation and scenario ordering across repeated runs
- explicit blocker handling for missing required fields
- shell-independent runner for the CLI command

### Residual Risks
- trace id is intentionally different per run, so QA should compare logical outputs instead of raw traces
- the current release still uses derived internal benchmarks until richer market inputs are added
- integration into the shell remains a separate DEV-4 concern

### Recommendation
- approve the capability for DEV-4
- preserve isolation until the integration step is complete
- keep the blocked-input behavior under regression test

## QA Results - 2026-08-24

**Review Type:** Execution QA review
**Decision:** APPROVED FOR DEV-4

### Summary
The yolo-mode rerun on 2026-08-24 confirmed the same behavior as the prior baseline: equivalent inputs produced stable logical outputs, Markdown and JSON were both emitted, telemetry start/end events were visible, and blocked inputs returned blockers instead of inferred data.

### Evidence
- `npm test -- --runInBand src/__tests__/property-intelligence/property-intelligence.test.ts`
- `npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both` twice
- broken input without `property.location`
- broken input without `property.typology`
- telemetry start/end visible in the CLI output
- provenance retained on the computed scenarios and comparables

### Residual Notes
- trace ids differ per execution, so QA comparison should keep focusing on logical outputs
- the first slice remains stateless and shell-independent
- integration into the shell stays a DEV-4 concern

## QA Results - 2026-08-25

**Review Type:** Execution QA review
**Decision:** APPROVED FOR DEV-4

### Summary
The yolo-mode QA pass on 2026-08-25 confirmed the DEV-3 MVP remains deterministic for equivalent inputs, emits both Markdown and JSON, surfaces telemetry start/end plus publish-approval events, and keeps blocked-input handling contained when required fields are missing. The feature gate also disabled the CLI safely without side effects.

### Evidence
- `npm test -- --runInBand src/__tests__/property-intelligence/property-intelligence.test.ts src/__tests__/api/property-intelligence/analyze/route.test.ts`
- `npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both` twice
- broken input without `property.location`
- broken input without `property.typology`
- `PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED=false npm run property-intelligence -- --input docs/stories/ia-native/property-intelligence-example.input.json --format both`
- telemetry start/end visible in the CLI output
- telemetry `analysis.blocked_inputs` visible on missing-field cases
- telemetry `analysis.publish_approval` visible on ready and blocked runs
- provenance retained on the computed scenarios and comparables

### Strengths
- stable logical outputs across repeated equivalent runs
- clear recommendation and scenario ordering in the premium report
- explicit blocker handling for missing required fields
- safe off-switch through the feature gate
- shell-independent CLI execution

### Residual Notes
- trace ids are intentionally different per run, so QA comparison should stay on logical outputs rather than raw traces
- blocked runs remain intentionally sparse because the capability refuses to invent missing data
- the browser-first shell integration is still a DEV-4 concern and was not part of this CLI-first QA pass

### Recommendation
- approve the capability for DEV-4
- preserve isolation until integration is explicitly exercised
- keep blocked-input and feature-gate behavior under regression test

## QA-2 Prepared Baseline

QA-2 should be executed only after DEV-3 produces an executable staging MVP with observable output and telemetry.

The validation focus is intentionally narrow:
- verify the MVP follows the approved input and output contract
- verify repeated runs remain comparable
- verify the capability can be toggled off safely
- verify telemetry and audit visibility are sufficient for debugging
- verify the flow still feels like decision support, not an operational form
- verify the first slice remains stateless and does not require persistence to prove value

## QA-2 Execution Route

1. Run the baseline test suite for the Property Intelligence module.
2. Execute the CLI twice with the official example input and compare the logical output.
3. Verify Markdown and JSON are both emitted.
4. Verify telemetry start/end events are present.
5. Run broken inputs that remove `property.location` and `property.typology`.
6. Confirm the CLI returns blockers instead of inventing missing data.
7. Record whether the capability can be toggled off safely and whether the result stays isolated from the Lodgra shell.
8. Mark the story `Approved for DEV-4` only if the logical outputs, blockers and telemetry all behave as expected.

## QA-2 Validation Checklist

### 1. Entry flow
- [ ] The MVP accepts the approved entry format from UX-2
- [ ] The first interaction feels like analysis, not a CRUD form
- [ ] Blocker questions appear only when necessary
- [ ] The observed flow matches the approved wireflow and state model

### 2. Output clarity
- [ ] The result states viability clearly
- [ ] Confidence and risk are readable without extra explanation
- [ ] The recommendation is understandable to product users
- [ ] The output stays readable across comparable inputs

### 3. Consistency
- [ ] Run the same or equivalent input more than once
- [ ] Compare scenario outputs across sessions
- [ ] Confirm stable calculation behavior
- [ ] Confirm provenance and assumptions remain attached to the result

### 4. Isolation and safety
- [ ] Confirm the MVP can be toggled off safely
- [ ] Confirm the MVP does not depend on the Lodgra shell
- [ ] Confirm failures stay contained inside the capability
- [ ] Confirm no operational module is modified as a side effect

### 5. Telemetry and observability
- [ ] Confirm execution start and end are visible
- [ ] Confirm blocked inputs are surfaced clearly
- [ ] Confirm duration is visible
- [ ] Confirm audit failures and error categories are visible
- [ ] Confirm trace id can be followed for debugging

### 6. Readiness decision
- [ ] Capture whether the MVP is ready for DEV-4
- [ ] Capture known limitations that must travel with the handoff
- [ ] Capture any correction needed before integration
- [ ] Keep the recommendation tied to the observed evidence

## QA-2 Handoff Package

### For DEV-4
- only proceed if the MVP can be toggled off safely
- only proceed if the flow is stable across repeated runs
- only proceed if telemetry and audit visibility are sufficient

### For product and architecture follow-up
- keep the capability isolated until the integration point is explicitly approved
- preserve the decision-support language if UI changes are introduced later
- do not widen the scope to additional use cases during this validation

### Evidence to collect
- input acceptance results
- scenario consistency results
- error and telemetry visibility
- isolation / toggle-off verification
- final readiness recommendation
