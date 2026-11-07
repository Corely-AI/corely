# [P2][BUD-03] Project commitments and actuals from the selected sources

<!-- corely-backlog:corely-internal-ops-v1:BUD-03 -->

**Planning key:** `BUD-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Budget utilization is traceable and does not count the same cost twice.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-01`, `BUD-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Specific notes

Conditional dependency: link EXP-03, BILL-03 or a verified existing/external equivalent selected by BUD-01. Alternatives are not an AND requirement.

## Acceptance criteria

- [ ] Implement only the selected reliable source adapters through contracts/events and stable origin IDs; actual source dependencies are linked before implementation.
- [ ] Cancellation, correction, partial settlement and duplicate/out-of-order events converge on documented basis calculations.
- [ ] Every utilization figure drills into permitted source records with freshness and a reconcilable total; missing data is not treated as zero.
- [ ] Projection rebuild is idempotent and does not write source-owner tables or require unpromoted apps.

## Verification

Lifecycle/replay/rebuild and source-total reconciliation tests, including partial/cancelled transactions.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
