# [P2][ASSET-03] Provide warranty/return follow-up and source-linked assistance

<!-- corely-backlog:corely-internal-ops-v1:ASSET-03 -->

**Planning key:** `ASSET-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers act on overdue returns and find equipment context quickly.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `ASSET-02`, `TASK-04`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized views show due returns/warranties with date provenance; reminders create deduplicated linked follow-up tasks.
- [ ] AI can find permitted asset records and prepare a return checklist, but cannot silently change custody or financial value.
- [ ] Purchase/bill references are optional links to existing records; P3 Purchasing/Maintenance is not required.
- [ ] Manual views, exports and disabled-AI behavior remain useful; source revocation removes private previews.

## Verification

Reminder deduplication, date/source checks, AI authorization and optional-integration absence tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
