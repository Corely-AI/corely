# [P2][EXP-03] Track reimbursement evidence and export claims for bookkeeping

<!-- corely-backlog:corely-internal-ops-v1:EXP-03 -->

**Planning key:** `EXP-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Approved claims can be handed off without migrating accounting.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Record externally confirmed reimbursement references/amount/date through the existing payment owner or an explicitly scoped evidence workflow; no money is released.
- [ ] Approved, exported, partially reimbursed and reimbursed states remain distinct and reconcile to supporting records.
- [ ] Generate permission-controlled export batches with stable IDs, originals and correction history; verify the chosen accountant/provider format with real requirements.
- [ ] Replay, partial reimbursement and corrections do not duplicate totals; the workflow remains usable without Corely Accounting or the P3 Payments app.

## Verification

Export reconciliation, duplicate/partial reimbursement and accountant-handoff fixture review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
