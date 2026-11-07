# [P2][INV-03] Track invoice delivery, receivables and reviewed reminders

<!-- corely-backlog:corely-internal-ops-v1:INV-03 -->

**Planning key:** `INV-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Users know which documents were delivered and what remains outstanding.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Delivery uses existing outbox/provider infrastructure with observable status and safe retries; issued does not imply delivered.
- [ ] Outstanding amounts derive from explicit authorized settlement evidence/current payment owner, including partial payment and credit adjustments.
- [ ] Due/reminder views use correct timezone and business policy; sensitive reminder sends are reviewed and deduplicated.
- [ ] No fund collection service or P3 Payments app is required; issued invoices never count as cash merely because they exist.

## Verification

Delivery failure/retry, partial settlement/credit reconciliation and reminder cancellation tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
