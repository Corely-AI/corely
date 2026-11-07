# [P1][STR-01] Map P1/P2 capabilities to code and existing issues

<!-- corely-backlog:corely-internal-ops-v1:STR-01 -->

**Planning key:** `STR-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Avoid rebuilding implemented work and identify the smallest missing slices.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

No hard feature prerequisite in this proposal; repository/project preflight and reuse checks still apply.

## Acceptance criteria

- [ ] Record reviewed branch, commit and date; map all 13 apps to existing contracts, use cases, UI, persistence, tests and open/closed issues or PRs.
- [ ] Separate code-present, partial, documented-only, not-found-in-reviewed-scope and unknown; no folder, import or completion note implies production readiness.
- [ ] For every feature identify existing owner, reuse candidate, missing delta and evidence links; distinguish completed closures from not-planned/duplicate closures.
- [ ] Inventory existing domains outside the 13 apps without deleting them, and flag stale worker, entitlement or booking assumptions.

## Verification

Review the capability/evidence matrix and sample relevant source paths; report inspection limits and tests not run.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
