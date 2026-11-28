# [P2][HELP-03] Add simple response targets and support follow-up

<!-- corely-backlog:corely-internal-ops-v1:HELP-03 -->

**Planning key:** `HELP-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers can identify neglected tickets without surveillance metrics.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-02`, `REQ-02`, `TASK-04`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Define one explicit response-target clock, timezone and pause policy; report time calculations consistently.
- [ ] Overdue warnings/reminders are bounded and deduplicated; resolution cancels obsolete reminders.
- [ ] Support can link an approval or implementation task through its owner without automatically approving or completing it.
- [ ] Reports explain counts and timing from ticket records, not employee productivity scores or contractual SLA guarantees.

## Verification

Clock/pause/closure fixtures, notification replay and linked-approval failure tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
