# Epic Modularização IA Native - Wave 1 Execution Pack

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Wave:** 1 - Foundation  
**Status:** Ready for execution
**Goal:** fechar a fundação de produto, arquitetura, UX e shell antes de qualquer staging ou IA

---

## Wave Summary

Esta wave cria a base do sistema modular:
- mapa de produto
- fronteiras e contratos
- navegação por público
- shell modular base

Se esta wave não estiver sólida, a wave de staging e a wave do MVP de IA não devem começar.

## Execution Order

1. PM-1
2. ARCH-1
3. UX-1
4. DEV-1

## Agent Instructions

### 1) PM-1 - Definir módulos e submódulos da plataforma

**Owner:** @pm  
**Input:** visão modular do Lodgra, necessidade de separar Empresa / Operação / Proprietário / IA Native  
**Output esperado:** mapa de módulos, submódulos, público principal por módulo e regra de entrada para novas features

**Success criteria**
- módulos claramente nomeados
- submódulos coerentes por domínio
- regra de entrada para novas capabilities
- documento pronto para handoff

**Handoff para próxima etapa**
- entrega para ARCH-1

---

### 2) ARCH-1 - Definir fronteiras e contratos entre módulos

**Owner:** @architect  
**Input:** mapa de produto da PM-1  
**Output esperado:** fronteiras por módulo, contratos, dependências permitidas e proibidas, princípios de desacoplamento

**Success criteria**
- Core separado de lógica específica
- Operação, Empresa e Proprietário não se misturam
- IA Native tratada como capability separada
- serviços comuns identificados

**Handoff para próxima etapa**
- entrega para UX-1 e DEV-1

---

### 3) UX-1 - Redesenhar navegação por público e intenção

**Owner:** @ux-design-expert  
**Input:** mapa de produto + fronteiras arquiteturais  
**Output esperado:** mapa de navegação por público, hierarquia visual, guidelines de leitura e texto de entrada da IA

**Success criteria**
- navegação separa Empresa / Operação / Proprietário / IA
- o usuário sabe onde está e para que serve a área
- a IA não parece uma página avulsa
- wireframe conceitual suficiente para desenvolvimento

**Handoff para próxima etapa**
- entrega para DEV-1

---

### 4) DEV-1 - Implementar shell modular da plataforma

**Owner:** @dev  
**Input:** mapa de produto, contratos e navegação definidos  
**Output esperado:** shell base compartilhado, navegação por módulos, estrutura pronta para novos módulos

**Success criteria**
- shell único e consistente
- navegação estável entre módulos
- reuso de componentes base
- sem acoplamento de regras de negócio ao layout

**Handoff para próxima etapa**
- entrega para DEV-2 (staging espelho)

## Wave Exit Criteria

Antes de iniciar a Wave 2:
- PM-1 precisa estar validada
- ARCH-1 precisa estar validada
- UX-1 precisa estar validada
- DEV-1 precisa estar pronta para staging

Se qualquer um destes itens falhar, a Wave 2 não deve começar.

## Notes

- Esta wave não inclui staging
- Esta wave não inclui IA funcional
- Esta wave não inclui rollout
- O objetivo é apenas fundação modular
