# [P2][TIME-03] Review periods and export approved time with traceability

<!-- corely-backlog:corely-internal-ops-v1:TIME-03 -->

**Planning key:** `TIME-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An external payroll/accounting process receives reconciled approved records.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TIME-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized reviewers approve/return a period with explicit pending-correction behavior and a preserved audit trail.
- [ ] Exports show source IDs, period/timezone, units and totals under an agreed schema; retries produce a traceable batch without double counting.
- [ ] Corrections after approval/export produce explicit adjustment history, not silent replacement of prior records.
- [ ] No payroll calculation, automatic wage approval or claim of statutory compliance; specialist/export validation evidence is recorded.

## Verification

Period state and export reconciliation fixtures, correction-after-export and unauthorized export tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
