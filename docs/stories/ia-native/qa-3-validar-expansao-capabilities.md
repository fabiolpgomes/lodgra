# Story QA-3 - Validar a política de expansão de capabilities

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @qa  
**Depends On:** PM-3, UX-3, DEV-4

---

## QA Intent

A política de expansão só é útil se for verificável, aplicável e simples de usar nas próximas decisões de produto.

## Story

**Como** QA da plataforma,  
**Quero** validar a política de expansão de capabilities,  
**Para que** o Lodgra cresça de forma modular, previsível e sem reabrir o core a cada nova ideia.

## Context

Esta story valida se a regra definida em PM-3 pode ser usada na prática para classificar futuras iniciativas sem ambiguidade.

O foco não é implementar nova funcionalidade, mas verificar se a política de crescimento:
- diferencia core, capability e extension com clareza
- orienta decisões de roadmap
- protege o MVP atual contra scope creep
- fornece um handoff útil para arquitetura, produto e QA de próximas waves

## QA-3 Baseline

Esta validação parte de quatro contratos já fechados:

- PM-2 definiu o recorte do MVP de IA Native e o posicionamento do primeiro módulo AI-native
- UX-3 enquadrou a capability no shell como presença nativa, sem parecer experimental
- PM-3 definiu a política de expansão, os critérios de classificação e a governança de evolução
- DEV-4 integrou a capability ao shell modular com ativação controlada e desligamento seguro

O papel da QA-3 é verificar se a política de expansão é suficientemente objetiva para orientar a próxima wave sem reabrir debates estruturais.

## Acceptance Criteria

### AC1: Clareza de classificação
- [x] Core, capability e extension podem ser distinguidos sem ambiguidades
- [x] A classificação de novas ideias não depende de interpretação ad hoc
- [x] A política responde o que entra no core e o que fica fora dele

### AC2: Governança aplicável
- [x] Cada nova feature pode declarar módulo, público e impacto
- [x] Cada nova feature pode declarar se muda navegação
- [x] Cada nova feature pode declarar se precisa de nova wave
- [x] Cada nova feature pode declarar expectativas de rollback

### AC3: Proteção do roadmap
- [x] A política evita expansão acidental do core
- [x] A política evita novos shell entries sem justificativa
- [x] A política permite manter o MVP estável enquanto o roadmap evolui

### AC4: Pronto para a próxima wave
- [x] A política é acionável por produto, arquitetura e QA
- [x] A política pode ser aplicada a novos casos de uso sem retrabalho
- [x] Existe evidência suficiente para usar a regra como filtro de expansão

## Scope

### In scope
- validação da política de expansão
- validação dos critérios de classificação
- validação da governança para futuras features
- validação da aplicabilidade da regra em exemplos reais

### Out of scope
- implementação de novas capabilities
- alterações no shell
- novas regras de produto fora da política aprovada
- mudanças na navegação principal

## Deliverables

- checklist de validação da política de expansão
- relatório de ambiguidades ou riscos
- recomendação para uso da regra nas próximas waves

## QA-3 Validation Checklist

### 1. Classification clarity
- [ ] Verify core, capability and extension are distinguishable in real examples
- [ ] Verify the policy answers classification without needing architecture debate
- [ ] Verify the current MVP is clearly protected from reclassification drift

### 2. Governance applicability
- [ ] Verify a future feature can declare module, audience and impact
- [ ] Verify a future feature can declare navigation impact
- [ ] Verify a future feature can declare whether it needs a new wave
- [ ] Verify rollback expectations can be stated before execution

### 3. Roadmap protection
- [ ] Verify the policy blocks accidental core growth
- [ ] Verify the policy discourages new shell entries without justification
- [ ] Verify extensions remain extensions unless evidence says otherwise
- [ ] Verify repeated shared concerns can be promoted to core only with proof

### 4. Handoff readiness
- [ ] Verify product can use the policy to prioritize future ideas
- [ ] Verify architecture can reuse the classification model
- [ ] Verify QA can apply the same checks to later waves
- [ ] Verify the policy is stable enough to become a planning gate

## Handoff Notes

- esta story é consumida após PM-3 e DEV-4
- a próxima decisão da cadeia é usar a política como filtro de expansão

## Session Update - 2026-08-24

### What was prepared
- PM-3 now has a reusable expansion policy artifact and session note
- UX-3 now has shell-entry copy aligned with `Property Intelligence`
- DEV-4 already proved the capability boundary is controlled and reversible
- QA-3 is now ready to be used as the next governance gate for future capabilities

## QA-3 Handoff Package

### For product and architecture
- use the classification model as the default lens for new ideas
- require module, audience, impact and rollback expectations before approval
- keep new shell entries justified and reviewable

### For QA and delivery
- validate future ideas against the classification checklist
- block scope creep that cannot be classified cleanly
- preserve the MVP until a new wave is explicitly warranted

### Evidence to collect
- classification examples for core, capability and extension
- governance checks for future features
- roadmap hygiene observations
- recommendation about whether the policy is ready to become a standing gate

## QA Results

**Review Type:** Design + governance QA review
**Decision:** PASS

### Summary
PM-3 now provides a concrete expansion policy artifact at `docs/stories/ia-native/pm-3-expansion-policy.md`, and DEV-4 established the integrated IA Native baseline. The classification model is clear enough to be used as a planning and QA filter for future work:
- core = transversal platform concerns such as tenancy, security, identity, currency, timezone and governance
- capability = bounded user-facing value streams that can be independently enabled, disabled and validated
- extension = narrower additions inside an existing module or capability without a new shell entry

The policy is internally consistent, reusable, and simple enough for product, architecture and QA to apply without reopening the MVP core.

### Risks to verify
- future decisions still need an explicit decision log to prevent interpretation drift over time
- the policy is validated as a governance artifact, but not yet stress-tested across many real roadmap examples
- navigation-impact checks remain dependent on disciplined usage by product and architecture
- repeated shared concerns should still be reviewed before promotion to core

### Recommendation
Appropriate to use this policy as the default filter for the next planning cycle.

Recommend keeping it as a standing governance gate, with these follow-ups:
- require module, audience, impact and rollback expectations before approval
- keep new shell entries justified and reviewable
- revisit the policy after the next real feature classification to confirm it remains unambiguous

## QA Results - 2026-08-24

**Review Type:** Execution QA review
**Decision:** PASS

### Summary
The 2026-08-24 validation confirmed the policy works as a reusable gate. The classification model remained unambiguous for the documented examples, the governance rules were actionable, and the roadmap protection logic stayed aligned with the shell and feature-gating implementation already in place.

### Evidence
- `npm test -- --runInBand src/__tests__/lib/features/featureRollout.test.ts`
- `npm test -- --runInBand src/__tests__/navigation/module-shell.test.ts`
- `npm run typecheck`
- [`pm-3-expansion-policy.md`](/Users/fabiogomes/Projetos/lodgra/docs/stories/ia-native/pm-3-expansion-policy.md)

### Residual Notes
- the policy is ready for the next planning cycle, but future decisions should still be logged to avoid interpretation drift
- navigation-impact checks remain a discipline issue, not a policy issue
- repeated shared concerns should continue to be reviewed before promotion to core

## QA Results - 2026-08-25

**Review Type:** Execution QA review
**Decision:** PASS

### Summary
The 2026-08-25 validation confirmed the expansion policy remains clear, actionable and stable as a governance gate. The classification model still separates core, capability and extension without ambiguity, and the roadmap rules continue to protect the MVP from accidental scope creep.

### Evidence
- `npm test -- --runInBand src/__tests__/lib/features/featureRollout.test.ts src/__tests__/navigation/module-shell.test.ts`
- `npm run typecheck`
- [`pm-3-expansion-policy.md`](/Users/fabiogomes/Projetos/lodgra/docs/stories/ia-native/pm-3-expansion-policy.md)

### Residual Notes
- the policy is validated as a standing gate, but future feature classifications should still be logged to avoid interpretation drift
- navigation-impact checks remain a discipline issue for product and architecture
- repeated shared concerns should continue to be reviewed before promotion to core

### Recommendation
- keep the expansion policy as the default filter for future waves
- require module, audience, impact and rollback expectations before approval
- keep new shell entries justified and reviewable
