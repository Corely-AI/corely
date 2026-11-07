# [P1][REL-01] Verify complete pilot workflows and critical regressions

<!-- corely-backlog:corely-internal-ops-v1:REL-01 -->

**Planning key:** `REL-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Prove the package across real module boundaries.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-04`, `PEOPLE-04`, `REQ-03`, `TASK-03`, `KNOW-03`, `OPS-04`, `OPS-05`, `APT-06`, `APT-07`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Normal-day, onboarding, absence and selected adoption/public scenarios run with disposable databases and test delivery sinks.
- [ ] Cover tenancy, revocation, stale writes, retries, booking races, DST and delayed/out-of-order events.
- [ ] Manual workflows pass with AI and P2/finance disabled; touched existing-product regressions remain covered.
- [ ] Record commands/results/skips precisely; historical passes or old checker failures are not presented as fresh results.

## Verification

Run agreed E2E/integration and relevant existing regression suites; report environment blockers honestly.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
