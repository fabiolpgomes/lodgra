# Epic Modularização IA Native - Wave 4 Execution Pack

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Wave:** 4 - Integration  
**Status:** Ready for execution
**Goal:** integrar o MVP de IA Native ao shell modular e governar a expansão futura

---

## Wave Summary

Esta wave coloca a capability validada dentro do Lodgra:
- integração controlada no shell
- entrada de UX legível e coerente
- regra de expansão para novas capabilities

Sem a Wave 3 validada, esta wave não deve começar.

## Execution Order

1. DEV-4
2. UX-3
3. PM-3
4. QA-3

## Agent Instructions

### 1) DEV-4 - Integrar o MVP de IA Native ao Lodgra

**Owner:** @dev  
**Input:** MVP validado em staging, shell modular pronto, plano de rollout aprovado  
**Output esperado:** IA Native integrada ao shell, com ativação controlada e desligamento seguro

**Success criteria**
- MVP aparece dentro do shell modular
- módulos existentes permanecem estáveis
- IA continua separável do core
- ativação por segmento/org/feature flag possível
- rollback seguro disponível

**Handoff para próxima etapa**
- entrega para UX-3

---

### 2) UX-3 - Refinar a entrada do MVP de IA no shell modular

**Owner:** @ux-design-expert  
**Input:** IA Native já integrada ao shell  
**Output esperado:** texto de entrada, guidelines visuais e leitura clara da capability no produto

**Success criteria**
- entrada clara como capability nova
- consistência com design system
- leitura de valor sem confusão operacional
- linguagem aberta para futuras capabilities

**Handoff para próxima etapa**
- entrega para QA-3

---

### 3) PM-3 - Definir critérios para expansão de capabilities

**Owner:** @pm  
**Input:** MVP integrado e UX ajustada  
**Output esperado:** regra de expansão, priorização e governança para novas capabilities

**Success criteria**
- critérios claros para novas capabilities de IA e não-IA
- classificação de feature por tipo
- preservação da modularidade
- base para roadmap futuro sem reabrir o core

**Handoff para próxima etapa**
- entrega para QA-3

---

### 4) QA-3 - Validar a política de expansão de capabilities

**Owner:** @qa  
**Input:** PM-3 validada, MVP integrado e shell estável  
**Output esperado:** política de expansão validada como gate reutilizável para futuras waves

**Success criteria**
- core, capability e extension distinguíveis na prática
- governança aplicável sem ambiguidade
- roadmap protegido contra scope creep
- regra reutilizável por produto, arquitetura e QA

## Wave Exit Criteria

Ao concluir esta wave:
- o MVP de IA está integrado de forma controlada
- a entrada está clara para o utilizador
- existe regra de expansão para o futuro
- a arquitetura modular continua intacta
- a política de expansão foi validada como gate de closeout

## Notes

- Esta wave fecha a epic de fundação + MVP
- Esta wave não deve introduzir novos casos de uso além do MVP
- Expansão futura só entra após os critérios do PM-3 e a validação da QA-3
