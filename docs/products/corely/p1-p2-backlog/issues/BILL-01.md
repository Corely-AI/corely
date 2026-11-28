# [P2][BILL-01] Map existing payables and complete bill intake

<!-- corely-backlog:corely-internal-ops-v1:BILL-01 -->

**Planning key:** `BILL-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Capture supplier documents without building a second payable store.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach promotion evidence and inspect current Purchasing/VendorBill/Party/Documents implementations before assigning ownership.
- [ ] Capture original PDF/structured file, supplier reference, invoice number/date, due date, currency and deterministic amounts with draft/review states.
- [ ] Supplier selection reuses the existing party master; employee claims remain in Expenses and P3 Vendors is not a prerequisite.
- [ ] Validation and file access reject malformed/cross-workspace input while preserving original evidence and correction history.

## Verification

Existing-payable regression, malformed document/amount validation and supplier/file authorization tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
