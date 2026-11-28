# [P1][REL-02] Complete mobile, accessibility and locale acceptance

<!-- corely-backlog:corely-internal-ops-v1:REL-02 -->

**Planning key:** `REL-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff and customers can finish critical flows in their working environment.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-03`, `APT-04`, `TASK-02`, `REQ-03`, `KNOW-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Critical controls work at phone/desktop widths and by keyboard without drag-only alternatives or clipped dialogs.
- [ ] Labels, forms and loading/error states are reviewed in pilot locales.
- [ ] Dates/timezones and currencies where relevant render consistently; preserve existing OpenBuk EN/DE/VI language behavior.
- [ ] Record devices/browsers, actual accessibility findings and blockers; do not claim universal coverage or certification.

## Verification

Automated accessibility checks plus manual keyboard/mobile/locale workflow review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
