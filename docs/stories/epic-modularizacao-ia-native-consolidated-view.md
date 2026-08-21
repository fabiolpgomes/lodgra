# Epic Modularização IA Native - Consolidated View

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Draft  
**Purpose:** visão única consolidada para iniciar execução real

## 1. Current State

### Wave 1 - Foundation
- Status: ready
- Scope: product map, architecture boundaries, UX navigation, modular shell

### Wave 2 - Environments and Governance
- Status: ready
- Scope: staging mirror, QA validation, rollout/rollback governance

### Wave 3 - IA Native MVP
- Status: ready
- Scope: MVP scope, IA architecture, MVP UX, isolated implementation, validation

### Wave 4 - Integration
- Status: ready
- Scope: integrate MVP into shell, refine entry point, define expansion criteria

### Closeout - Expansion Governance Validation
- Status: ready
- Scope: validate the expansion policy and confirm the classification model for future capabilities

## 2. Dependency Chain

1. PM-1
2. ARCH-1
3. UX-1
4. DEV-1
5. DEV-2
6. QA-1
7. OPS-1
8. PM-2
9. ARCH-2
10. UX-2
11. DEV-3
12. QA-2
13. DEV-4
14. UX-3
15. PM-3
16. QA-3

## 3. Execution Readiness

The epic is ready to start execution when:
- the product direction is approved
- the modular boundaries are accepted
- the shell and staging strategy are clear
- the MVP of IA has a narrow, validated scope
- rollout and rollback are governed
- the expansion policy has been validated as a reusable product gate

## 4. Final File Set

- `epic-modularizacao-ia-native.md`
- `epic-modularizacao-ia-native-index.md`
- `epic-modularizacao-ia-native-sequencia.md`
- `epic-modularizacao-ia-native-responsabilidades.md`
- `epic-modularizacao-ia-native-handoff.md`
- `epic-modularizacao-ia-native-wave-1.md`
- `epic-modularizacao-ia-native-wave-2.md`
- `epic-modularizacao-ia-native-wave-3.md`
- `epic-modularizacao-ia-native-wave-4.md`
- `../product/lodgra-property-intelligence-prd.md`
- `46.1-property-intelligence-cli.story.md`
- `ia-native/qa-3-validar-expansao-capabilities.md`

## 5. Recommendation

Start with Wave 1 execution in order and do not advance until the exit criteria for each wave are met.
Keep the PRD as the source of truth for the MVP, and use Story 46.1 as the first functional cut for implementation planning.

## 6. Notes

- No code has been started yet.
- The structure is intentionally modular and ready for handoff.
- Future capabilities should follow the same wave-based governance.

## 7. Session Update - 2026-08-21

The staging foundation is now validated in the local dev loop.

### Confirmed today
- local development points to the staging Supabase project by default
- production can still be checked locally through a dedicated command
- staging login works for `codex@test.com`
- the dashboard shell loads successfully after login
- the review flow reached the authenticated dashboard state without needing to swap env files manually

### Practical implication
- the next session can resume directly from authenticated staging validation
- the local env workflow is now less error-prone for development and QA
