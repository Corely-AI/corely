# [P2][BUD-04] Explain variances and provide advisory spending warnings

<!-- corely-backlog:corely-internal-ops-v1:BUD-04 -->

**Planning key:** `BUD-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers understand deviations and choose actions themselves.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Show planned, committed and actual amounts/variance under the selected basis with source links and explicit freshness.
- [ ] Threshold warnings are advisory and permission-filtered; no automatic procurement, payment or spending block is introduced.
- [ ] AI may draft plans/explanations from authorized records and labeled assumptions, but cannot silently alter approved budgets.
- [ ] Tests cover missing sources, unsupported currencies and unauthorized drilldown; manual reports remain useful with AI disabled.

## Verification

Variance fixture/reconciliation checks, warning deduplication, explanation-grounding and AI-off tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
