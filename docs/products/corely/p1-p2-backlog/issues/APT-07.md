# [P1][APT-07] Close public-booking abuse and isolation release gaps

<!-- corely-backlog:corely-internal-ops-v1:APT-07 -->

**Planning key:** `APT-07`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Public routes cannot bypass booking policy or expose another studio.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Trusted public resolution derives workspace authority; crafted cross-studio IDs and legacy endpoints cannot bypass OpenBuk rules.
- [ ] Rate/abuse controls work across API instances using an existing suitable mechanism with documented limits and failure behavior.
- [ ] Errors do not leak customer/booking existence and valid idempotent retries remain usable.
- [ ] Enumeration, token misuse and parallel abuse are tested; unresolved findings remain visible release blockers.

## Verification

Shared-limit/multi-instance tests, public isolation and security review evidence.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
