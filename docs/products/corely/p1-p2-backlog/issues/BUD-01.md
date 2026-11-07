# [P2][BUD-01] Define spending basis, source ownership and promotion evidence

<!-- corely-backlog:corely-internal-ops-v1:BUD-01 -->

**Planning key:** `BUD-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Establish what a budget amount actually measures before showing variances.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach customer demand and evidence for at least one reliable source: existing or promoted Expenses, Bills or a verified external feed.
- [ ] Define cash/accrual-oriented operational basis, commitments versus actuals, currency treatment, periods and categorization without promising a statutory ledger.
- [ ] Document how requests/orders/bills/payments representing one expense avoid double counting; unsupported conversions or allocations remain visible.
- [ ] Choose only the needed source integrations and record their dependency IDs; do not force all finance/P3 apps to be enabled.

## Verification

Review sample transaction lifecycle calculations and source reconciliation with the owner/accountant.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
