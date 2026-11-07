# [P1][APT-06] Implement the selected import or calendar-connection path

<!-- corely-backlog:corely-internal-ops-v1:APT-06 -->

**Planning key:** `APT-06`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Adoption avoids duplicated scheduling and preserves a single authority.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-03`, `APT-02`, `PLAT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Implement only STR-03’s selected path; replacement previews/imports with stable IDs and row-level errors, while companion mode uses one verified provider.
- [ ] Import retries or sync event replay are idempotent; timezone mapping, duplicate detection and conflict handling are explicit.
- [ ] For a connector, least-privilege credentials, revocation, freshness and read/write limits reuse existing integration infrastructure.
- [ ] Record unchosen criteria as not applicable with evidence; absence of a needed import/connector can satisfy the ticket by an explicit pilot decision.

## Verification

Selected-path retry/replay, missing-access, timezone and failed-cutover/sync tests; do not build both paths.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
