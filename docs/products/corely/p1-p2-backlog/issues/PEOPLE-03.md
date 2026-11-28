# [P1][PEOPLE-03] Record private absences and neutral availability effects

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-03 -->

**Planning key:** `PEOPLE-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Approved absence affects work without revealing its personal reason.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] The owner validates full/partial-day ranges, overlaps, corrections and cancellation without claiming statutory leave-entitlement calculations.
- [ ] Private reasons/files remain restricted; operational events/projections expose only necessary staff/resource, interval and version/lifecycle.
- [ ] Absence state and outbox/audit commit consistently; repeated commands do not duplicate records or blocks.
- [ ] Correction/cancellation updates future availability without erasing history or automatically altering customer appointments.

## Verification

Privacy, overlap, correction, transactional rollback and replay tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
