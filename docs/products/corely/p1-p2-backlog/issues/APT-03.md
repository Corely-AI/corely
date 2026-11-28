# [P1][APT-03] Deliver the day/week agenda and reviewed booking lifecycle

<!-- corely-backlog:corely-internal-ops-v1:APT-03 -->

**Planning key:** `APT-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers can create, move and cancel work from a reliable daily view.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-02`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Authorized day/week views show staff/resource availability and appointments with timezone and empty/loading/error/stale states.
- [ ] Create/reschedule/cancel uses existing guarded commands; stale slot conflict preserves the draft and explains correction options.
- [ ] Actions show effects and require appropriate confirmation; schedule edits never silently cancel or reassign appointments.
- [ ] Guest/Party associations follow a safe explicit resolution policy without fuzzy auto-merging or exposing unrelated customer history.

## Verification

Lifecycle E2E, stale-conflict handling, mobile/keyboard alternatives and customer-scope negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
