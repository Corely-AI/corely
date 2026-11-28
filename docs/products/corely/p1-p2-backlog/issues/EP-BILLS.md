# [P2][EPIC][EP-BILLS] Corely Bills — supplier documents and payable review

<!-- corely-backlog:corely-internal-ops-v1:EP-BILLS -->

**Planning key:** `EP-BILLS`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Collect supplier invoices and hand them off without conflating approval and settlement.

## Scope and exclusions

Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Evidence / promotion gate

Promote for demonstrated supplier-document handling pain; vendor master data and payments stay with their existing owners.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `BILL-01` — Map existing payables and complete bill intake
- [ ] `BILL-02` — Extract bill fields and review duplicate or matching suggestions
- [ ] `BILL-03` — Approve bills and track due amounts separately from settlement
- [ ] `BILL-04` — Export supplier documents and reconcile handoff corrections

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.
