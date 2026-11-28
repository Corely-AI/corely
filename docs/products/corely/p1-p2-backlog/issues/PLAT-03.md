# [P1][PLAT-03] Build the responsive manual-first operational shell

<!-- corely-backlog:corely-internal-ops-v1:PLAT-03 -->

**Planning key:** `PLAT-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees reach daily work without navigating an ERP module catalog.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] The selected existing surface has authorized Schedule, Team, Daily work and decision/knowledge entry points with stable deep links.
- [ ] Mobile/desktop screens have loading, empty, error, retry and no-access states; calendars and inboxes are not forced into table-only layouts.
- [ ] Core actions work with AI disabled; stale/offline views do not falsely report saved changes.
- [ ] Use shared public UI packages instead of private imports across apps; preserve OpenBuk public branding/routes and unrelated surfaces.

## Verification

Responsive navigation tests, keyboard smoke checks and an AI-disabled manual workflow.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
