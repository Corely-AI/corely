# [P2][TIME-02] Import or record time and support transparent corrections

<!-- corely-backlog:corely-internal-ops-v1:TIME-02 -->

**Planning key:** `TIME-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees can see accurate actual entries and explain corrections.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TIME-01`, `PLAT-02`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] The selected path records/imports entries, breaks and source identifiers with idempotent sync and visible freshness.
- [ ] Employees inspect their records and request corrections; approved changes preserve original value, actor, reason and decision trail.
- [ ] Overlap, negative duration, midnight/DST and provider revocation/error cases have deterministic behavior.
- [ ] AI may prepare entries only from employee-supplied notes for confirmation; no automatic payable/billable hours or surveillance scoring.

## Verification

Import replay/correction/version tests, DST/overlap fixtures and staff-access negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
