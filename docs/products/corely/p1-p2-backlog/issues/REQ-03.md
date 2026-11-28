# [P1][REQ-03] Provide request tracking, the decision inbox and bounded reminders

<!-- corely-backlog:corely-internal-ops-v1:REQ-03 -->

**Planning key:** `REQ-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Requesters and reviewers know what awaits action.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-02`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] My requests and manager inbox use permission-filtered records with reconciled counts, status and age, without private summary leakage.
- [ ] Reviewers open/decide requests while staff track returns, rejection, approval and application failures.
- [ ] Reminders reuse notifications/background execution with deduplication and cancellation after decisions.
- [ ] Revoked access, stale data, empty/error states and source unavailability are explicit; reminders never approve work.

## Verification

Inbox permission tests, reminder replay/cancellation and requester-to-reviewer E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
