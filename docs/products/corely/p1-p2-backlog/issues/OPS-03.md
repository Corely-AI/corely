# [P1][OPS-03] Build the Today view and operational exception inbox

<!-- corely-backlog:corely-internal-ops-v1:OPS-03 -->

**Planning key:** `OPS-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Team members see appointments, work and decisions together.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-02`, `REQ-03`, `APT-03`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Today combines permitted appointments, tasks, decisions and available exceptions under deterministic local-day filters.
- [ ] Entries link to their owning app; actions recheck authorization and summaries exclude private fields.
- [ ] Counts reconcile to source records; delayed/unavailable sources show freshness rather than false empty results.
- [ ] Disabled apps and AI outages leave a useful manual view; projection rebuilds do not write other domains’ tables.

## Verification

Projection reconciliation/rebuild/source-failure tests and staff/manager daily-work E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
