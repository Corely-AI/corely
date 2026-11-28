# [P1][PLAT-01] Compose the package using existing app manifests

<!-- corely-backlog:corely-internal-ops-v1:PLAT-01 -->

**Planning key:** `PLAT-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Enable the right capabilities without introducing another app framework.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Reuse actual app IDs, dependencies, capability resolution and workspace configuration; marketing names do not force backend renames.
- [ ] The focused package exposes Schedule, Team and Daily work without requiring Accounting, payroll or a finance subscription.
- [ ] Disabled optional apps preserve their records and cause graceful UI degradation, not destructive cleanup.
- [ ] Tests distinguish tenant app enablement, workspace capability, user permission and product entitlement.

## Verification

Configuration integration tests for enabled/disabled dependencies and regression of existing product packages.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
