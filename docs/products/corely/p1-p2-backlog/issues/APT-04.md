# [P1][APT-04] Secure the existing guest booking and management journey

<!-- corely-backlog:corely-internal-ops-v1:APT-04 -->

**Planning key:** `APT-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Customers manage only their own booking without access to workspace records.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-02`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Use opaque scoped management tokens with expiry/revocation; public responses expose no tenant/workspace IDs or unnecessary personal information.
- [ ] Confirmation, cancellation and rescheduling obey studio policy and the same availability checks as staff writes.
- [ ] Forged/expired/replayed tokens have safe outcomes and tokens are redacted from logs.
- [ ] Preserve existing EN/DE/VI and legacy-route exclusion; companion-mode pilots do not gain a competing public writer by accident.

## Verification

Token scope/replay/revocation and legacy bypass tests; guest booking-to-management E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
