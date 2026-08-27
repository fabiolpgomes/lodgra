# Story DEV-2 - Preparar staging espelho da produção

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @dev  
**Quality Gate:** @qa  
**Depends On:** DEV-1

---

## Technical Intent

O staging precisa representar a produção com fidelidade suficiente para validar:
- modularização
- navegação por público
- isolamento da IA Native
- rollout e rollback

## Story

**Como** equipa de produto e engenharia,  
**Quero** um staging espelho da produção,  
**Para que** possamos validar modularização e IA sem risco operacional.

## Context

A mudança de arquitetura só é segura se existir um ambiente de validação próximo da realidade.

O staging serve como:
- local de prova para o shell modular
- local de prova para o MVP de IA Native
- local de prova para promoções e reversões

## Acceptance Criteria

### AC1: Ambiente staging criado
- [x] Existe ambiente separado de produção
- [x] O staging replica a estrutura principal
- [x] O staging é usado para validação antes de produção

### AC2: Dados e integrações
- [x] Dados podem ser mascarados ou anonimizados
- [x] Integrações críticas têm modo seguro de teste
- [x] O ambiente suporta navegação, cálculo e UI reais

### AC3: Segurança de rollout
- [x] Existe caminho claro para promoção
- [x] Existe caminho claro para rollback
- [x] Mudanças sensíveis não sobem sem validação

### AC4: Pronto para o MVP de IA
- [x] O staging está pronto para receber o MVP de IA Native
- [x] O ambiente permite validar comportamento e resultado

### AC5: Pronto para QA e DevOps
- [x] O staging permite validação funcional
- [x] O staging permite validação de estabilidade
- [x] O staging permite validação de desligamento seguro

## Scope

### In scope
- criação do staging
- replicação estrutural da produção
- mascaramento/anonimização de dados
- suporte a promoções e rollback
- preparação para a IA Native

### Out of scope
- implementação do MVP de IA
- desenho final dos módulos
- rollout em produção
- features novas fora da epic

## Deliverables

- staging espelho da produção
- checklist de promoção
- checklist de rollback
- base de validação para QA-1 e OPS-1

---

## Staging Architecture

### Environment model
- `production` remains the source of truth
- `staging` is a separate deployment target
- staging must mirror the production shell, routes and module visibility
- staging should use masked or synthetic data whenever sensitive information is present

### Fidelity requirements
- same app structure
- same shell navigation contract
- same feature gate logic
- same currency and timezone handling
- same error and loading states
- same module entry behavior

### Safe integration model
- external services should use test/sandbox credentials when available
- destructive actions must be disabled or redirected in staging
- any irreversible operation must be gated or mocked
- analytics and observability should stay active enough to validate behavior

---

## Environment Rules

1. Staging must not share mutable production data.
2. Staging must not be exposed as a public product environment.
3. Staging must allow QA to test navigation, calculations and module switching.
4. Staging must allow OPS to validate promotion and rollback.
5. Staging must be able to receive the IA Native MVP without changing its base contract.
6. If a production-like dependency cannot be mirrored safely, it must be explicitly isolated or mocked.

---

## Promotion and Rollback Readiness

### Promotion checklist
- shell module contract validated
- feature gate states confirmed
- critical flows verified in staging
- data masking confirmed
- module visibility confirmed
- rollback path documented

### Rollback checklist
- module can be disabled by gate
- no shared state is left in an inconsistent condition
- fallback navigation is available
- no permanent production-only changes are required to revert

---

## Validation Scope

The staging mirror must support:
- module navigation
- currency display
- context labels
- calculations and summaries
- module disabling
- future IA Native integration

It does not need to support:
- production traffic
- permanent customer-facing data
- final rollout automation
- the full IA Native MVP logic

---

## Handoff Criteria to QA-1

This story is ready to move to QA-1 when:
- staging is structurally equivalent to production
- sensitive data is masked or synthetic
- feature gates behave the same way as in production
- promotion and rollback paths are explicit
- the environment can safely host the foundation validation

## Handoff Notes

- esta story depende do shell modular
- esta story deve existir antes do MVP de IA
- a próxima story da cadeia é QA-1

---

## Staging Baseline

O staging espelho já existe como ambiente separado e pronto para validação funcional.

### Current known baseline
- Supabase staging project: `wrqjpyyopwgyqluqkcga`
- Vercel staging deployment: `https://home-stay-n5x5qqrg9-fabiolpgomes-projects.vercel.app`
- Staging organization: `Staging Test Org`
- Status operacional: `ACTIVE & READY FOR TESTING`

### Remaining validation focus
- confirmar que a navegação modular se comporta igual em staging e em produção
- validar que labels de contexto e moeda continuam visíveis e coerentes
- provar que o feature gate desativa módulos sem quebrar fallback
- registrar evidência real de rollback disablement e promotion readiness
- usar o fluxo de acesso documentado para o preview autenticado e manter essa URL como referência operacional

### Delivery note
- esta story não pede nova infra
- esta story pede evidência de espelhamento e de segurança operacional
- a conclusão depende do smoke-test da QA-1 e da governança da OPS-1
