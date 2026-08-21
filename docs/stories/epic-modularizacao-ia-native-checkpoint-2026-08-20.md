# Epic Modularização IA Native - Checkpoint

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Date:** 2026-08-21  
**Status:** Paused after staging validation  
**Purpose:** registrar tudo o que foi definido até aqui e preparar a retomada amanhã

## 1. What We Established

### Product direction
- The Lodgra must evolve as a modular platform, not as a collection of ad hoc additions.
- The product is organized into four major public areas:
  - Core
  - Operação
  - Empresa
  - Proprietário
- The new AI-native capability is `Property Intelligence`.
- The MVP must be isolated first, then integrated with control.

### Key decisions
- The epic stays as the umbrella for modularization + AI Native MVP.
- The PRD is the source of truth for the `Lodgra Property Intelligence` module.
- Story `46.1` is the first functional cut of the MVP and is CLI-first.
- The system must remain modular, with explicit boundaries and feature gates.
- Technical debt must not become hidden structure.
- Multi-tenancy, currency, timezone and approval governance remain mandatory.

## 2. Documents Created or Updated

### Product and source of truth
- `docs/product/lodgra-property-intelligence-prd.md`
- `docs/stories/46.1-property-intelligence-cli.story.md`

### Epic coordination
- `docs/stories/epic-modularizacao-ia-native.md`
- `docs/stories/epic-modularizacao-ia-native-index.md`
- `docs/stories/epic-modularizacao-ia-native-sequencia.md`
- `docs/stories/epic-modularizacao-ia-native-responsabilidades.md`
- `docs/stories/epic-modularizacao-ia-native-handoff.md`
- `docs/stories/epic-modularizacao-ia-native-consolidated-view.md`

### Wave stories
- `docs/stories/ia-native/pm-1-modulos-submodulos.md`
- `docs/stories/ia-native/arch-1-fronteiras-contratos.md`
- `docs/stories/ia-native/ux-1-navegacao-por-publico.md`
- `docs/stories/ia-native/dev-1-shell-modular.md`
- `docs/stories/ia-native/dev-2-staging-espelho.md`
- `docs/stories/ia-native/qa-1-checklist-validacao.md`
- `docs/stories/ia-native/ops-1-rollout-rollback.md`
- `docs/stories/ia-native/pm-2-recorte-mvp-ia.md`
- `docs/stories/ia-native/arch-2-arquitetura-viabilidade.md`
- `docs/stories/ia-native/ux-2-fluxo-mvp-ia.md`
- `docs/stories/ia-native/dev-3-mvp-ia-isolado.md`
- `docs/stories/ia-native/qa-2-validacao-mvp-ia.md`
- `docs/stories/ia-native/dev-4-integracao-lodgra.md`
- `docs/stories/ia-native/ux-3-entrada-mvp-no-shell.md`
- `docs/stories/ia-native/pm-3-expansao-capabilities.md`

## 3. Current Architecture Summary

### Wave 1 - Foundation
- product map
- architectural boundaries
- navigation by audience
- modular shell

### Wave 2 - Environments and Governance
- staging mirror
- QA validation
- rollout and rollback governance

### Wave 3 - IA Native MVP
- PRD-backed MVP scope
- orchestrator with specialist agents
- deterministic financial engine
- UX for decision support
- isolated staging implementation

### Wave 4 - Integration
- controlled shell integration
- clear entry point for Property Intelligence
- expansion policy for future capabilities

## 4. Current Product Model

### Core
- authentication
- organizations
- permissions
- currencies
- timezone
- monetization formatting
- audit
- shell navigation
- design system

### Operational module
- properties
- reservations
- calendars
- guests
- users
- settings
- synchronizations

### Company module
- consolidated revenue
- operational costs
- profit
- cash flow
- multi-currency reading

### Owner module
- rentability
- payouts
- expenses
- history
- property-level reports

### AI Native module
- viability analysis
- expected return
- conservative / base / optimistic scenarios
- opportunity score
- assisted recommendations

## 5. MVP Model for Property Intelligence

### PRD position
- first AI-native module of Lodgra
- pilot organization: Algarve Home Stay
- target portfolio size: 20-300 properties
- deterministic, versioned financial engine
- human approval required before external publication

### Workflow
1. input data
2. intake normalization
3. research by specialist agents
4. deterministic calculation
5. audit and coherence check
6. human review
7. approval / publication

### Key states
- draft
- needs_input
- researching
- calculating
- needs_review
- approved
- published
- failed
- superseded

### Data provenance
- provided
- observed
- derived
- estimated
- overridden

## 6. Open Questions Still Relevant

- exact external research sources per geography
- whether the first live release stays CLI-first or gets a minimal internal UI
- persistence model for the pilot
- any external APIs needed for enrichment
- final implementation path for the first technical cut

## 7. Important Constraint

The correct order remains:
1. modularize the Lodgra shell
2. prepare staging as a production mirror
3. validate the isolated MVP
4. integrate the validated MVP into the shell

## 8. Tomorrow's Starting Point

When we resume, the recommended starting point is:
1. review this checkpoint
2. confirm the execution order for Wave 1
3. begin planning the modular shell and staging foundation

## 9. Closing Note

The product direction is now clear enough to plan execution without re-deciding the whole structure.
The next step is planning, not redefining.

## 10. Session Update - 2026-08-21

Today we completed the staging access recovery and confirmed the dashboard flow end-to-end.

### What was done
- fixed the local Supabase target so `npm run dev` points to the staging project by default
- added `npm run dev:production` so production can be tested locally without editing `.env.local`
- updated the staging setup guide with the new local default / production switch workflow
- created and confirmed the staging user `codex@test.com`
- marked the user as confirmed in Supabase Auth and ensured the matching `public.user_profiles` row exists
- validated login successfully at `http://localhost:3000/pt-BR/login`
- navigated through the dashboard after login and confirmed the shell loads correctly

### Important context to keep
- `.env.local` is now the staging-first local default
- production should be used only through the dedicated command when needed
- no further manual env swapping is required for the normal dev loop

### Resume point for tomorrow
1. keep working from the staging-first setup
2. continue the next QA or story flow from the dashboard context
3. if production validation is needed, use `npm run dev:production`
