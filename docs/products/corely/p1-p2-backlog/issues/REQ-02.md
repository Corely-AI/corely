# [P1][REQ-02] Apply review decisions through safe domain handoffs

<!-- corely-backlog:corely-internal-ops-v1:REQ-02 -->

**Planning key:** `REQ-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An approval is not falsely treated as a completed business action.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Only the configured reviewer can approve/reject/return the current version; self-approval follows an explicit policy, denied by default.
- [ ] Concurrent/replayed decisions and return-for-information/resubmission preserve a complete decision history.
- [ ] The business owner revalidates before applying absence, asset or finance changes; approval alone never proves activation or payment.
- [ ] Failed handoffs are visible and retryable; approved, pending-application and applied outcomes are distinguishable.

## Verification

Decision-race, stale-version, unauthorized/self-approval and failed-handoff replay tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
