# Story OPS-1 - Definir rollout e rollback por módulo

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for execution  
**Owner:** @devops  
**Depends On:** DEV-2, QA-1

---

## Ops Intent

O rollout modular precisa ser previsível, reversível e rastreável.

Esta story define como promover cada wave, como reverter se necessário e como comunicar a mudança entre os agentes envolvidos.

## Story

**Como** operação de entrega,  
**Quero** um plano claro de rollout e rollback por módulo,  
**Para que** possamos promover mudanças com risco controlado.

## Context

A modularização só é sustentável se a passagem de staging para produção tiver regras claras.

Sem isso:
- uma wave pode contaminar outra
- o MVP de IA pode entrar cedo demais
- o time perde a capacidade de reversão segura

## Baseline Operacional

O smoke test da QA-1 em 2026-08-21 definiu o ponto de partida operacional para esta story:
- o shell modular está validado em staging autenticado para `/pt-BR/dashboard`, `/pt-BR/admin/users` e `/pt-BR/owners`
- Core, Operação, Empresa e Proprietário estão claramente separados nos labels do shell
- `IA Native` permanece isolado como capability não publicada e fica oculto pelo contrato do shell
- a navegação fallback continua resolvendo para Core quando um módulo é desativado ou não publicado
- rollback disablement está documentado como ação via gate, não como mudança improvisada
- a prova visual de moeda continua bloqueada neste ambiente e deve ser tratada como limitação documentada, não como regressão de produto

## Acceptance Criteria

### AC1: Rollout
- [x] A promoção ocorre por módulo ou wave
- [x] Existe ordem definida para ativação
- [x] Existe comunicação do que muda a cada wave

### AC2: Rollback
- [x] Existe critério para rollback
- [x] Existe processo para desativar o MVP de IA
- [ ] Existe ponto de restauração do staging/produção

### AC3: Governança
- [x] Mudanças críticas precisam de aprovação
- [x] Há rastreio de versão e data de promoção
- [x] Há uma forma simples de saber o que foi promovido e quando

### AC4: Segurança operacional
- [x] O rollout não depende de intervenção manual sem checklist
- [x] O rollback não depende de improviso
- [x] O módulo pode ser desativado sem quebrar o restante

## Scope

### In scope
- regra de promoção por wave
- regra de rollback por wave
- rastreio de versão e data
- comunicação entre agentes
- gating para mudanças críticas

### Out of scope
- implementação do MVP de IA
- mudanças estruturais no shell
- desenho da navegação
- configuração detalhada do modelo de IA

## Deliverables

- plano de rollout
- plano de rollback
- procedimento de comunicação entre agentes
- regra de promoção por módulo

## Notas de Preparação da OPS-1

Para manter esta story prática e evitar débito técnico, a forma recomendada de entrega é:

1. publicar uma nota de promoção por wave para a fundação já validada pela QA-1
2. manter `IA Native` atrás do gate documentado até DEV-4 e QA-2 concluírem
3. definir rollback como desativação da entrada do módulo primeiro, sem migração de dados nesta fase
4. registrar versão, data, owner, ambiente, escopo e limitações em toda nota de promoção ou rollback
5. tratar a prova visual de moeda como limitação conhecida do ambiente até que exista novamente um caminho acessível de preview no browser

## Checklist Operacional da OPS-1

### 1. Base recebida da QA-1
- [x] QA-1 concluiu a validação da fundação modular com evidência observável
- [x] O shell modular está validado em staging autenticado
- [x] `IA Native` permanece oculto por gate e fora do shell publicado
- [x] Fallback e rollback disablement já estão documentados no contrato
- [x] A limitação de moeda no browser está registrada como bloqueio de evidência, não como regressão

### 2. Preparar a nota de promoção
- [x] Identificar a wave ou módulo promovido
- [x] Registrar versão, data, owner e ambiente
- [x] Declarar o escopo exato da promoção
- [x] Declarar limitações conhecidas
- [x] Incluir a instrução exata de rollback

### 3. Aprovações e comunicação
- [x] Confirmar aprovação do PM para mudanças sensíveis de escopo
- [x] Confirmar aprovação do Architect para mudanças de fronteira
- [x] Confirmar aprovação do UX para navegação e hierarquia da informação
- [x] Confirmar o sign-off da QA anexado ou referenciado
- [x] Compartilhar a nota de promoção com os agentes dependentes

### 4. Execução do rollout
- [ ] Validar que o módulo ou wave promovido está visível apenas no escopo definido
- [ ] Confirmar labels de contexto e módulo ativo
- [ ] Confirmar comportamento de moeda e acesso
- [ ] Confirmar ausência de regressão entre módulos já estáveis
- [ ] Manter observação ativa na primeira janela de validação

### 5. Reversão controlada
- [ ] Repetir o disablement da entrada do módulo via gate
- [ ] Verificar que o shell continua operando normalmente
- [ ] Confirmar que não há necessidade de migração de dados
- [ ] Registrar motivo, escopo e timestamp da reversão
- [ ] Garantir que o estado documentado permite reverter sem improviso

### 6. Traceabilidade final
- [ ] Atualizar o registro de versão
- [ ] Atualizar o registro de data e ambiente
- [ ] Atualizar o status da wave
- [ ] Consolidar notas e limitações em um único ponto de referência

## Wave Execution Template

Use este bloco para cada wave ou módulo promovido.

### Wave Metadata
- Wave:
- Module:
- Scope:
- Owner:
- Environment:
- Version:
- Date:

### Promotion Note
- Expected change:
- Known limitations:
- Rollback instruction:
- Approvals recorded:
- QA reference:
- Related release note:

### Validation Log
- Staging URL:
- Browser validation status:
- Desktop result:
- Mobile result:
- Shell labels observed:
- Feature gate state:
- Rollback rehearsal status:

### Rollback Log
- Trigger:
- Disabled module entry:
- Time recorded:
- Scope of reversal:
- Stable modules preserved:
- Data migration required:

### Traceability Record
- Status:
- Notes:
- Follow-up owner:
- Next story:

## Worked Example

### Wave Metadata
- Wave: Wave 2 - Environments and Governance
- Module: Foundation shell and staging baseline
- Scope: modular shell validation, staging mirror, rollout/rollback readiness
- Owner: @devops
- Environment: staging preview + authenticated QA session
- Version: 2026.08.21-baseline
- Date: 2026-08-21

### Promotion Note
- Expected change: confirm that the modular shell, staging mirror and operational gates are ready for the next delivery wave
- Known limitations: browser proof for currency context is blocked in this environment; keep it documented, not treated as product regression
- Rollback instruction: disable the affected module entry via gate first, then preserve stable modules and avoid data migration
- Approvals recorded: QA sign-off through the QA-1 evidence trail
- QA reference: [`/Users/fabiogomes/Projetos/lodgra/docs/stories/ia-native/qa-1-checklist-validacao.md`](/Users/fabiogomes/Projetos/lodgra/docs/stories/ia-native/qa-1-checklist-validacao.md)
- Related release note: foundation package for modular shell and staging readiness

### Validation Log
- Staging URL: `https://home-stay-qvmxqaath-fabiolpgomes-projects.vercel.app`
- Browser validation status: partial, blocked by browser policy for the protected preview
- Desktop result: authenticated staging shell verified
- Mobile result: mobile shell labels and `Mais`/`Módulos` visibility verified
- Shell labels observed: `Base da plataforma`, `Core`, `Operação`, `Empresa`, `Proprietário`, `Módulos`, `Atalhos da conta`
- Feature gate state: `IA Native` hidden (`published: false`)
- Rollback rehearsal status: documented at contract level, ready for operational rehearsal once a reachable preview path returns

### Rollback Log
- Trigger: navigation regression, module context confusion, currency inconsistency, feature gate failure, unstable IA Native behavior
- Disabled module entry: `IA Native`
- Time recorded: 2026-08-21
- Scope of reversal: module entry only, preserve stable shell modules
- Stable modules preserved: Core, Operação, Empresa, Proprietário
- Data migration required: no

### Traceability Record
- Status: ready for OPS-1 execution
- Notes: QA-1 provides the baseline evidence; browser currency proof remains blocked by environment policy; the shell registry gate was re-asserted in code on 2026-08-22 so `IA Native` remains `published: false`
- Follow-up owner: @devops
- Next story: PM-2

## Communication Note

Wave 2 is ready for operational communication based on the validated foundation package.

### To PM
- Scope: foundation shell and staging baseline
- Expected user-visible change: no new product behavior; confirmation that the modular shell is safe for the next wave
- Risk: browser currency proof remains blocked in this environment
- Request: approve the scope boundary for the next promotion step

### To Architect
- Scope: shell contract, module gate and rollback model
- Expected user-visible change: hidden `IA Native` stays outside the published shell
- Risk: no product regression expected; only browser evidence remains blocked
- Request: confirm the boundary is acceptable for promotion control

### To UX
- Scope: navigation by public area and module labels
- Expected user-visible change: the module hierarchy remains stable and readable
- Risk: no layout change in this step
- Request: confirm the navigation and hierarchy remain aligned with the rollout order

### To QA
- Scope: staging baseline and regression coverage
- Expected user-visible change: QA evidence stays attached to the foundation package
- Risk: browser-render proof for currency remains blocked by the environment
- Request: keep the validation note as the acceptance baseline for OPS-1

### Approval Tracker
- PM: approved on 2026-08-22
- Architect: approved on 2026-08-22
- UX: approved on 2026-08-22
- QA: received via the QA-1 evidence trail

### Approval Response Log
- PM: approved on 2026-08-22. Scope is operational governance only; keep `IA Native` hidden and record traceability before promotion.
- Architect: approved on 2026-08-22. Shell contract is safe, fallback stays intact and rollback remains reversible by gate.
- UX: approved on 2026-08-22. Navigation and information hierarchy are clear; keep the wave order explicit in the text.
- QA: received via the QA-1 evidence trail
- Decision rule: when PM, Architect and UX reply, capture the date, a short approval note and any scope caveat in this block before promoting the wave

### Follow-up Action
- Promote the traceability record from draft to active now that PM, Architect and UX approvals are recorded

## Approval Request Draft

### PM request
Please review and approve the Wave 2 scope boundary for the modular shell and staging baseline. No product behavior changes are being introduced in this step; this is a readiness confirmation for the next promotion gate.

### Architect request
Please confirm the shell contract, module gate and rollback model are acceptable for promotion control. The `IA Native` entry remains hidden and the current change only reinforces the published-shell boundary.

### UX request
Please confirm the navigation by public area and module labels remains aligned with the rollout order. There is no layout change in this step, only a communication and governance baseline.

### QA reference
QA-1 already provides the acceptance baseline for the foundation package. The remaining browser-render proof for currency context is still blocked by the environment and is documented as such.

## Traceability Final Draft

### Current state
- Status: approved for execution
- Wave: Wave 2 - Environments and Governance
- Module: Foundation shell and staging baseline
- Environment: staging preview + authenticated QA session
- Version: 2026.08.21-baseline
- Last updated: 2026-08-22

### Evidence attached
- QA-1 smoke-test baseline
- shell registry gate re-asserted in code
- regression test covering hidden `IA Native`
- communication note for PM, Architect, UX and QA
- PM approval recorded on 2026-08-22
- Architect approval recorded on 2026-08-22
- UX approval recorded on 2026-08-22

### Open items
- browser-render proof for currency context when the environment allows it

### Next action
- promote the traceability record from draft to active and keep the browser limitation documented

## Pending By Role

### PM
- Approval recorded on 2026-08-22.
- Scope boundary remains operational and does not change product behavior.

### Architect
- Approval recorded on 2026-08-22.
- Shell contract and rollback model remain safe with `IA Native` hidden.

### UX
- Approval recorded on 2026-08-22.
- Public-area navigation and module-label hierarchy remain aligned with the rollout order.

## Message Drafts

### PM message
Hi PM, the Wave 2 foundation package is ready for scope approval. This step does not introduce product behavior changes; it only confirms the modular shell and staging baseline are safe for the next promotion gate. Please approve the scope boundary when you can.

### Architect message
Hi Architect, the shell contract and rollback model are ready for boundary approval. `IA Native` remains hidden in the published shell, and this step only reinforces the existing gate. Please confirm the boundary is acceptable for promotion control.

### UX message
Hi UX, the navigation by public area and module-label hierarchy are ready for review. There is no layout change in this step, only a governance baseline for Wave 2. Please confirm the navigation order remains aligned with the rollout plan.

## Current Status

- Communication package is ready.
- Approval responses are recorded for PM, Architect and UX.
- QA baseline is attached through the existing evidence trail.
- The shell registry gate remains hidden for `IA Native`.
- Browser-render proof for currency context is still blocked by the environment.

## QA Results

**Review Type:** Operational readiness QA review
**Decision:** PASS WITH CONCERNS

### Summary
OPS-1 is structurally ready to support modular rollout and rollback by wave. The story already has clear promotion order, approval flow, traceability fields, rollback triggers, and a documented disablement path through the module gate. The staging setup also documents a restoration path through the production-to-staging sync flow, which covers the practical restore point for this phase.

### Evidence
- `docs/STAGING_SETUP.md` documents the production-to-staging restore flow and manual sync procedure
- `docs/stories/ia-native/ops-1-rollout-rollback.md` defines promotion order, rollback triggers, and rollback actions
- the shell contract keeps `IA Native` hidden until an explicit gate promotion
- QA-1 baseline evidence is already attached to the operational package

### Concerns
- the story still leaves the "staging/production restore point" AC open as written, so production-side restoration is not explicit yet
- rollback remains documented and gated, but the execution rehearsal is still mostly procedural rather than observed end-to-end
- the current environment limitation around browser currency proof still reduces visual confirmation depth for the promotion window

### Recommendation
Proceed with OPS-1 as the operating model for the next wave, but keep the restore-point AC tracked as a follow-up item until a production-side restoration note or equivalent operational proof is added.

## Next Steps

1. Keep the browser limitation documented until a reachable preview path is available again.
2. Promote the traceability record from draft to active.
3. Move on to the next operational wave with the recorded approvals attached.

## Reply Format

Use one line per role when replying to the request.

- PM: `Approved` / `Needs changes`
- Architect: `Approved` / `Needs changes`
- UX: `Approved` / `Needs changes`

If a role requests changes, keep the response scoped to the note above and record the follow-up directly in this story.

## Approval Packet

Use this single message to request all approvals at once:

> Wave 2 foundation package is ready for scope, boundary and navigation approval. This step does not change product behavior. `IA Native` remains hidden in the published shell, the rollback model is documented, and the only known limitation is browser-render proof for currency context in the current environment. Please reply with one line per role using `Approved` or `Needs changes`.

## Final Promotion Note

Use this note as the ready-to-send summary for the execution handoff.

### Metadata
- Wave: Wave 2 - Environments and Governance
- Module: Foundation shell and staging baseline
- Owner: @devops
- Environment: staging preview + authenticated QA session
- Version: 2026.08.21-baseline
- Date: 2026-08-22

### Note
Wave 2 is approved for execution. The modular shell and staging baseline remain stable, `IA Native` stays hidden behind the published-shell gate, and rollback remains reversible without data migration. The only documented limitation is browser-render proof for currency context in the current environment.

### Recorded approvals
- PM: approved on 2026-08-22
- Architect: approved on 2026-08-22
- UX: approved on 2026-08-22
- QA: received via the QA-1 evidence trail

### Promotion instruction
- Promote the traceability record from draft to active.
- Keep the browser limitation documented until a reachable preview path is available again.
- Preserve the hidden `IA Native` gate until the next wave explicitly changes its status.

### Execution Handoff Message
Wave 2 is approved for execution. The modular shell and staging baseline are stable, `IA Native` remains hidden behind the published-shell gate, and rollback stays reversible without data migration. Recorded approvals are in place for PM, Architect, UX and QA; the only known limitation is browser-render proof for currency context in the current environment.

### Execute Now
1. Promote the traceability record from draft to active.
2. Keep `IA Native` hidden behind the published-shell gate.
3. Preserve the browser limitation as documented evidence context.
4. Carry the recorded approvals forward into the next wave.

## Readiness Gate

Esta story só deve ser executada quando existir um staging acessível e validável em browser.

### Required evidence before promotion
- URL de staging atualizada e acessível
- smoke-test da QA-1 executado com evidência observável
- shell modular validado em desktop e mobile
- feature gates verificados em staging
- rollback de pelo menos um módulo ou capability documentado

### Blocking conditions
- URL documentada retorna `410 GONE`
- deployment atual exige SSO e não pode ser validado pela equipa
- QA-1 não tem evidência observável de execução
- rollback path existe apenas em documentação, sem prova operacional

---

## Rollout Model

### Promotion unit
- prefer promotion by wave when the change spans multiple modules
- allow promotion by module only when the change is isolated and independently reversible
- never promote the IA Native MVP into production without the staging validation path completed

### Promotion order
1. validate shell foundation
2. validate staging mirror
3. promote operational guardrails
4. promote module entrypoints
5. promote IA Native only after isolated validation

### Promotion requirements
- version is identified
- date is recorded
- scope is documented
- owner is explicit
- rollback path is confirmed before activation

---

## Rollback Model

### Rollback triggers
- navigation regression
- module context confusion
- currency or timezone inconsistency
- feature gate failure
- unstable IA Native behavior
- staging mismatch detected after promotion

### Rollback actions
- disable the affected module via gate when possible
- revert the last promoted wave if the change is not safely isolatable
- preserve stable modules when rollback is partial
- log the reason, scope and timestamp of the rollback

### Rollback rules
1. rollback must not depend on improvisation
2. rollback must be reversible from documented state
3. rollback must preserve user trust and system integrity
4. if a module cannot be rolled back safely, it must not be promoted

---

## Governance and Communication

### Required approvals
- PM for scope-sensitive changes
- Architect for boundary-sensitive changes
- UX for navigation and information architecture changes
- QA for readiness to promote

### Communication payload
Each promotion notice must state:
- wave or module being promoted
- exact scope
- expected user-visible change
- known limitations
- rollback instruction

### Promotion notice template
- `Wave`: identifier of the promoted unit
- `Scope`: modules, routes or capabilities included
- `Expected change`: what users will see
- `Limitations`: what is intentionally not changing
- `Rollback`: exact disable/revert instruction
- `Owner`: accountable agent
- `Timestamp`: promotion date and time

### Traceability
- version
- date
- owner
- environment
- status
- notes

---

## Operational Checklist

Before promotion:
- staging validation passed
- QA sign-off recorded
- rollback path documented
- module gate confirmed
- no critical unresolved issues

Before promotion, also confirm:
- staging URL is reachable without dead links
- QA smoke-test evidence is attached or referenced
- browser validation succeeded on the current deployment target
- the environment does not require manual workaround to inspect core flows

After promotion:
- confirm module visibility
- confirm context labels
- confirm currency and access behavior
- confirm no cross-module regression
- keep monitoring active during the first validation window

After promotion, also confirm:
- a rollback rehearsal is possible from the documented state
- the promotion notice has been shared to the dependent agents
- the version/date/environment traceability record is updated

## Mini Runbook

Use esta sequência para executar a OPS-1 sem improviso.

1. Confirmar a baseline recebida da QA-1.
2. Escolher a wave ou módulo a promover.
3. Preencher o `Wave Execution Template`.
4. Confirmar aprovações necessárias.
5. Publicar a nota de promoção com escopo, limitações e rollback.
6. Executar o rollout apenas no escopo definido.
7. Verificar visibilidade, contexto, moeda e ausência de regressão.
8. Registrar a traceabilidade final.
9. Se houver problema, desativar a entrada do módulo via gate.
10. Confirmar que o shell continua operando e registrar a reversão.

---

## Handoff Criteria to PM-2

This story is ready to move to PM-2 when:
- rollout unit is defined
- rollback is reversible and documented
- approvals are explicit
- communication format is ready
- IA Native promotion is gated behind validation

## Handoff Notes

- esta story fecha a fundação antes da wave do MVP de IA
- a próxima story da cadeia é PM-2

## Verified Inputs

- QA-1 validated the modular shell and staging baseline on 2026-08-21
- `IA Native` is already isolated in the shell registry with `published: false`
- fallback and rollback disablement are backed by the current shell contract
- browser proof for currency context remains blocked in this environment and does not change the rollout model

## OPS-1 Baseline Update - 2026-08-22

- the shell registry gate was re-asserted in code and regression-tested, keeping `IA Native` hidden until DEV-4
- `npm run typecheck` passed after the registry change
