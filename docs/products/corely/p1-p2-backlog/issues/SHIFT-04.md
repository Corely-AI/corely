# [P2][SHIFT-04] Handle open-shift claims and manager-reviewed swaps

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-04 -->

**Planning key:** `SHIFT-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees request coverage changes without overriding scheduling constraints.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `SHIFT-03`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Eligible staff propose a claim/swap through existing Requests with clear affected shifts and participants.
- [ ] Approval rechecks availability, roster version and conflicts; competing claims cannot both take the same exclusive assignment.
- [ ] Rejection, withdrawal and resubmission preserve history; approved changes publish/notify once.
- [ ] No private reasons, automatic employment decision or payroll calculation enters the swap workflow.

## Verification

Concurrent claims, stale approvals, replay and requester/manager swap E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
