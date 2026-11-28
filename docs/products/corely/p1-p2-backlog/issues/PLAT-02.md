# [P1][PLAT-02] Enforce operational roles and private-data access

<!-- corely-backlog:corely-internal-ops-v1:PLAT-02 -->

**Planning key:** `PLAT-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff and managers see or change only authorized workspace records.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Document action/resource/field rules using existing RBAC/policies, including private personnel data, files, exports and audit access.
- [ ] Backend reads and writes validate trusted tenant/workspace membership; guessed IDs, direct routes and model arguments cannot bypass it.
- [ ] Menu filtering is not authorization; caches, search, file links and AI retrieval obey the same access boundary.
- [ ] Role revocation and workspace switching are covered by negative tests using multiple tenants and workspaces.

## Verification

Negative API/tool/file/export tests with different roles and tenants; verify private-field redaction.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
