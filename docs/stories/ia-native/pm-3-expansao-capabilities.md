# Story PM-3 - Definir critérios para expansão de capabilities

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @pm  
**Quality Gate:** @architect + @qa  
**Depends On:** PM-2, DEV-4

---

## Product Intent

A modularização só vale a pena se as regras de expansão forem claras.

Depois do MVP de IA Native ser validado e integrado, o produto precisa de critérios objetivos para decidir:
- o que vira nova capability
- o que permanece no core
- o que continua isolado
- o que exige nova wave de validação

## Story

**Como** PM do Lodgra,  
**Quero** definir critérios para expandir capabilities depois do MVP de IA,  
**Para que** o produto cresça de forma modular e previsível.

## Context

Sem critérios de expansão, cada nova ideia pode reabrir o sistema inteiro.

Esta story cria a regra de crescimento para o futuro do Lodgra modular.

## PM-3 Baseline

Esta story fecha a transição entre o MVP validado e a próxima fase de crescimento.

Ela parte de três entregas já estabelecidas:

- a PM-2 definiu o recorte do MVP de IA Native e a leitura mínima de produto
- a UX-3 já enquadrou o módulo como capability nativa no shell
- a DEV-4 integra a capability ao shell modular com ativação controlada

A função da PM-3 é impedir expansão ad hoc, deixando explícito:
- o que pertence ao core
- o que entra como capability
- o que deve permanecer como extension
- o que precisa de uma nova wave antes de crescer

O resultado esperado é um critério reutilizável para futuras decisões de roadmap, sem congelar o produto num único caso de uso.

## Acceptance Criteria

### AC1: Critérios de expansão
- [x] Existe critério para adicionar novos casos de uso de IA
- [x] Existe critério para expandir outros módulos da plataforma
- [x] Existe critério para reusar o shell modular em futuras features

### AC2: Critérios de priorização
- [x] O que entra no core tem prioridade clara
- [x] O que permanece fora do core é explicitado
- [x] O que entra como capability isolada tem regra de validação

### AC3: Governança da evolução
- [x] Cada nova feature deve informar módulo, público e impacto
- [x] Cada nova feature deve informar se é core, capability ou extensão
- [x] A expansão futura preserva modularidade e reduz acoplamento

### AC4: Compatível com roadmap
- [x] O critério permite manter o MVP atual estável
- [x] O critério permite planejar novas waves sem ambiguidades
- [x] O critério facilita o handoff para arquitetura e QA

## Scope

### In scope
- regra de expansão de capabilities
- critérios de decisão para novas features
- modelo de governança de evolução
- classificação de features por tipo

### Out of scope
- desenvolvimento de novas capabilities
- desenho do shell
- mudanças de navegação
- expansão do MVP de IA além do recorte validado

## Deliverables

- regra de expansão de capabilities
- critérios de decisão para novas features
- modelo de governança de evolução
- base para roadmap futuro
- one-pager de política de expansão em [pm-3-expansion-policy.md](pm-3-expansion-policy.md)

## PM-3 Product Checklist

### 1. Expansion clarity
- [x] Core, capability and extension are clearly distinguishable
- [x] The product team can classify new ideas without reopening architecture debates
- [x] The decision path for new features is explicit
- [x] The current MVP remains stable while expansion rules are defined

### 2. Governance
- [x] Every new feature declares module, audience and impact
- [x] Every new feature declares whether it changes navigation
- [x] Every new feature declares whether it needs a new wave
- [x] Every new feature declares rollback expectations

### 3. Roadmap hygiene
- [x] Shared concerns can move to core when repeated
- [x] Narrow additions can stay as extensions
- [x] New shell entries are justified, not automatic
- [x] The expansion policy reduces coupling instead of increasing it

### 4. Handoff readiness
- [x] Architecture can reuse the classification model
- [x] QA can validate future features against the policy
- [x] Product can plan the next wave without ambiguity
- [x] The MVP is protected from accidental scope creep

---

## Expansion Policy

### 1. Core vs capability vs extension

**Core**
- transversal to the platform
- shared by multiple modules
- required for tenancy, security, identity, currency, timezone or governance

**Capability**
- user-facing bounded value stream
- can be enabled or disabled independently
- may run as a module or submodule
- has its own entry, state and lifecycle

**Extension**
- a narrower addition inside an existing module or capability
- does not redefine the product structure
- does not need a new shell entry

### 2. Expansion decision questions

Before any new feature is accepted, answer:
- which user or organization needs this?
- which module owns it?
- is it core, capability or extension?
- does it require its own state machine?
- does it need its own validation wave?
- can it be disabled without breaking the platform?
- does it introduce shared logic that should move to core?

### 3. Validation thresholds

A new item can become a capability only if:
- it has clear product value
- it has a defined owner and audience
- it can be isolated and rolled back
- it can be validated without opening the whole core
- it does not duplicate an existing module boundary

A new item stays an extension if:
- it is scoped inside an existing module
- it does not require a new entry point
- it does not change the platform mental model

A new item belongs in core only if:
- multiple modules need it
- leaving it out would cause duplication or inconsistency
- it governs identity, security, tenancy, currency, timezone or platform-wide policy

### 4. Governance model

- every future feature must declare module, audience and impact
- every future feature must declare lifecycle and rollback expectations
- every future feature must declare whether it changes navigation
- every future feature must declare whether it requires a wave
- no feature may silently expand the core without review

### 5. Roadmap hygiene

- keep the current MVP stable before adding new capabilities
- prefer extensions inside existing modules over new shell entries
- promote shared concerns to core only when proven repeated
- isolate future AI ideas behind the same modular pattern
- maintain a decision log for why something was classified as core, capability or extension

---

## Classification Examples

- `Property Intelligence` = capability
- currency conversion utility = core
- new report filter inside Property Intelligence = extension
- new owner-facing AI module = capability
- extra field in the same analysis flow = extension

---

## Handoff Criteria to the Next Planning Cycle

This story is ready to close when:
- the product has a clear expansion policy
- future features can be classified without reopening architecture debates
- modular growth can continue without weakening the shell
- the MVP remains stable while the roadmap evolves

## Handoff Package

### For architecture
- use the core / capability / extension split as the default classification model
- treat shared concerns as core only when repeated across modules
- keep navigation changes explicit and reviewable

### For QA and delivery
- validate new features against the classification questions
- verify rollback expectations before enabling a new capability
- block scope creep that does not have a clear module owner

### Evidence to collect
- one-page expansion policy
- feature classification examples
- governance checklist for future waves
- roadmap rule for when a new shell entry is justified

## Handoff Notes

- esta story fecha a wave do MVP de IA
- esta story é consumida após DEV-4 e UX-3
- a próxima onda deve usar este critério como filtro de expansão
- a política formal está consolidada em `docs/stories/ia-native/pm-3-expansion-policy.md`
- QA-3 recebe a regra de classificação como input de validação
