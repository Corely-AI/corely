# [P1][APT-05] Deliver observable confirmations and reminders

<!-- corely-backlog:corely-internal-ops-v1:APT-05 -->

**Planning key:** `APT-05`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A booking event becomes a verified delivery outcome, not an assumed email.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-03`, `APT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Messages run after committed state through existing notifications and API-hosted background execution, never inside the business transaction.
- [ ] Delivery is deduplicated, bounded/retryable and traceable; reschedule/cancel invalidates obsolete reminders.
- [ ] Recipients, locale, timezone and preferences follow explicit policy; sensitive customer updates remain reviewed.
- [ ] Provider failure is visible without undoing valid booking state; acceptance uses isolated sinks and no real customer contacts.

## Verification

Redelivery/provider-failure/cancellation tests, locale snapshots and isolated message delivery E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
