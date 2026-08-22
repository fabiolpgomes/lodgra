# Epic Modularização IA Native - Wave 3 Execution Pack

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Wave:** 3 - IA Native MVP  
**Status:** Ready for execution
**Goal:** validar o MVP de IA Native em isolamento antes de integrar ao shell do Lodgra

---

## Wave Summary

Esta wave cria e valida o MVP de IA Native como capability isolada:
- recorte de produto
- arquitetura do motor
- fluxo de UX
- implementação em staging
- validação funcional e consistência

Sem esta wave validada, a integração no shell não deve começar.

## Execution Order

1. PM-2
2. ARCH-2
3. UX-2
4. DEV-3
5. QA-2

## Agent Instructions

### 1) PM-2 - Definir recorte do MVP de IA Native

**Owner:** @pm  
**Input:** visão modular do Lodgra e critérios da Wave 1  
**Output esperado:** definição do problema, pergunta central, público-alvo, entradas, saídas, métricas e limites do MVP

**Success criteria**
- problema de negócio explícito
- pergunta principal definida
- público-alvo definido
- escopo controlado e validável
- base suficiente para arquitetura e UX

**Handoff para próxima etapa**
- entrega para ARCH-2

---

### 2) ARCH-2 - Definir arquitetura do motor de viabilidade

**Owner:** @architect  
**Input:** recorte do MVP da PM-2  
**Output esperado:** fluxo de entrada/processamento/saída, contratos, dependências comuns e estratégia de desligamento

**Success criteria**
- entrada, processamento e saída definidos
- core comum separado da lógica do motor
- motor isolável e desligável
- integração futura possível sem reescrita

**Handoff para próxima etapa**
- entrega para UX-2 e DEV-3

---

### 3) UX-2 - Desenhar fluxo do MVP de IA Native

**Owner:** @ux-design-expert  
**Input:** recorte do MVP + arquitetura do motor  
**Output esperado:** wireflow do MVP, leitura de resultado, guidelines de linguagem e hierarchy

**Success criteria**
- entrada clara e não operacional
- resultado legível e contextualizado
- usuário entende a IA como apoio à decisão
- UX compatível com arquitetura

**Handoff para próxima etapa**
- entrega para DEV-3

---

### 4) DEV-3 - Implementar MVP de IA Native isolado

**Owner:** @dev  
**Input:** recorte, arquitetura e wireflow aprovados  
**Output esperado:** MVP executando em staging, com telemetria básica e desligamento seguro

**Success criteria**
- MVP roda em staging
- entradas e saídas aceitas
- comportamento observável
- isolamento mantido
- pronto para QA

**Handoff para próxima etapa**
- entrega para QA-2

---

### 5) QA-2 - Validar o MVP de IA Native isolado

**Owner:** @qa  
**Input:** MVP em staging  
**Output esperado:** checklist de validação, relatório de inconsistências, recomendação para integração ou correção

**Success criteria**
- fluxo compreensível
- estabilidade consistente
- isolamento confirmado
- readiness para integração claro

**Handoff para próxima etapa**
- entrega para DEV-4

## Wave Exit Criteria

Antes de iniciar a Wave 4:
- PM-2 precisa estar validada
- ARCH-2 precisa estar validada
- UX-2 precisa estar validada
- DEV-3 precisa estar validada
- QA-2 precisa aprovar a capability

Se qualquer um destes itens falhar, a Wave 4 não deve começar.

## Notes

- Esta wave não inclui integração ao shell
- Esta wave não inclui rollout em produção
- Esta wave não inclui expansão de capabilities
- O objetivo é provar valor e estabilidade do MVP de IA Native
