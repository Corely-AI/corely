# [P1][PEOPLE-01] Maintain the staff directory and explicit identity links

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-01 -->

**Planning key:** `PEOPLE-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employee records are usable without confusing them with customers or login accounts.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers create/update/archive minimal profiles with stable workspace IDs, manager/team/location and optional account/party/resource links.
- [ ] Staff without accounts are supported; link validation rejects cross-workspace and conflicting duplicate associations.
- [ ] List/detail/search expose only permitted fields; archived staff remain interpretable in historical records.
- [ ] Reuse actual Party/Identity/resource ownership via interfaces; do not create a duplicate master-data subsystem.

## Verification

Profile and link validation, tenant/privacy tests, directory UI and archive-history integration.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
