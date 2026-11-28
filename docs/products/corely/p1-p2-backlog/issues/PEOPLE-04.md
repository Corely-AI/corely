# [P1][PEOPLE-04] Deliver staff self-service and controlled onboarding/offboarding

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-04 -->

**Planning key:** `PEOPLE-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff access their records while managers retain authority over membership and responsibilities.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`, `PLAT-04`, `TASK-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Staff view permitted profile/availability and edit only allowed fields or submit corrections; no self-granted roles or manager changes.
- [ ] Onboarding links an approved checklist without automatically granting sensitive access.
- [ ] Archiving/offboarding surfaces future assignments and access follow-up; Identity changes use its owner and do not silently cancel bookings.
- [ ] Historical work stays traceable after departure and self-service works on mobile.

## Verification

Role-escalation negatives, onboarding checklist reuse and departure with future commitments E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
