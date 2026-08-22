# Story DEV-1 - Implementar shell modular da plataforma

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Owner:** @dev  
**Quality Gate:** @qa  
**Depends On:** PM-1, ARCH-1, UX-1

---

## Technical Intent

O shell é a base comum da plataforma modular.

Ele deve permitir que cada módulo do Lodgra tenha entrada própria, mantendo consistência visual e desacoplamento funcional:
- Core da Plataforma
- Operação
- Empresa
- Proprietário
- IA Native

## Story

**Como** dev do Lodgra,  
**Quero** criar um shell modular para o produto,  
**Para que** novos módulos possam entrar sem duplicar layout ou misturar responsabilidades.

## Context

O shell atual precisa servir como base de crescimento, não como um molde rígido para features futuras.

Esta story prepara a estrutura comum para que:
- a navegação seja estável
- os módulos não repitam layout
- a IA Native possa entrar como capability isolada depois

## Acceptance Criteria

### AC1: Shell único
- [ ] Existe uma estrutura base compartilhada
- [ ] A navegação principal é consistente entre módulos
- [ ] Header, sidebar e content area seguem a mesma base

### AC2: Entrada por módulo
- [ ] Cada módulo tem ponto de entrada claro
- [ ] O utilizador consegue navegar entre módulos sem perder contexto
- [ ] O módulo ativo é destacado de forma consistente

### AC3: Reuso de primitives
- [ ] Componentes compartilhados são reaproveitados
- [ ] Layout, cards e estados vazios vêm do mesmo padrão
- [ ] Não surgem variantes paralelas sem necessidade

### AC4: Preparação para novos módulos
- [ ] O shell suporta adicionar módulos futuros
- [ ] O shell suporta a entrada do MVP de IA Native
- [ ] O shell não acopla regras de negócio ao layout

### AC5: Compatível com operação e rollout
- [ ] A estrutura pode ser validada em staging
- [ ] A estrutura permite desligar ou isolar módulos
- [ ] A navegação não quebra módulos já existentes

## Scope

### In scope
- shell comum da plataforma
- entrada por módulo
- consistência de layout
- reuso de componentes base
- preparação para módulos futuros

### Out of scope
- staging final
- integração do MVP de IA
- desenho visual final de cada módulo
- regras de negócio específicas
- rollout em produção

## Deliverables

- shell modular base
- navegação por módulos
- estrutura pronta para novos módulos
- base para DEV-2 e para a integração futura da IA Native

---

## Shell Blueprint

### Layout contract
- `top context bar` sempre visível
- `primary navigation` fixa por público
- `module header` com título, contexto e ação principal
- `subnavigation` contextual apenas dentro do módulo ativo
- `content area` sem dependência de regras específicas do módulo

### Required shell states
- módulo carregado
- módulo sem acesso
- módulo indisponível por feature gate
- módulo em loading
- módulo com contexto ambíguo de moeda
- módulo vazio
- módulo com erro recuperável

### Shared primitives
- shell frame
- nav item
- module badge
- context label
- currency label
- empty state
- error state
- loading skeleton

---

## Implementation Rules

1. O shell deve conhecer apenas módulos publicados.
2. Regras de negócio não devem morar no layout.
3. O módulo ativo deve ser resolvido por rota e contexto.
4. A moeda deve ser exibida no shell quando o número puder ser interpretado de forma ambígua.
5. O estado de feature gate deve aparecer de forma explícita.
6. O shell deve permitir esconder um módulo sem quebrar os demais.
7. Componentes compartilhados devem ser reutilizados em toda a plataforma.

---

## Proposed Route Structure

```txt
src/app/[locale]/
├── (shell)/
│   ├── empresa/
│   ├── operacao/
│   ├── proprietario/
│   └── ia-native/
```

Notes:
- each module gets a clear entry point
- route groups keep the shell reusable
- the shell should be able to render a neutral landing state when a module is not enabled

---

## Interaction Model

- switching modules must preserve global context
- the active module must be obvious on desktop and mobile
- the shell must not force the user to relearn navigation per module
- the IA Native entry must feel like a capability center, not an orphan page

---

## Accessibility and Responsiveness

- keyboard navigation must work across the primary module nav
- active state cannot rely on color alone
- labels must remain readable on smaller screens
- context bar can collapse on mobile, but context must remain discoverable
- empty states must explain the next action

---

## Handoff Criteria to DEV-2

This story is ready to move to DEV-2 when:
- shell frame is defined
- route structure is documented
- shared primitives are identified
- module switching behavior is clear
- feature gate handling is part of the shell contract
- the shell can be validated in a staging mirror

## Handoff Notes

- esta story deve ser consumida após UX-1
- o shell deve servir o mapa de produto, não contrariá-lo
- a próxima story da cadeia é DEV-2

---

## First Implementation Slice

Antes de mexer em staging ou na IA Native, a primeira execução deve confirmar o shell base real do Lodgra e reduzir o acoplamento existente de navegação.

### Current starting points in the codebase

- `src/components/common/layout/AuthLayout.tsx` já centraliza a maior parte da experiência autenticada.
- `src/components/common/layout/Sidebar.tsx` concentra a navegação lateral atual.
- `src/components/common/layout/TopBar.tsx` e `src/components/common/layout/BottomNav.tsx` cobrem a navegação complementar.
- `src/components/common/layout/PremiumPage.tsx` já oferece primitives reutilizáveis para header, card e page shell.
- `src/app/[locale]/layout.tsx` existe como passthrough e pode servir de ponto para estruturar a camada modular por público.

### Proposed first work items

1. Inventariar os módulos e entradas atuais que já existem na navegação real.
2. Definir um registry único de módulos publicados, com `Core`, `Operação`, `Empresa`, `Proprietário` e `IA Native`.
3. Separar o shell de navegação por público do conteúdo específico de cada página.
4. Mapear quais páginas atuais pertencem a cada módulo sem alterar regras de negócio.
5. Garantir que o shell consiga exibir contexto, módulo ativo e estado de feature gate.
6. Reutilizar os primitives existentes antes de introduzir componentes paralelos.

### Definition of done for this slice

- existe uma fonte única para os módulos publicados
- o shell consegue identificar o módulo ativo pela rota
- a navegação por público fica explícita
- os contextos de moeda e escopo podem ser mostrados no topo
- nenhuma regra de negócio nova é colocada no layout
- a base fica pronta para DEV-2 sem depender de staging

---

## Dev Agent Record

### Progress

- [x] Criado o registry de módulos publicados para o shell
- [x] Refeito o menu desktop para expor módulos e atalhos por contexto
- [x] Refeito o bottom nav mobile para espelhar os módulos publicados
- [x] Atualizado o top bar para mostrar módulo ativo e título da página
- [x] Reforçado o gate do registry para manter `IA Native` fora do shell publicado até a integração
- [ ] Preparação de staging da Wave 2 continua pendente

### File List

- `src/lib/navigation/module-shell.ts`
- `src/components/common/layout/Sidebar.tsx`
- `src/components/common/layout/BottomNav.tsx`
- `src/components/common/layout/TopBar.tsx`
- `src/__tests__/navigation/module-shell.test.ts`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`
