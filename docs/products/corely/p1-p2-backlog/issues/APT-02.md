# [P1][APT-02] Unify availability inputs and harden booking concurrency

<!-- corely-backlog:corely-internal-ops-v1:APT-02 -->

**Planning key:** `APT-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Displayed slots and final writes obey the same authoritative rules.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Specific notes

Reuse existing room/resource capability; do not expand to arbitrary booking categories without pilot evidence.

## Acceptance criteria

- [ ] Document precedence/freshness for working patterns, neutral absence blocks, eligibility, buffers, existing reservations and active holds.
- [ ] Create/reschedule reloads state under the existing shared transaction/locking policy; concurrent writers cannot double-book constrained resources.
- [ ] Changed-payload idempotency replay is rejected and booking/receipt/audit/outbox state commits or rolls back coherently.
- [ ] DST, adjacency, cancellations and expired holds are deterministic; internal reservations and customer appointments remain distinguishable.

## Verification

Disposable-Postgres race tests across OpenBuk and existing writers; DST/buffer/hold/rollback regressions.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
