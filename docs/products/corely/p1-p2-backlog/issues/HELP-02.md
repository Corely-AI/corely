# [P2][HELP-02] Manage queue assignment, replies and resolution history

<!-- corely-backlog:corely-internal-ops-v1:HELP-02 -->

**Planning key:** `HELP-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Support staff handle work without leaking internal notes.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized agents filter/assign/prioritize tickets and move through explicit statuses with concurrency validation.
- [ ] Internal notes are separate from requester-visible replies and excluded from external/employee notifications and search snippets.
- [ ] Resolved/reopened tickets retain history and optional linked asset/task/request references without copying their records.
- [ ] Reply/assignment retries do not duplicate communication; permission changes revoke access immediately on next request.

## Verification

Private-versus-public reply tests, concurrent assignment, reopen and idempotent notification cases.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
