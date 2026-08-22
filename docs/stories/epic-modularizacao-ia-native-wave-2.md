# Epic Modularização IA Native - Wave 2 Execution Pack

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Wave:** 2 - Environments and Governance  
**Status:** Ready for execution
**Goal:** preparar staging, validar a fundação e definir rollout/rollback antes do MVP de IA

---

## Wave Summary

Esta wave transforma a fundação modular em um ambiente operacionalmente seguro:
- staging espelho da produção
- validação funcional da base modular
- plano de rollout e rollback por módulo

Sem esta wave concluída, o MVP de IA Native não deve ser integrado.

## Execution Order

1. DEV-2
2. QA-1
3. OPS-1

## Agent Instructions

### 1) DEV-2 - Preparar staging espelho da produção

**Owner:** @dev  
**Input:** shell modular da DEV-1  
**Output esperado:** staging separado, estruturalmente equivalente à produção, com dados mascarados e suporte a validação

**Success criteria**
- ambiente separado da produção
- estrutura principal replicada
- dados anonimizados ou mascarados
- suporte a navegação, cálculo e UI reais
- pronto para receber o MVP de IA

**Handoff para próxima etapa**
- entrega para QA-1

---

### 2) QA-1 - Validar fundação modular e staging

**Owner:** @qa  
**Input:** shell modular + staging espelho  
**Output esperado:** checklist de validação, riscos encontrados, recomendação para avançar ou corrigir

**Success criteria**
- menu separa os módulos corretamente
- Empresa, Operação e Proprietário são distinguíveis
- IA Native aparece como capability separada
- staging reflete comportamento esperado
- caminho de promoção/rollback validado

**Handoff para próxima etapa**
- entrega para OPS-1

---

### 3) OPS-1 - Definir rollout e rollback por módulo

**Owner:** @devops  
**Input:** staging validado e checklist de QA  
**Output esperado:** plano de rollout, rollback, rastreio de promoção e comunicação por wave

**Success criteria**
- promoção por wave ou módulo
- rollback claro e reversível
- rastreio de versão e data
- gating para mudanças críticas
- módulo pode ser desativado sem quebrar o restante

**Handoff para próxima etapa**
- entrega para PM-2

## Wave Exit Criteria

Antes de iniciar a Wave 3:
- DEV-2 precisa estar concluída
- QA-1 precisa aprovar a base
- OPS-1 precisa publicar rollout/rollback

Se qualquer um destes itens falhar, a Wave 3 não deve começar.

## Notes

- Esta wave não inclui o MVP de IA funcional
- Esta wave não inclui integração no shell
- Esta wave não inclui expansão de capabilities
- O objetivo é segurança operacional e readiness
