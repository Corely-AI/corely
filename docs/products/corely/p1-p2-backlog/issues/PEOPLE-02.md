# [P1][PEOPLE-02] Manage working patterns and dated availability exceptions

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-02 -->

**Planning key:** `PEOPLE-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Scheduling uses explicit staff availability rather than implicit all-day access.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers define recurring hours, effective dates, timezone and dated exceptions with invalid-range validation.
- [ ] Document one authoritative owner for each input and how People and existing Booking rules collaborate; no parallel competing schedule stores.
- [ ] Future rule changes flag affected commitments without rewriting historical bookings.
- [ ] DST gaps/folds, overnight ranges and conflicting exceptions have deterministic precedence.

## Verification

Frozen-time/DST domain tests, effective-date cases and integration against authoritative Booking availability.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
