# [P1][TASK-03] Generate recurring opening and closing checklists

<!-- corely-backlog:corely-internal-ops-v1:TASK-03 -->

**Planning key:** `TASK-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Routine work recurs reliably without duplicate daily tasks.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers publish simple daily/selected-weekday templates with timezone, effective dates and assignees; edits affect future instances only.
- [ ] A deterministic occurrence identity prevents duplication on parallel/delayed/retried background runs.
- [ ] Pause/end, skipped occurrence, inactive assignee and bounded catch-up behavior are explicit.
- [ ] DST and local-day rollover are tested; completing an instance never rewrites its template.

## Verification

Frozen-clock recurrence/DST tests, parallel replay and template-to-completion E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
