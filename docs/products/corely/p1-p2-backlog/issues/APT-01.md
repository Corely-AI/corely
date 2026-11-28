# [P1][APT-01] Extend services and eligible staff for a small team

<!-- corely-backlog:corely-internal-ops-v1:APT-01 -->

**Planning key:** `APT-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Support a team without creating another catalog or staff master.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers configure multiple services and eligible staff using existing Booking models and Catalog enrichment interfaces where appropriate.
- [ ] Employee, bookable resource and offering IDs remain distinct and workspace-safe; current single-staff studios still work.
- [ ] Duration, buffers, monetary values and eligibility have shared deterministic validation.
- [ ] Archiving prevents new bookings while preserving snapshots and surfacing future commitments for review.

## Verification

Service/resource validation, historical-data regression and multi-service/staff setup E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
