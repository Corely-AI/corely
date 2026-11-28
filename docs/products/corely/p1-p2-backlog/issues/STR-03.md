# [P1][STR-03] Choose the pilot booking authority and staff surface

<!-- corely-backlog:corely-internal-ops-v1:STR-03 -->

**Planning key:** `STR-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A team adopts Corely without maintaining the same schedule twice.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Record one initial mode: replace the booking system or complement one verified provider; identify authoritative records and the selected existing staff surface.
- [ ] Replacement mode defines import/cutover and essential public booking; companion mode proves API access, freshness, identity mapping, write authority and failure behavior.
- [ ] Preserve the already-existing OpenBuk public journey; do not create a competing booking owner or assume every provider supports bidirectional writes.
- [ ] Unselected alternatives are out of implementation scope; unresolved decisions block dependent implementation, not backlog creation.

## Verification

Review a synthetic adoption walkthrough and capture actual provider/migration constraints, not assumed integration support.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
