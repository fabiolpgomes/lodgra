# Story PM-2 - Definir recorte do MVP de IA Native

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @pm  
**Quality Gate:** @architect + @ux  
**Depends On:** PM-1, UX-1

---

## Product Intent

O MVP de IA Native deve provar uma coisa simples: que o Lodgra Property Intelligence consegue transformar dados incompletos de um imóvel numa análise previsional estruturada, auditável e apresentável, com cálculo determinístico e orquestração por agentes.

O recorte precisa ser pequeno o suficiente para validar valor e grande o suficiente para justificar integração futura.

## Story

**Como** PM do Lodgra,  
**Quero** definir o recorte do MVP de IA Native,  
**Para que** ele valide valor sem ampliar escopo antes da hora.

## Context

A IA Native não deve nascer acoplada ao operacional.

Ela começa como capability validada em ambiente controlado, com entrada e saída claras, para evitar misturar a validação com a operação cotidiana da plataforma.

Source of truth for this module:
- [Lodgra Property Intelligence PRD](/Users/fabiogomes/Projetos/lodgra/docs/product/lodgra-property-intelligence-prd.md)

Este recorte agora está ancorado na story `46.1-property-intelligence-cli.story.md`, que define o primeiro corte funcional, mas também respeita o PRD do módulo:
- primeiro módulo AI-native do Lodgra
- pilot organization: Algarve Home Stay
- target portfolio size: 20-300 imóveis
- orchestration: orchestrator-with-specialist-agents
- financial calculation: deterministic, versioned engine
- external publication: human-approval-required

## PM-2 Baseline

This story is intentionally anchored on two existing artifacts:

- the PRD at [`/Users/fabiogomes/Projetos/lodgra/docs/product/lodgra-property-intelligence-prd.md`](/Users/fabiogomes/Projetos/lodgra/docs/product/lodgra-property-intelligence-prd.md) as source of truth for product direction, principles and success metrics
- the CLI-first first cut at [`/Users/fabiogomes/Projetos/lodgra/docs/stories/46.1-property-intelligence-cli.story.md`](/Users/fabiogomes/Projetos/lodgra/docs/stories/46.1-property-intelligence-cli.story.md) as the smallest functional slice

The PM-2 recort should remain small enough to let ARCH-2 define a clean motor and UX-2 define a readable decision flow, without depending on the shell or on integration assumptions.

Direção de produto herdada do PRD:
- pesquisa antes de perguntar
- determinismo financeiro
- evidência rastreável
- faixas, não falsas certezas
- supervisão humana antes da publicação externa
- multi-tenancy desde a base

O fluxo inicial pode começar CLI-first, mas a visão do módulo já pressupõe:
- input mínimo ou enriquecido
- estados de análise rastreáveis
- comparáveis e premissas explícitos
- geração de relatório editável
- revisão humana antes de publicação

## Acceptance Criteria

### AC1: Problema e pergunta respondidos
- [x] O problema de negócio está explicitado
- [x] A pergunta principal do MVP está definida
- [x] O público-alvo está definido
- [x] O posicionamento como primeiro módulo AI-native está explícito

### AC2: Entradas e saídas
- [x] Entradas do modelo estão listadas
- [x] Saídas do modelo estão listadas
- [x] Limitações do MVP estão escritas
- [x] O fluxo CLI-first está explícito
- [x] O modelo de proveniência dos dados está explícito

### AC3: Métricas de sucesso
- [x] Há métricas de validação
- [x] Há critério para considerar o MVP viável
- [x] Há critério para expandir ou encerrar o MVP
- [x] Há critério para revisão humana e publicação

### AC4: Escopo controlado
- [x] O MVP não depende de integrações desnecessárias
- [x] O MVP não começa acoplado ao operacional
- [x] O MVP pode evoluir como capability independente
- [x] O MVP preserva o fluxo manual e verificável da story 46.1
- [x] O MVP mantém multi-tenancy desde a base

### AC5: Pronto para arquitetura
- [x] O recorte é suficiente para ARCH-2
- [x] O recorte é suficiente para UX-2
- [x] O recorte é suficiente para um protótipo isolado em staging

## Scope

### In scope
- definição do problema do MVP
- definição da pergunta central
- definição do público-alvo
- definição de entradas e saídas
- definição de métricas de sucesso
- definição de limites do MVP

### Out of scope
- implementação do modelo
- integração com o shell do Lodgra
- regras de expansão futuras
- alterações na navegação principal
- mudanças em produção
- dashboard
- formulário sofisticado
- PDF
- scraping automático
- publicação direta para o proprietário
- alteração da tabela operacional `properties`

---

## PRD Alignment

### Product positioning
- first AI-native module of Lodgra
- discovery MVP for validation
- internal pilot with Algarve Home Stay

### Core users
- professional property managers
- commercial real estate management teams
- revenue managers
- operations managers
- organization administrators

### Core principles
- research before asking
- deterministic finance
- traceable evidence
- ranges, not false certainty
- human supervision before external publication
- multi-tenancy from the base

### Lifecycle states
- `draft`
- `needs_input`
- `researching`
- `calculating`
- `needs_review`
- `approved`
- `published`
- `failed`
- `superseded`

### Data provenance
- `provided`
- `observed`
- `derived`
- `estimated`
- `overridden`

### Validation metrics from PRD
- time to first analysis
- human review time
- reproducible calculations
- source coverage on key values
- reports approved without structural rework
- conversion lift after analysis
- reconciliation errors = 0 on approved reports

## Deliverables

- definição do MVP
- métricas de validação
- critérios de sucesso e corte
- base para ARCH-2, UX-2 e DEV-3

## PM-2 Product Checklist

### 1. Problem framing
- [x] Partial property data creates slow, manual and inconsistent viability assessments
- [x] The MVP must answer whether the property is worth taking and what return is reasonably expected
- [x] The first buyer persona is the internal commercial / management reviewer, not the owner

### 2. Scope boundaries
- [x] Keep the first cut CLI-first and deterministic
- [x] Keep the MVP isolated from the operational shell
- [x] Keep human approval before external publication
- [x] Keep multi-tenancy as a base rule

### 3. Data contract
- [x] Inputs include location, typology, costs, currency, seasonality and available history
- [x] Outputs include viability score, scenarios, risk indication and proceed / not proceed recommendation
- [x] Provenance must distinguish provided, observed, derived, estimated and overridden values

### 4. Success profile
- [x] Output should be understandable without explanation
- [x] Calculation should be repeatable on similar inputs
- [x] Review should stay quick and auditable
- [x] The MVP should justify the next architecture and UX wave

### 5. Stop conditions
- [x] If the output is too noisy or too hard to explain, the MVP should stop or shrink
- [x] If the first cut needs a dashboard or operational integration, the scope is too large
- [x] If the module cannot remain isolated, the recort is not ready for ARCH-2

---

## MVP Definition

### Problem statement
We need a fast, explainable way to assess whether a property is viable and what return it may generate for the owner before the property is fully absorbed into the operational flow.

### Core question
**“Should we take this property, and what return can the owner reasonably expect?”**

### Target audience
- internal commercial / management decision makers
- portfolio / acquisition reviewers
- eventually the property owner, after validation

### Positioning note
- This is the first AI-native module of Lodgra.
- It is a discovery MVP, not an operational replacement.
- It exists to validate decision support value before broader integration.

### MVP promise
- assess viability
- estimate return
- provide scenario-based output
- help decide whether to proceed

---

## Inputs and Outputs

### Inputs
- location
- property type
- seasonality signal
- average price
- historical occupancy, when available
- estimated costs
- currency
- property profile

### Outputs
- viability score
- expected return
- conservative / base / optimistic scenarios
- risk indication
- recommendation to proceed or not

### Explicit limitations
- not a replacement for human approval
- not a full underwriting engine
- not a production operational workflow
- not dependent on the shell for validation
- not a multi-module product on day one

---

## Success Metrics

### Validation metrics
- users understand the output without explanation
- decision makers can compare scenarios quickly
- the recommendation is perceived as actionable
- the result is stable enough to repeat on similar inputs

### Viability threshold
- the MVP must show a clear decision-support benefit
- it must reduce ambiguity in property evaluation
- it must be useful without needing full Lodgra integration

### Exit criteria
- expand if the output is trusted and repeated
- stop if the output remains too noisy, hard to explain or operationally heavy

## PM-2 Handoff Package

### For ARCH-2
- the business question is explicit
- the user and decision context are explicit
- the input/output contract is explicit
- the system must remain deterministic and isolated
- the validation path is CLI-first before any UI assumption

### For UX-2
- the result must read like a decision aid, not an operational form
- the user should understand the output in one sentence
- the flow should stay minimal and reviewable

### For DEV-3
- the first implementation slice is already defined by 46.1
- no shell integration is required at this stage
- no new operational module should be introduced before validation

---

## Scope Guardrails

1. No direct dependency on the operational shell.
2. No new platform-wide module before validation.
3. No persistence requirement unless a future review proves necessity.
4. No external integration is assumed unless explicitly needed by ARCH-2.
5. No feature expansion beyond the viability question.

---

## Product Rules

- The MVP must be understandable in one sentence.
- The MVP must remain isolated until it proves value.
- The MVP must not create hidden product debt inside the operational core.
- Any future integration must preserve the ability to turn the capability off.

---

## Handoff Criteria to ARCH-2

This story is ready to move to ARCH-2 when:
- the business problem is explicit
- the central question is explicit
- the audience is explicit
- the input/output contract is explicit
- success and stop criteria are explicit
- the MVP can be reasoned about without shell assumptions

## Handoff Notes

- este documento trava o escopo antes da arquitetura
- a próxima story da cadeia é ARCH-2
