# [P1][TASK-01] Create, assign and complete employee-facing tasks

<!-- corely-backlog:corely-internal-ops-v1:TASK-01 -->

**Planning key:** `TASK-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Track daily work with accountable ownership and a simple lifecycle.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Authorized users create/assign/update/complete/reopen tasks with shared contracts and validation; inactive/cross-workspace assignees are rejected.
- [ ] Title, owner, optional due time and simple status use one record across surfaces; workflow execution steps and CRM activities stay distinct.
- [ ] Concurrent edits and repeated commands cannot silently lose updates or duplicate tasks; mutations are audited.
- [ ] Staff archival preserves history; no advanced Projects app is required.

## Verification

Lifecycle, concurrency/idempotency and create-to-complete UI tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
