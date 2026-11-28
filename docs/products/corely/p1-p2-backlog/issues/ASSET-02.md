# [P2][ASSET-02] Record assignments, handovers and returns

<!-- corely-backlog:corely-internal-ops-v1:ASSET-02 -->

**Planning key:** `ASSET-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Equipment custody changes are explicit and auditable.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `ASSET-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Assignment/return records identify custodian, effective time, condition and acknowledgment; no duplicate simultaneous exclusive custody.
- [ ] Optional equipment-request approval links to the existing request without equating approval with physical delivery.
- [ ] Concurrent handovers and retries are validated; departures surface outstanding returns instead of silently reassigning assets.
- [ ] Past custodians and condition changes remain visible to authorized users without exposing unrelated personnel data.

## Verification

Concurrent custody/replay tests and employee departure-to-return workflow.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
