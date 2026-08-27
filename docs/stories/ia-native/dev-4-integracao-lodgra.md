# Story DEV-4 - Integrar o MVP de IA Native ao Lodgra

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @dev  
**Quality Gate:** @qa  
**Depends On:** DEV-3, QA-2, OPS-1

---

## Technical Intent

A integração do MVP ao Lodgra deve acontecer só depois da validação isolada.

O objetivo é colocá-lo dentro do shell modular sem quebrar a capacidade de desligar a funcionalidade, sem afetar os módulos existentes e sem misturar a IA com o core operacional.

## Story

**Como** equipa de produto e engenharia,  
**Quero** integrar o MVP de IA Native ao Lodgra apenas após validação,  
**Para que** a capability passe a fazer parte da plataforma sem quebrar a modularidade.

## Context

A integração é o ponto de passagem da capability validada para o produto principal.

Ela precisa respeitar:
- fronteiras definidas na arquitetura
- leitura por público definida na UX
- plano de rollout definido na operação

## DEV-4 Baseline

Esta story parte de três entregas já validadas ou preparadas:

- PM-2 fechou o recorte do MVP de IA Native como discovery MVP CLI-first, isolado do operacional
- ARCH-2 fechou o contrato do motor de viabilidade, os serviços comuns e o desligamento seguro
- UX-2 fechou a leitura do resultado, a hierarquia de informação e o comportamento de decisão

Além disso, a QA-2 e a OPS-1 deixam claro o que precisa estar pronto antes da integração:
- o MVP precisa estar executando em staging com telemetria mínima
- a capability precisa poder ser desligada sem quebrar os módulos existentes
- a promoção precisa ser rastreável e reversível
- a QA-2 local já confirmou determinismo, blockers corretos e telemetria visível

O objetivo da DEV-4 não é redesenhar o MVP. É colocá-lo dentro do shell modular com o menor acoplamento possível, preservando a separação entre capability validada e produto operacional.

## Acceptance Criteria

### AC1: Integração controlada
- [ ] O MVP aparece dentro do shell modular do Lodgra
- [ ] A integração não altera o comportamento dos módulos existentes
- [ ] A IA continua separável do core

### AC2: Reaproveitamento do core
- [ ] A integração usa autenticação, permissões e design system comuns
- [ ] A integração respeita moeda, timezone e contexto de organização
- [ ] A entrada do módulo é consistente com o restante produto

### AC3: Rollout gradual
- [ ] Existe possibilidade de ativar por segmento, org ou feature flag
- [ ] Existe possibilidade de desativar sem impactar operação
- [ ] Existe validação final antes de promover para produção

### AC4: Pronto para UX e PM
- [ ] A entrada da IA no shell segue a UX-3
- [ ] A expansão futura segue a PM-3
- [ ] O closeout de governança segue a QA-3
- [ ] O comportamento pode ser promovido por onda

## Scope

### In scope
- integração da IA ao shell modular
- controle de ativação/desativação
- reaproveitamento de core comum
- promoção gradual por módulo ou segmento

### Out of scope
- criação do modelo de IA
- novas capacidades além do MVP
- alteração da navegação principal fora do módulo IA
- rollout sem validação

## Deliverables

- módulo IA Native integrado ao shell
- controle de ativação/desativação
- checklist final de promoção
- base para UX-3, PM-3 e QA-3

## DEV-4 Integration Checklist

### 1. Controlled entry
- [x] Expose the MVP in the Lodgra shell only when the gate is enabled
- [x] Keep the entry under the IA Native area defined by UX-1 and UX-3
- [x] Preserve the global shell context when entering and exiting the module
- [x] Keep the module hidden when disabled

### 2. Reuse of core platform primitives
- [x] Reuse authentication
- [x] Reuse organization context
- [x] Reuse permissions
- [x] Reuse the design system
- [x] Reuse currency and timezone primitives
- [x] Reuse audit / logging conventions

### 3. Isolation and rollback
- [x] Keep orchestrator internals isolated
- [x] Keep specialist agent logic isolated
- [x] Keep the deterministic engine isolated
- [x] Keep the analysis state machine isolated
- [x] Keep report generation logic isolated
- [x] Disable the module entry first on rollback
- [x] Preserve persisted analysis artifacts if any exist
- [x] Avoid any data migration in this phase

### 4. UX coherence
- [x] Keep the entry copy coherent with UX-3
- [x] Keep the loading, error and empty states distinct
- [x] Keep the navigation from hijacking other product areas
- [x] Keep the module readable as a capability, not as a new operational area

### 5. Rollout readiness
- [x] Confirm activation by org, segment or feature flag
- [x] Confirm staged rollout by cohort is possible
- [x] Confirm the capability can be turned off without side effects
- [x] Confirm the promotion checklist is complete before release

### 6. QA and follow-up
- [x] Confirm QA-2 had no blocking concerns for the integration path
- [x] Confirm no regression in current modules
- [x] Confirm the shell retains modular separation after integration
- [x] Confirm the package is ready for PM-3 expansion rules
- [x] Confirm the package is ready for QA-3 closeout validation

## Execution Notes

- do not widen the scope beyond the validated MVP
- do not introduce new capabilities during the integration step
- do not couple the MVP to shell internals
- keep the entry point controlled and reversible
- keep rollback instruction explicit and documented

---

## Integration Blueprint

### Integration pattern
- the capability enters the Lodgra shell as a dedicated module entry
- the module is exposed through the existing modular navigation contract
- feature gating controls who can see and use the capability
- the shell only knows about the module at the boundary, not its internal workflow

### What must be reused
- authentication
- organization context
- permissions
- design system
- currency and timezone primitives
- audit/logging conventions

### What must remain isolated
- orchestrator internals
- specialist agent logic
- deterministic calculation engine
- analysis state machine
- report generation logic

### Activation model
- enable by organization, segment or feature flag
- allow staged rollout by cohort
- allow fast disablement without altering other modules
- keep the capability hidden when it is not enabled

### Rollback model
- rollback must disable the module entry first
- the shell must continue to operate normally after disablement
- no data migration should be required for rollback at this stage
- any persisted analysis artifacts must remain readable after disablement

### Shell contract
- the module entry must appear under the IA Native area defined in UX-1 and UX-3
- the shell must preserve global context while entering and exiting the module
- the module must display its own loading, error and empty states
- the module must not hijack navigation for other product areas

### Compatibility rules
- respect multi-tenant scoping
- respect currency and timezone inherited from the organization context
- respect feature plan and permission checks
- respect the analysis state model established in the MVP

---

## Promotion Checklist

- MVP is validated in staging
- QA-2 has no blocking concerns for the integration path
- feature gate configuration is defined
- rollback path is documented and tested
- shell entry uses the existing modular routing contract
- no regression in current modules has been observed

---

## Definition of Done for DEV-4

- the IA Native module appears in the Lodgra shell only when enabled
- existing modules continue to behave normally
- the module can be disabled without side effects
- the entry copy and navigation remain coherent with UX-3
- the platform retains modular separation after integration

---

## Handoff Criteria to UX-3

This story is ready to move to UX-3 when:
- the module is visible in the shell through a controlled boundary
- the module can be toggled on and off safely
- the shell retains global context and modular navigation
- the UX can now refine the entry copy and hierarchy inside the live shell
- the integration does not introduce new product capabilities beyond the MVP

## Handoff Package

### For UX-3
- refine the entry copy only after the module is visible in the shell
- keep the UX focused on decision support, not operational workflow
- maintain the distinctiveness of the capability inside the live shell

### For PM-3
- define how future capabilities should be expanded without breaking modular boundaries
- keep the current MVP scope frozen until expansion criteria are explicit
- preserve the ability to turn the capability off

### For QA-3
- validate the expansion policy as a reusable product gate
- confirm the classification model can be applied without reopening the core
- verify roadmap hygiene after the integration step

### For QA follow-up
- verify the module remains disable-able
- verify no regression in existing modules
- verify the integration respects multi-tenant scoping and access rules

## Handoff Notes

- esta story só entra após QA-2
- a próxima story da cadeia é UX-3
- o closeout de governança segue em QA-3 após PM-3
- rollout control já está preparado para `IA_NATIVE_ROLLOUT_MODE`, `IA_NATIVE_ROLLOUT_PERCENT` e `IA_NATIVE_ROLLOUT_ALLOWLIST`
- PM-3 deve usar esta base para a política de expansão core / capability / extension
- QA-3 deve validar a política depois que PM-3 estiver finalizada

## Session Update - 2026-08-24

### What was confirmed
- the IA Native entry is already wired into the shell through the existing modular routing contract
- the shell hides IA Native when the feature gate is disabled and shows it when enabled
- the integration remains bounded to the capability boundary, with no shell-wide regression
- the new regression test coverage lives in `src/__tests__/components/common/layout/Sidebar.test.tsx`

### Validation completed
- `npm test -- --runInBand src/__tests__/components/common/layout/Sidebar.test.tsx`
- `npm test -- --runInBand src/__tests__/navigation/module-shell.test.ts`
- `npm test -- --runInBand src/__tests__/property-intelligence/property-intelligence.test.ts`
- `npm run typecheck`

## Dev Agent Record

### Progress

- Confirmed the IA Native module is already published in the shell registry and resolves through the existing modular navigation contract
- Confirmed the Sidebar hides and shows IA Native by feature gate without affecting the rest of the module shell
- Confirmed the dedicated IA Native analysis page preserves auth, organization context, currency and timezone while keeping the capability boundary intact
- Confirmed the stateless analysis API, feature gate and workbench remain isolated from the operational shell

### File List

- `src/lib/navigation/module-shell.ts`
- `src/components/common/layout/Sidebar.tsx`
- `src/app/[locale]/ia-native/page.tsx`
- `src/app/[locale]/ia-native/analyze/page.tsx`
- `src/app/[locale]/property-intelligence/page.tsx`
- `src/app/api/property-intelligence/analyze/route.ts`
- `src/components/features/property-intelligence/PropertyIntelligenceWorkbench.tsx`
- `src/lib/property-intelligence/gate.ts`
- `src/__tests__/navigation/module-shell.test.ts`
- `src/__tests__/components/common/layout/Sidebar.test.tsx`
- `src/__tests__/api/property-intelligence/analyze/route.test.ts`

### Validation

- `npm test -- --runInBand src/__tests__/navigation/module-shell.test.ts src/__tests__/components/common/layout/Sidebar.test.tsx src/__tests__/api/property-intelligence/analyze/route.test.ts`
- `npm run typecheck`
- `npm run lint`
