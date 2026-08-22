# Story PM-1 - Definir módulos e submódulos da plataforma

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Owner:** @pm  
**Quality Gate:** @architect + @ux  
**Depends On:** none  

---

## Product Intent

O Lodgra precisa deixar de crescer como um conjunto de telas soltas e passar a evoluir como uma plataforma modular.

Esta story define o mapa de produto que separa claramente:
- o que é core da plataforma
- o que é operação diária
- o que é visão da empresa
- o que é visão do proprietário
- o que é validação do MVP de IA Native

## Story

**Como** product owner do Lodgra,  
**Quero** definir claramente os módulos e submódulos da plataforma,  
**Para que** novas capabilities sejam adicionadas sem criar uma colcha de retalhos.

## Context

Hoje o sistema mistura públicos e intenções de uso em áreas próximas da navegação.

Isso cria ambiguidade para o utilizador e dificulta a entrada de novas features sem acoplamento.

Esta story não desenha UI nem implementa código. Ela define a base de produto para a sequência da epic.

## Acceptance Criteria

### AC1: Mapa de módulos aprovado
- [ ] Core da Plataforma definido
- [ ] Módulo Operacional definido
- [ ] Módulo Empresa definido
- [ ] Módulo Proprietário definido
- [ ] Módulo IA Native definido

### AC2: Submódulos listados por domínio
- [ ] Cada módulo possui submódulos nomeados
- [ ] Cada submódulo tem propósito claro
- [ ] Não há sobreposição de responsabilidade entre módulos

### AC3: Público principal por módulo
- [ ] Cada módulo aponta o público principal
- [ ] Cada módulo aponta o segundo público, se existir
- [ ] A intenção de uso é explicitada em linguagem de produto

### AC4: Regra de entrada para novas features
- [ ] Todo novo item precisa responder: público, módulo, dados, saída, ambiente
- [ ] Nenhuma feature entra sem um módulo de destino
- [ ] Features novas são classificadas como capability, melhoria ou extensão

### AC5: Pronto para handoff
- [ ] O documento fica pronto para arquitetura, UX e dev
- [ ] O texto é suficientemente claro para virar stories derivadas

### AC6: Compatível com evolução modular
- [ ] O mapa não mistura módulos de públicos diferentes
- [ ] O MVP de IA Native aparece como capability separada
- [ ] O resultado pode ser usado como base para navegação, arquitetura e rollout

## Scope

### In scope
- definição dos módulos principais
- definição dos submódulos por domínio
- definição do público principal por módulo
- definição da regra de entrada para novas features
- definição da saída esperada para handoff

### Out of scope
- desenho visual da nova navegação
- implementação dos módulos
- criação do staging
- integração do MVP de IA
- mudanças em produção

## Deliverables

- documento de módulos e submódulos
- regra de entrada de novas features
- definição de ownership por módulo
- base para ARCH-1, UX-1 e DEV-1

## Handoff Notes

- Este documento deve ser consumido antes de qualquer decisão de layout
- O resultado esperado é um mapa de produto, não uma solução técnica
- A próxima story da cadeia é ARCH-1
