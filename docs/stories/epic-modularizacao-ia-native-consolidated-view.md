# Epic Modularização IA Native - Consolidated View

**Epic:** Evolução Modular do Lodgra + MVP de IA Native para Viabilidade de Propriedades  
**Status:** Ready for execution
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

## 3.5. Latest Progress

- PM-2, ARCH-2, UX-2, DEV-3, QA-2, DEV-4, UX-3, PM-3 and QA-3 are now aligned as ready-for-review stories or validated QA artifacts
- OPS-1 is documented with a PASS WITH CONCERNS QA closeout because the staging restore point is explicit, while production-side restoration remains a follow-up concern
- the closeout view now reflects a reusable expansion policy for future capabilities

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

- The modular structure is in place and the IA Native path now has an execution-ready closeout chain.
- The structure remains modular and ready for handoff.
- Future capabilities should follow the same wave-based governance and the core / capability / extension policy defined in PM-3.

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

## 8. Session Update - 2026-08-22 (Lodgra Pricing / Cancellation Track)

### What was completed
- the pricing/cancellation work was captured in these commits:
  - `38c8a410` - `feat: add cancellation refund processing`
  - `e40ce17d` - `feat: expose refund info on reservation cancel`
  - `d1ab878c` - `feat: show cancellation refund summary`
  - `4b1d46d7` - `refactor: extract cancellation refund summary`
- the cancellation path now:
  - computes refund data from the stored policy / snapshot
  - persists refund metadata on the reservation
  - returns `refund_info` from the API
  - shows the result in the reservation detail UI
- the refund summary now lives in a reusable component, `CancellationRefundSummary`
- focused validation passed:
  - `src/lib/reservations/__tests__/cancelReservation.test.ts`
  - `src/__tests__/api/reservations-cancel-route.test.ts`
  - `npm run typecheck`

### Practical implication
- the reservation detail screen now gives immediate feedback about the refund after cancellation
- other cancellation surfaces can reuse the same component instead of duplicating the summary block
- the repo still contains unrelated pre-existing changes, but this flow is fully documented and committed

### Resume point for tomorrow
1. start from the reusable cancellation summary component
2. decide whether the next step is a second cancellation surface or the next epic front
3. keep the pricing/cancellation flow as the baseline and only extend it if a new requirement appears
