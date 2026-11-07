# [P2][ASSET-01] Create the minimal equipment register

<!-- corely-backlog:corely-internal-ops-v1:ASSET-01 -->

**Planning key:** `ASSET-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Give company equipment a dependable operational identity.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach demand evidence and inspect actual asset/inventory ownership before defining the narrow equipment owner.
- [ ] Authorized users maintain identifiers, description, location, condition, lifecycle status, warranty dates and permitted documents.
- [ ] Duplicate/cross-workspace references are rejected, archival preserves history and manual lookup works without scanning.
- [ ] Equipment records do not become inventory quantity movements, depreciation or a financial ledger.

## Verification

Identifier validation, custody/history preservation, file permissions and register UI tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
