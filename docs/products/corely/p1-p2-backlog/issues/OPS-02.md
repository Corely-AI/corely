# [P1][OPS-02] Propagate approved absence into scheduling conflict review

<!-- corely-backlog:corely-internal-ops-v1:OPS-02 -->

**Planning key:** `OPS-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A staffing change becomes a visible operational exception.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-02`, `PEOPLE-03`, `APT-02`, `TASK-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Requests hand off to People once; validated absence updates authoritative availability to prevent future conflicting bookings.
- [ ] Existing affected bookings/work appear as manager exceptions without automatic cancellation, reassignment or customer messages.
- [ ] Correction/cancellation and out-of-order/repeated events converge on latest state without duplicate blocks/tasks.
- [ ] Private reasons stay out of projections/AI/notifications; stale or failed propagation is visible and retryable.

## Verification

Approval-to-conflict E2E, reorder/replay/correction tests and privacy negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
