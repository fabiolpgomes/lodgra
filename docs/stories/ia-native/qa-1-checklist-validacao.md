# Story QA-1 - Checklist de validação da fundação modular

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Owner:** @qa  
**Depends On:** PM-1, ARCH-1, UX-1, DEV-1, DEV-2

---

## QA Intent

A fundação modular só pode avançar se a navegação, o contexto e o staging provarem que a separação por módulos realmente funciona.

Esta story valida se a base está pronta para seguir para rollout e MVP de IA Native.

## Story

**Como** QA da plataforma,  
**Quero** validar a fundação modular e o staging,  
**Para que** a evolução entre sem regressões nem ambiguidade.

## Acceptance Criteria

### AC1: Validação de navegação
- [ ] O menu separa os módulos corretamente
- [ ] O módulo ativo fica claro
- [ ] Não existem entradas duplicadas ou confusas

### AC2: Validação de contexto
- [ ] Empresa, Operação e Proprietário são distinguíveis
- [ ] IA Native aparece como capability separada
- [ ] O staging reflete o comportamento esperado

### AC3: Validação de segurança de rollout
- [ ] Existe caminho de rollback
- [ ] Existe caminho de promoção para produção
- [ ] Mudanças sensíveis têm checklist de validação

### AC4: Validação de base modular
- [ ] O shell mantém consistência entre módulos
- [ ] O contexto não se perde ao trocar de módulo
- [ ] O staging permite testar o comportamento real

## Scope

### In scope
- validação do menu e navegação
- validação da distinção por público
- validação do staging espelho
- validação do caminho de promoção e rollback

### Out of scope
- implementação de novas features
- integração do MVP de IA
- alterações de layout
- mudanças em produção

## Deliverables

- checklist de validação
- relatório de riscos encontrados
- recomendação para avançar ou corrigir

## Smoke Test Checklist

Executar este checklist no staging antes de fechar a fundação modular:

### Shell e navegação
- [ ] O menu lateral separa claramente Core, Operação, Empresa, Proprietário e IA Native
- [ ] O módulo ativo fica destacado sem ambiguidade
- [ ] Não existem entradas duplicadas para a mesma capability
- [ ] A navegação mobile espelha os módulos publicados sem perder contexto

### Contexto e identidade
- [ ] O top bar mostra o contexto correto da empresa, operação ou proprietário
- [ ] IA Native aparece como capability isolada, não como página órfã
- [ ] O contexto de moeda é exibido quando houver risco de ambiguidade
- [x] O utilizador consegue entender em que módulo está antes de agir

### Staging e segurança operacional
- [x] O staging reproduz o comportamento esperado do shell modular
- [x] O feature gate consegue ocultar um módulo sem quebrar os restantes
- [x] A navegação fallback permanece funcional quando um módulo é desativado
- [x] O rollback disablement não exige intervenção improvisada

### Evidência de validação
- [ ] Cada item acima foi testado em staging com resultado observável
- [ ] Os riscos encontrados foram registados com data e contexto
- [ ] A recomendação final distingue falha de implementação de falha de documentação

## Handoff Notes

- esta story bloqueia a promoção para a wave seguinte
- a próxima story da cadeia é OPS-1

## QA Results

**Review Type:** Document-level QA review
**Decision:** CONCERNS

### Summary
The foundation is structurally sound and the core shell contracts are passing in automated tests. PM-1, ARCH-1, UX-1, DEV-1 and DEV-2 now form a coherent modular path with staging readiness documented, but the QA evidence trail still needs one clearer pass on browser-observable staging proof and the IA Native visibility narrative needs to stay aligned with the code-level gate model.

### Strengths
- module separation is explicit across product, architecture and UX
- the staging mirror is documented with production-like fidelity and sanitization expectations
- rollout and rollback are already part of the wave design
- focused shell tests passed on 2026-08-25 for registry, sidebar, top bar and bottom nav

### Concerns
- the smoke-test checklist still lacks a complete one-item-per-evidence trail in the browser for the current preview target
- the story narrative should explicitly say that IA Native is controlled by the navigation/access gate, because the registry currently publishes the module and the shell components filter it later
- promotion and rollback are documented, but the final operational proof is still stronger in the runbook than in attached staging evidence
- browser-render proof for currency context remains pending in this environment, so that item should stay marked as an execution limitation rather than a product defect

### Risk Level
- Medium

### Recommendation
- the core modular shell is ready for the next operational gate, but QA-1 should remain CONCERNS until the browser smoke trail is attached to the story
- hand off to OPS-1 with the current evidence trail, and keep the missing browser proof explicitly tracked as an environment limitation
- update the story narrative so the IA Native visibility model matches the actual implementation: published in the registry, then filtered by the shell gate

### Verified on 2026-08-25
- the staging baseline is documented with Supabase project `wrqjpyyopwgyqluqkcga` and the current preview deployment reference
- targeted shell tests passed for `module-shell`, `Sidebar`, `TopBar` and `BottomNav`
- the registry and shell contract still preserve fallback navigation when a module is not accessible
- the preview/browser evidence for the full smoke checklist remains partial in this environment
- the documented IA Native visibility model should be described as access-gated in the shell, not simply hidden in the registry
