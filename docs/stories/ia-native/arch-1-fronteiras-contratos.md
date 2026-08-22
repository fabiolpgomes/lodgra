# Story ARCH-1 - Definir fronteiras e contratos entre módulos

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Owner:** @architect  
**Quality Gate:** @qa  
**Depends On:** PM-1

---

## Architecture Intent

A plataforma precisa crescer por módulos com fronteiras verificáveis.

Esta story define onde cada módulo começa e termina, que dependências são aceitas e quais contratos garantem que o Lodgra não volte a virar uma colcha de retalhos.

## Story

**Como** arquiteto da plataforma,  
**Quero** definir fronteiras e contratos entre os módulos do Lodgra,  
**Para que** o sistema cresça sem acoplamento excessivo.

## Context

O mapa de produto da PM-1 já separa Core, Operação, Empresa, Proprietário e IA Native.

Agora esta story transforma essa separação em regras arquiteturais:
- o que cada módulo pode consumir
- o que cada módulo pode expor
- o que cada módulo não pode depender
- como a IA Native fica isolada até a integração

## Acceptance Criteria

### AC1: Fronteiras claras
- [ ] Core não contém lógica de negócio específica de módulo
- [ ] Operação não mistura regras de Empresa ou Proprietário
- [ ] Empresa não depende de UI operacional para calcular resultado
- [ ] IA Native é tratada como capability separada

### AC2: Contratos documentados
- [ ] Cada módulo tem entradas
- [ ] Cada módulo tem saídas
- [ ] Cada módulo tem dependências permitidas
- [ ] Cada módulo tem dependências proibidas

### AC3: Regras de integração
- [ ] Serviços compartilhados são explicitamente listados
- [ ] Regras de moeda e timezone ficam em camada comum
- [ ] Regras financeiras não ficam espalhadas em páginas

### AC4: Estratégia de expansão
- [ ] Novas features seguem o contrato modular
- [ ] Cada módulo pode crescer sem quebrar o shell
- [ ] IA Native pode ser desligada sem afetar a operação

### AC5: Pronto para UX e DEV
- [ ] O documento pode ser consumido pela story de navegação
- [ ] O documento pode ser consumido pela story do shell modular
- [ ] O documento pode ser consumido pelo handoff da próxima wave

## Scope

### In scope
- definição das fronteiras por módulo
- matriz de dependências permitidas e proibidas
- definição de serviços compartilhados
- estratégia de isolamento da IA Native
- princípios de expansão modular

### Out of scope
- implementação dos contratos
- criação do shell
- desenho visual
- staging
- rollout em produção

## Deliverables

- matriz de fronteiras por módulo
- contrato de integração por módulo
- lista de dependências compartilhadas
- princípios de desacoplamento e expansão

---

## Boundary Matrix

### 1. Core
**Responsabilidade**
- autenticação
- organização e tenancy
- permissões
- moedas e timezone
- formatação monetária
- auditoria
- navegação base
- design system

**Pode depender de**
- infraestrutura base da aplicação
- utilitários de moeda, data e sessão

**Não pode depender de**
- regras de Operação
- regras de Empresa
- regras de Proprietário
- regras do MVP de IA

### 2. Operação
**Responsabilidade**
- propriedades
- reservas
- calendários
- hóspedes
- utilizadores
- configurações
- sincronizações

**Pode depender de**
- Core
- contratos financeiros comuns
- utilitários de moeda e timezone

**Não pode depender de**
- dashboards executivos da Empresa
- relatórios individuais do Proprietário
- motor de viabilidade da IA Native

### 3. Empresa
**Responsabilidade**
- receita consolidada
- custos operacionais
- lucro
- caixa
- performance executiva
- consolidação multi-moeda

**Pode depender de**
- Core
- dados operacionais agregados
- regras de conversão e normalização monetária

**Não pode depender de**
- componentes de UI da Operação
- lógica de edição de reserva
- lógica do MVP de IA

### 4. Proprietário
**Responsabilidade**
- rentabilidade por imóvel
- repasses
- despesas
- histórico
- relatórios individuais
- visão por propriedade

**Pode depender de**
- Core
- dados consolidados de propriedade
- regras de repasse e leitura financeira

**Não pode depender de**
- navegação operacional interna
- regras da área da Empresa
- motor de IA Native

### 5. IA Native
**Responsabilidade**
- viabilidade de propriedades
- previsão de retorno
- cenários de performance
- score de oportunidade
- recomendações assistidas

**Pode depender de**
- Core
- forecasting
- pricing
- currency utilities

**Não pode depender de**
- telas operacionais do Lodgra
- persistência obrigatória na primeira versão
- UI da Empresa ou do Proprietário

---

## Shared Services

Os seguintes serviços devem existir como capacidades compartilhadas, sem pertencer a um único módulo de produto:

- `currency` para normalização e conversão
- `timezone` para coerência temporal
- `feature gate` para controle de acesso e rollout
- `forecasting` para projeções e tendências
- `pricing` para regras de valor
- `audit/logging` para rastreabilidade
- `design system` para consistência visual

Regra:
- quando uma regra servir mais de um módulo, ela deve ser promovida a shared service
- quando uma regra só servir um fluxo, ela deve permanecer dentro do módulo

---

## Integration Contracts

### Core -> Modules
- fornece contexto de tenancy, permissões e moeda
- expõe identidade do usuário e organização
- não carrega regras específicas de negócio

### Modules -> Core
- consomem apenas contratos publicados
- não fazem leitura direta de internals do Core

### Empresa / Proprietário -> Shared
- consomem conversão monetária e normalização
- consomem regras compartilhadas de cálculo
- não duplicam lógica de conversão

### IA Native -> Platform
- recebe um input model explícito
- produz um output model explícito
- não acessa a UI operacional diretamente
- pode ser desligado sem quebrar outras áreas

---

## Prohibited Dependencies

Os seguintes acoplamentos não são permitidos nesta fase:

- dashboard executivo consumindo página operacional para calcular resultado
- IA Native lendo diretamente a navegação do Lodgra
- módulos financeiros com regra de moeda espalhada em componentes de tela
- cálculos críticos dentro de componentes visuais
- dependências circulares entre Empresa, Operação e Proprietário

---

## Expansion Rules

1. Toda nova capability deve declarar seu módulo de origem.
2. Toda capability compartilhada deve ser versionada como contrato.
3. Toda exceção estrutural deve ter owner e prazo de remoção.
4. Qualquer integração do MVP de IA deve passar por contrato antes de UI.
5. O shell modular não pode conhecer detalhes internos do motor de IA.

---

## Handoff Output for UX and DEV

### Para UX
- desenhar navegação por público com os módulos separados
- sinalizar claramente o contexto atual do usuário
- evitar telas que misturam visão executiva e operacional

### Para DEV
- implementar shell com entradas de módulo
- centralizar regras compartilhadas em camada comum
- manter IA Native isolada do core enquanto o MVP valida valor
- usar feature gate para controlar exposição

## Handoff Notes

- esta story deve ser lida antes da UX-1
- esta story deve ser lida antes da DEV-1
- o objetivo é produzir contratos, não implementação
- a próxima story da cadeia é UX-1
