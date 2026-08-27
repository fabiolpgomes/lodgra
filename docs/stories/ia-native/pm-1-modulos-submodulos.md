# Story PM-1 - Definir módulos e submódulos da plataforma

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
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

---

## Mapa de módulos

### 1) Core da Plataforma
Base transversal da aplicação, responsável por contexto, segurança e consistência.

**Submódulos**
- autenticação
- organização e tenancy
- permissões e papéis
- moeda e timezone
- auditoria e rastreabilidade
- navegação base
- design system

**Público principal**
- toda a plataforma

**Segundo público**
- operação técnica e administrativa

### 2) Módulo Operacional
Área de uso diário da equipa para gerir a operação do portfólio.

**Submódulos**
- propriedades
- reservas
- calendários
- hóspedes
- utilizadores
- sincronizações
- configurações

**Público principal**
- equipa operacional

**Segundo público**
- gestor da operação

### 3) Módulo Empresa
Área executiva da gestora para leitura consolidada do negócio.

**Submódulos**
- visão geral
- caixa
- resultados
- custos
- rentabilidade consolidada
- relatórios executivos

**Público principal**
- direção / gestão

**Segundo público**
- financeiro e administração

### 4) Módulo Proprietário
Área de prestação de contas por imóvel, focada na relação com o dono.

**Submódulos**
- resumo por imóvel
- repasses
- despesas
- rentabilidade por propriedade
- histórico
- relatórios individuais

**Público principal**
- proprietário

**Segundo público**
- gestor de conta

### 5) Módulo IA Native
Capability separada para validação de viabilidade e retorno esperado.

**Submódulos**
- avaliação de viabilidade
- previsão de retorno
- cenários conservador / base / otimista
- score de oportunidade
- recomendações assistidas

**Público principal**
- gestão comercial e produto

**Segundo público**
- proprietário e equipa consultiva

---

## Regra de Entrada para Novas Features

Toda nova capability deve responder, antes de entrar no Lodgra:

1. Qual é o público principal?
2. Em qual módulo ela vive?
3. Quais dados consome?
4. Qual saída produz?
5. Em qual ambiente será validada primeiro?

Regras adicionais:
- nenhuma feature entra sem módulo de destino
- capability compartilhada sobe para Core / shared service
- feature específica de um fluxo permanece no módulo dono
- o MVP de IA Native fica separado até validar valor
- novas features devem ser classificadas como `capability`, `melhoria` ou `extensão`

## Acceptance Criteria

### AC1: Mapa de módulos aprovado
- [x] Core da Plataforma definido
- [x] Módulo Operacional definido
- [x] Módulo Empresa definido
- [x] Módulo Proprietário definido
- [x] Módulo IA Native definido

### AC2: Submódulos listados por domínio
- [x] Cada módulo possui submódulos nomeados
- [x] Cada submódulo tem propósito claro
- [x] Não há sobreposição de responsabilidade entre módulos

### AC3: Público principal por módulo
- [x] Cada módulo aponta o público principal
- [x] Cada módulo aponta o segundo público, se existir
- [x] A intenção de uso é explicitada em linguagem de produto

### AC4: Regra de entrada para novas features
- [x] Todo novo item precisa responder: público, módulo, dados, saída, ambiente
- [x] Nenhuma feature entra sem um módulo de destino
- [x] Features novas são classificadas como capability, melhoria ou extensão

### AC5: Pronto para handoff
- [x] O documento fica pronto para arquitetura, UX e dev
- [x] O texto é suficientemente claro para virar stories derivadas

### AC6: Compatível com evolução modular
- [x] O mapa não mistura módulos de públicos diferentes
- [x] O MVP de IA Native aparece como capability separada
- [x] O resultado pode ser usado como base para navegação, arquitetura e rollout

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
