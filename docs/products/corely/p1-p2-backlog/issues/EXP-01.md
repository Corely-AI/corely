# [P2][EXP-01] Audit and complete employee claim capture

<!-- corely-backlog:corely-internal-ops-v1:EXP-01 -->

**Planning key:** `EXP-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees submit usable claims with original evidence.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach promotion evidence and audit existing Expenses/contracts/UI/tests; implement only missing claim-specific behavior rather than another expense store.
- [ ] Capture employee, date, currency, amount, category/allocation and original receipt with deterministic validation and draft/submitted separation.
- [ ] Supplier bills stay distinct from employee claims; required evidence and cross-workspace references are validated.
- [ ] Claimant/reviewer permissions protect receipts and personal data; an employee can correct a draft without rewriting submitted history.

## Verification

Existing-expense regression, currency/validation and private-receipt access tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
