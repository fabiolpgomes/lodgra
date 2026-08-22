# Story DEV-3 - Implementar MVP de IA Native isolado

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @dev  
**Quality Gate:** @qa  
**Depends On:** PM-2, ARCH-2, UX-2, DEV-2

---

## Technical Intent

O MVP de IA Native deve existir como capability isolada em staging, com comportamento observável, dependências controladas e possibilidade de desligamento rápido.

## Story

**Como** dev da plataforma,  
**Quero** implementar o MVP de IA Native em ambiente isolado,  
**Para que** possamos validar utilidade e estabilidade antes de integrar ao Lodgra.

## Context

Esta story não integra a capability ao shell principal.

Ela cria a primeira versão utilizável do MVP de IA em staging para que produto, arquitetura, UX e QA validem o valor e a estabilidade.

## DEV-3 Baseline

Esta story já chega com os contratos de entrada definidos pelas stories anteriores:

- PM-2 define o problema, a pergunta central, o público-alvo, as entradas, as saídas e os limites do MVP
- ARCH-2 define o fluxo de entrada/processamento/saída, os estados rastreáveis, os serviços comuns e o desligamento seguro
- UX-2 define a leitura do resultado, a hierarquia de informação e o comportamento de decisão
- DEV-2 já entregou o staging espelho como ambiente de validação

O trabalho da DEV-3 é implementar o MVP como capability isolada, com o menor acoplamento possível, mantendo:
- entrada estruturada
- saída estruturada
- telemetria mínima
- desligamento por gate
- execução repetível em staging

## Acceptance Criteria

### AC1: MVP funcional em staging
- [ ] O MVP roda em staging
- [ ] O MVP aceita as entradas definidas
- [ ] O MVP devolve uma saída compreensível

### AC2: Isolamento
- [ ] O MVP não depende do operacional para existir
- [ ] O MVP pode ser desativado sem quebrar o resto
- [ ] O MVP não força mudanças de arquitetura no core

### AC3: Telemetria mínima
- [ ] Há visibilidade de uso e erro
- [ ] Há visibilidade de tempo de resposta
- [ ] Há visibilidade de consistência do resultado

### AC4: Pronto para QA
- [ ] O MVP pode ser testado com entradas reais ou semi-reais
- [ ] O MVP permite verificar consistência entre sessões
- [ ] O MVP permite isolar falhas sem afetar o Lodgra

## Scope

### In scope
- MVP isolado em staging
- processamento do fluxo definido
- output legível e observável
- telemetria básica
- desligamento seguro

### Out of scope
- integração com o shell do Lodgra
- rollout em produção
- expansão para outros casos de uso
- alterações na navegação principal

## Deliverables

- MVP de IA Native no staging
- registro de entradas e saídas
- base para avaliação funcional
- base para QA-2

## DEV-3 Implementation Checklist

### 1. Runtime entrypoint
- [ ] Criar um entrypoint dedicado para análise
- [ ] Garantir que o MVP aceita JSON ou payload interno equivalente
- [ ] Garantir que a saída estruturada exista antes da narrativa
- [ ] Garantir que o módulo possa ser invocado sem o shell

### 2. Internal module split
- [ ] Implementar `intake` para normalizar input e detectar bloqueadores
- [ ] Implementar `location` para sinais contextuais de mercado
- [ ] Implementar `comparables` para coletar e ordenar comparáveis
- [ ] Implementar builders para `short-stay`, `mid-stay` e `long-stay`
- [ ] Implementar `cost` para custos fixos e variáveis
- [ ] Implementar `strategy` para recomendações e caveats
- [ ] Implementar `audit` para coerência e cobertura de fontes
- [ ] Implementar `report` para empacotar a análise aprovada

### 3. Deterministic engine
- [ ] Manter fórmulas versionadas e reproduzíveis
- [ ] Manter a lógica financeira fora da camada narrativa
- [ ] Suportar conservative, base e optimized
- [ ] Carregar confidence and provenance junto com o resultado

### 4. Isolation and shutdown
- [ ] Remover o módulo por feature gate
- [ ] Garantir que a falha não contamina áreas operacionais
- [ ] Tornar o fluxo interrompível sem corromper estado persistido
- [ ] Manter o módulo sem dependência do shell para boot

### 5. Telemetry minimum
- [ ] Emitir start and end de execução
- [ ] Emitir blocked inputs detectados
- [ ] Emitir duração da cálculo
- [ ] Emitir falhas de audit
- [ ] Emitir etapa de publish approval
- [ ] Emitir category e trace id do erro

### 6. Staging contract
- [ ] Usar staging já criado pela DEV-2
- [ ] Usar dados mascarados ou sintéticos quando necessário
- [ ] Respeitar currency e timezone compartilhados
- [ ] Permitir exercício repetido com entradas semi-reais

## Execution Notes

- keep the MVP isolated from the Lodgra shell
- keep the workflow observable before adding any UI polish
- keep the engine deterministic and versioned
- keep report publication behind human approval
- keep the first release narrow enough for QA-2 to compare sessions

---

## Implementation Blueprint

### Runtime shape
- the MVP runs in staging as an isolated capability
- the MVP is invoked through a dedicated analysis entrypoint
- the MVP accepts structured input from JSON or equivalent internal payloads
- the MVP produces structured output before any narrative rendering

### Internal modules
- `intake` to normalize inputs and detect blockers
- `location` to derive contextual market signals
- `comparables` to collect and rank comparable data
- `short-stay`, `mid-stay`, `long-stay` assumption builders
- `cost` to model fixed and variable costs
- `strategy` to propose improvements or caveats
- `audit` to verify coherence and source coverage
- `report` to render the approved analysis package

### Deterministic engine
- financial calculations must be versioned and reproducible
- formulas must stay outside the narrative layer
- scenario calculation must support conservative, base and optimized outputs
- confidence and provenance must travel with the result

### Desactivation and isolation
- the module must be removable from staging by feature gate
- the module must not require the Lodgra shell to boot
- a failure inside the MVP must not cascade into operational areas
- the analysis workflow must be stoppable without corrupting persisted state

### Telemetry minimum
- execution start and end
- blocked inputs detected
- calculation duration
- audit failures
- publish approval step
- error category and trace id

### Staging contract
- the staging environment must already exist from DEV-2
- the MVP must use masked or synthetic data when needed
- the MVP must respect the same currency and timezone primitives as the platform
- the MVP must be safe to exercise repeatedly with semi-real inputs

---

## Definition of Done for DEV-3

- MVP can be exercised end-to-end in staging
- inputs are accepted and normalized
- outputs are intelligible to product and QA
- audit and telemetry are visible
- the module can be disabled without side effects
- the implementation remains isolated from the shell

---

## Handoff Criteria to QA-2

This story is ready to move to QA-2 when:
- the MVP runs end-to-end in staging
- the output is stable enough to compare across sessions
- telemetry confirms duration and error visibility
- the capability can be toggled off safely
- the flow does not depend on the Lodgra shell

## Handoff Package

### For QA-2
- validate the full flow in staging with real or semi-real inputs
- compare outputs across sessions for consistency
- verify telemetry start/end, duration and error visibility
- verify the feature gate can turn the capability off safely

### For future integration
- the module should already be isolated enough that DEV-4 can consume it without a redesign
- the analysis contract should remain stable if UI is added later
- the implementation should not create hidden coupling with operational data writes

## Handoff Notes

- esta story deve ser consumida após UX-2
- a próxima story da cadeia é QA-2
