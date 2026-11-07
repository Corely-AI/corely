# [P2][SHIFT-01] Validate demand and define a versioned roster model

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-01 -->

**Planning key:** `SHIFT-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Introduce roster planning only for a demonstrated staffing problem.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-02`, `STR-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach the P2 promotion decision, observed coverage problem and smallest required location/team use case; no invented demand.
- [ ] Identify existing owners and define draft/published roster periods, templates, timezone and planned shifts with stable staff/resource references.
- [ ] Planned shift records remain distinct from actual Time entries and customer bookings; configured working rules are not described as legal compliance.
- [ ] Publishing/version changes retain history and permissions; invalid intervals, archived staff and cross-workspace references are rejected.

## Verification

Roster lifecycle/permission/timezone tests and review of the validated problem and jurisdictional review gaps.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
