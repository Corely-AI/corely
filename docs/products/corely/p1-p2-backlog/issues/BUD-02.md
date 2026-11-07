# [P2][BUD-02] Manage budget periods, allocations and auditable versions

<!-- corely-backlog:corely-internal-ops-v1:BUD-02 -->

**Planning key:** `BUD-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers maintain a clear spending plan without rewriting approved history.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized owners create periods, categories/location/team allocations and draft/published versions using deterministic amounts.
- [ ] Amendments preserve earlier versions, actor/reason and effective dates; invalid/overlapping configurations are rejected or explicitly handled.
- [ ] Permissions isolate sensitive team budgets and changes; imports/commands tolerate retry without duplicate allocations.
- [ ] The app stores plans, not competing copies of source transactions, and works without full Accounting.

## Verification

Version/amendment, permission, amount/period and retry tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
