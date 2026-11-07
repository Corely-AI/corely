# [P2][BILL-03] Approve bills and track due amounts separately from settlement

<!-- corely-backlog:corely-internal-ops-v1:BILL-03 -->

**Planning key:** `BILL-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers review payables without pretending approval releases funds.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Existing approval routing validates reviewer and current bill version; rejection/return/resubmission keeps history.
- [ ] Approved, scheduled externally, partially settled, settled and accounted states are distinct and based on linked evidence where supported.
- [ ] Outstanding/overdue views reconcile original amount, adjustments and confirmed settlement; no autonomous payment or bank-detail change.
- [ ] Corrections, duplicates and concurrent decisions remain traceable; optional Accounting/Payments apps are not required.

## Verification

Approval race/replay, partial settlement/adjustment and due-balance reconciliation tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
