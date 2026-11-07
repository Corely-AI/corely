# [P1][PLAT-04] Support resumable pilot setup and staff invitations

<!-- corely-backlog:corely-internal-ops-v1:PLAT-04 -->

**Planning key:** `PLAT-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An owner configures the first workspace without duplicate identities.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-01`, `PLAT-02`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Reuse workspace setup for locale, IANA timezone and initial location; interrupted setup resumes without creating a second workspace.
- [ ] Invitations/account associations use current Identity/Workspaces interfaces and tolerate retries without duplicate memberships.
- [ ] Only authorized users publish customer-facing availability; incomplete setup and outbound message behavior are explicit.
- [ ] Demo fixtures remain isolated from customer data, and setup requires neither AI nor finance activation.

## Verification

E2E resumed setup, repeated invitation, timezone validation and unauthorized-publication tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
