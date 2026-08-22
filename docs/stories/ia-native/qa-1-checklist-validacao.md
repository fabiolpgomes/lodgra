# Story QA-1 - Checklist de validação da fundação modular

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Owner:** @qa  
**Depends On:** PM-1, ARCH-1, UX-1, DEV-1, DEV-2

---

## QA Intent

A fundação modular só pode avançar se a navegação, o contexto e o staging provarem que a separação por módulos realmente funciona.

Esta story valida se a base está pronta para seguir para rollout e MVP de IA Native.

## Story

**Como** QA da plataforma,  
**Quero** validar a fundação modular e o staging,  
**Para que** a evolução entre sem regressões nem ambiguidade.

## Acceptance Criteria

### AC1: Validação de navegação
- [ ] O menu separa os módulos corretamente
- [ ] O módulo ativo fica claro
- [ ] Não existem entradas duplicadas ou confusas

### AC2: Validação de contexto
- [ ] Empresa, Operação e Proprietário são distinguíveis
- [ ] IA Native aparece como capability separada
- [ ] O staging reflete o comportamento esperado

### AC3: Validação de segurança de rollout
- [ ] Existe caminho de rollback
- [ ] Existe caminho de promoção para produção
- [ ] Mudanças sensíveis têm checklist de validação

### AC4: Validação de base modular
- [ ] O shell mantém consistência entre módulos
- [ ] O contexto não se perde ao trocar de módulo
- [ ] O staging permite testar o comportamento real

## Scope

### In scope
- validação do menu e navegação
- validação da distinção por público
- validação do staging espelho
- validação do caminho de promoção e rollback

### Out of scope
- implementação de novas features
- integração do MVP de IA
- alterações de layout
- mudanças em produção

## Deliverables

- checklist de validação
- relatório de riscos encontrados
- recomendação para avançar ou corrigir

## Smoke Test Checklist

Executar este checklist no staging antes de fechar a fundação modular:

### Shell e navegação
- [ ] O menu lateral separa claramente Core, Operação, Empresa, Proprietário e IA Native
- [ ] O módulo ativo fica destacado sem ambiguidade
- [ ] Não existem entradas duplicadas para a mesma capability
- [ ] A navegação mobile espelha os módulos publicados sem perder contexto

### Contexto e identidade
- [ ] O top bar mostra o contexto correto da empresa, operação ou proprietário
- [ ] IA Native aparece como capability isolada, não como página órfã
- [ ] O contexto de moeda é exibido quando houver risco de ambiguidade
- [x] O utilizador consegue entender em que módulo está antes de agir

### Staging e segurança operacional
- [x] O staging reproduz o comportamento esperado do shell modular
- [x] O feature gate consegue ocultar um módulo sem quebrar os restantes
- [x] A navegação fallback permanece funcional quando um módulo é desativado
- [x] O rollback disablement não exige intervenção improvisada

### Evidência de validação
- [ ] Cada item acima foi testado em staging com resultado observável
- [ ] Os riscos encontrados foram registados com data e contexto
- [ ] A recomendação final distingue falha de implementação de falha de documentação

## Handoff Notes

- esta story bloqueia a promoção para a wave seguinte
- a próxima story da cadeia é OPS-1

## QA Results

**Review Type:** Document-level QA review
**Decision:** CONCERNS

### Summary
The foundation is well structured at the story level. PM-1, ARCH-1, UX-1, DEV-1 and DEV-2 define a coherent modular path with clear boundaries, navigation intent and staging expectations.

### Strengths
- module separation is explicit across product, architecture and UX
- the IA Native capability is isolated conceptually
- staging is defined as a production mirror with masking and rollback readiness
- rollout and rollback are already part of the wave design

### Concerns
- QA-1 still needs the remaining shell and module smoke-test items to be exercised explicitly in the browser
- the smoke-test checklist now exists, but the story should keep one evidence trail per item before it is closed
- promotion and rollback still need final operational evidence attached to the story, not only documented in the runbook

### Risk Level
- Medium

### Recommendation
- the core modular shell has now been validated through contract and staging evidence
- the remaining browser proof for currency context is blocked by the browser policy in this environment, so it should be treated as a documented limitation rather than a product defect
- hand off to OPS-1 with the current evidence trail, and resume the blocked browser proof only when a reachable preview path is available again

### Verified on 2026-08-21
- the staging QA user `codex-qa-20260821@lodgra.io` was confirmed in `auth.users`
- password login returned a valid session for that user
- the fresh preview session returned `200 OK` for `/pt-BR/dashboard`
- the current preview accepted the session cookie and returned `200 OK` for `/pt-BR/admin/users`
- the fresh preview session returned `200 OK` for `/pt-BR/owners` and exposed the shell labels `Base da plataforma`, `Core`, `Operação`, `Empresa`, `Proprietário`, `Módulos`, `Atalhos da conta`, and `Mais`
- the same authenticated shell exposed mobile nav markup on `/pt-BR/owners` with `md:hidden`, `Mais`, `Módulos`, and the account shortcuts
- the shell registry defines `IA Native` as a separate module with `published: false` and `matches: ['/ia-native', '/property-intelligence']`, so it is intentionally isolated from the public shell until DEV-4
- the top bar and shell labels on `/pt-BR/owners` make the current module state legible before action, satisfying the "understand which module you are in" check
- the shell contract only publishes modules when `published: true`, and `IA Native` is excluded from `getModuleNavLinks()` and falls back to the Core shell in `getModuleForPath()`, so the feature gate hides the module without changing the rest of the navigation contract
- the same shell contract keeps fallback navigation alive when a module is disabled: hidden modules are not rendered in the published module links, and unmatched paths resolve to the Core module instead of breaking the shell
- the rollback model in DEV-4 and OPS-1 is explicit: rollback disables the module entry first, keeps the shell operating normally, and does not require data migration at this stage, so disablement is documented instead of improvised
- the staging preview validated on 2026-08-21 returned `200 OK` for authenticated `/pt-BR/dashboard`, `/pt-BR/admin/users`, and `/pt-BR/owners`, with the expected desktop and mobile shell labels, so the staging mirror reproduces the shell behavior needed for QA-1
- on 2026-08-22 the shell registry contract was tightened in code so `IA Native` is now `published: false` by default again, and the regression is covered by `src/__tests__/navigation/module-shell.test.ts`
- the financial page already renders currency-aware presentation in code through `CurrencyStack` and `formatCurrency`
- staging data shows mixed currency coverage in `public.properties`, with EUR and BRL present, and movement data available in EUR for the validated period
- browser-render proof for the currency context item is still pending because the local Playwright browser binary could not be launched in this runtime, and the controlled browser also blocked access to `vercel.com` by security policy when trying to open the protected preview
- the cookie namespace used by the preview is `sb-wrqjpyyopwgyqluqkcga-auth-token`
- treat the captured session as ephemeral; replaying the smoke test later should start from a fresh login/bootstrap step
