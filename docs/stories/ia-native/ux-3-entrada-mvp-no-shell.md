# Story UX-3 - Refinar a entrada do MVP de IA no shell modular

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for Review  
**Owner:** @ux-design-expert  
**Quality Gate:** @pm + @architect  
**Depends On:** UX-2, DEV-4

---

## UX Intent

A entrada do MVP de IA no shell precisa comunicar três coisas ao mesmo tempo:
- que é uma capability nova
- que já foi validada o suficiente para aparecer no produto
- que ainda é um apoio à decisão, não uma substituição do operacional ou da gestão

## Story

**Como** utilizador do Lodgra,  
**Quero** encontrar o MVP de IA dentro do shell sem confusão,  
**Para que** eu perceba quando estou a usar uma capability nova e validada.

## Context

A capability já passou pela validação isolada.

Agora a UX precisa integrá-la no produto sem fazê-la parecer:
- uma página avulsa
- uma funcionalidade experimental solta
- uma ferramenta operacional comum

## UX-3 Baseline

Esta story parte de duas entregas já fechadas:

- a DEV-4 integra a capability ao shell modular com ativação controlada e desligamento seguro
- a PM-3 define a política de expansão core / capability / extension, então a UX-3 precisa manter a linguagem aberta para futuras capabilities sem congelar o produto num único caso de uso

A função da UX-3 aqui é dar à capability uma presença nativa no shell, com:
- texto de valor claro
- hierarquia visual consistente com a plataforma
- sinal de novidade sem parecer laboratório
- leitura de apoio à decisão, não de operação
- base reutilizável para expansão futura

## Acceptance Criteria

### AC1: Entrada no shell
- [ ] O módulo IA entra como item claro de navegação
- [ ] O texto da entrada explica o benefício
- [ ] O módulo não parece uma página avulsa

### AC2: Coerência visual
- [ ] O módulo segue o design system base
- [ ] O módulo mantém consistência com o resto da plataforma
- [ ] O destaque visual deixa claro que é uma capability nova

### AC3: Leitura de valor
- [ ] O usuário entende o que a IA faz
- [ ] O usuário entende que a IA é um apoio à decisão
- [ ] O usuário entende que o output não substitui operação ou gestão

### AC4: Compatível com a expansão
- [ ] A entrada pode servir de base para novas capabilities
- [ ] A linguagem não prende o produto a um único caso de uso
- [ ] A UX permite crescimento sem refazer o shell

## Scope

### In scope
- refinamento da entrada do módulo IA
- texto de valor para a capability
- guidelines visuais de integração
- regras de hierarquia entre shell e capability

### Out of scope
- criação do modelo de IA
- alterações no shell base
- rollout em produção
- expansão para novos casos de uso

## Deliverables

- refinamento da entrada do módulo IA
- texto de valor para a capability
- guidelines visuais de integração
- base para PM-3

## UX-3 Design Checklist

### 1. Entry label
- [ ] Use `Property Intelligence` as the primary label
- [ ] Keep the supporting line concise and outcome-driven
- [ ] Avoid wording that sounds experimental or temporary
- [ ] Make the entry read as a first-class capability

### 2. Shell presence
- [ ] Place the module alongside Core, Operação, Empresa and Proprietário
- [ ] Keep the active state clear but not dominant over core modules
- [ ] Use a subtle AI Native badge if needed, not a laboratory-style treatment
- [ ] Keep the entry native to the shell rather than pasted into it

### 3. Capability framing
- [ ] Explain the module as decision support
- [ ] Explain that the output is assistive and needs human review
- [ ] Avoid language that implies operational automation
- [ ] Keep the module open to future capabilities

### 4. Landing hierarchy
- [ ] Show a strong hero title
- [ ] Show one sentence of value
- [ ] Show a trust cue for research, deterministic finance and human approval
- [ ] Show the current analysis state before details

### 5. Result hierarchy
- [ ] Keep verdicts readable before dense tables
- [ ] Keep confidence and risk visible near the top
- [ ] Distinguish scenario cards by outcome, not decoration
- [ ] Preserve the same visual language for edit, recalculate and approve

### 6. Responsiveness and a11y
- [ ] Keep the entry readable on mobile
- [ ] Keep the primary action visible on smaller screens
- [ ] Do not rely on color alone for confidence or approval
- [ ] Keep labels concise and readable in Portuguese
- [ ] Ensure keyboard navigation remains obvious

## UX-3 Entry Copy

### Primary label
`Property Intelligence`

### Supporting line
Analise a viabilidade de um imóvel e estime o retorno esperado antes de avançar para a operação.

### Short module description
Uma capability de apoio à decisão que pesquisa, cruza e apresenta cenários de rentabilidade com revisão humana.

## UX-3 Visual Notes

### In shell navigation
- position the module as a first-class capability
- keep the novelty signal subtle
- do not make the shell feel like a lab

### In module landing
- lead with value, not system mechanics
- show trust cues early
- keep the current analysis state visible

### In results
- favor readable verdicts over dense blocks
- keep confidence and risk visible near the top
- distinguish the action hierarchy clearly

---

## Language Guidelines

- use `análise`, `viabilidade`, `cenário`, `confiança` and `aprovação` consistently
- avoid technical labels that imply engineering workflow to the user
- do not say the module is experimental if it is already visible in the shell
- do say that the output is assistive and requires human review before publication
- preserve the distinction between `avaliar`, `simular`, `revisar` and `publicar`

---

## Shell Integration Rules

1. The module entry must feel native to the shell, not inserted after the fact.
2. The IA entry should read like a capability center, not a feature toggle.
3. The current module state must remain visible even when moving between analysis steps.
4. The shell must not force the user to relearn navigation for this module.
5. The design language must remain reusable for future capabilities.

---

## Responsive Behavior

- desktop can show a richer hero and scenario comparison
- mobile should preserve the entry text, state, and the primary action
- the module should not require horizontal scrolling for comprehension
- trust cues and approval state must remain readable on smaller screens

---

## Accessibility Notes

- the module badge cannot be the only way to understand the feature status
- the call to action must remain obvious under keyboard navigation
- color alone must not convey confidence or approval state
- labels must remain concise and readable in Portuguese

---

## Handoff Criteria to PM-3

This story is ready to move to PM-3 when:
- the module entry reads as a first-class capability
- the value proposition is clear in one sentence
- the language does not imply operational confusion
- the visual hierarchy supports future capabilities
- the shell can host the module without redesigning core navigation

## Handoff Package

### For PM-3
- keep the language open for future capabilities
- avoid pinning expansion rules to a single entry pattern
- preserve the distinction between validation and operation

### For QA and implementation follow-up
- verify the shell entry feels native
- verify the capability reads as decision support
- verify the entry remains readable on desktop and mobile
- prepare the closeout handoff for QA-3 after PM-3

### Evidence to collect
- module placement in shell navigation
- clarity of value proposition
- trust cue visibility
- mobile readability
- a11y / keyboard navigation sanity check

## Handoff Notes

- esta story deve ser consumida após a DEV-4
- a próxima story da cadeia é PM-3
- a validação de closeout segue em QA-3 depois da PM-3
- manter o recorte aberto para novas capabilities sem alterar a base do shell
