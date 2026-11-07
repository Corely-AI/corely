# [P2][SHIFT-03] Publish roster versions and expose approved booking availability

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-03 -->

**Planning key:** `SHIFT-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff see a stable schedule and Booking consumes only approved staffing changes.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `SHIFT-02`, `APT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Publishing creates an auditable version with staff-visible changes and notification preferences.
- [ ] A documented policy decides whether published shifts constrain Booking; draft rosters never silently change reservable slots.
- [ ] Repeated/out-of-order events converge to the latest version; existing booking conflicts become manager exceptions, not automatic cancellations.
- [ ] Staff can see their own schedule, changes and freshness without access to restricted personnel fields.

## Verification

Publish-to-booking integration, replay/version ordering, conflict and mobile self-service tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
