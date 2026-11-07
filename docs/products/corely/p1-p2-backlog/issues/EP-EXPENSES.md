# [P2][EPIC][EP-EXPENSES] Corely Expenses — employee claims and accountant handoff

<!-- corely-backlog:corely-internal-ops-v1:EP-EXPENSES -->

**Planning key:** `EP-EXPENSES`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Reduce claim handling while keeping approval, reimbursement and accounting distinct.

## Scope and exclusions

Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Evidence / promotion gate

Promote for demonstrated claims pain; current code and accountant handoff are assessed before adding missing slices.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `EXP-01` — Audit and complete employee claim capture
- [ ] `EXP-02` — Route claims for review and resolve policy exceptions
- [ ] `EXP-03` — Track reimbursement evidence and export claims for bookkeeping
- [ ] `EXP-04` — Prepare receipt extraction and duplicate-review suggestions

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.
