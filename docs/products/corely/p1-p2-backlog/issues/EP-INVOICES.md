# [P2][EPIC][EP-INVOICES] Corely Invoices — bounded customer billing

<!-- corely-backlog:corely-internal-ops-v1:EP-INVOICES -->

**Planning key:** `EP-INVOICES`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Customers needing billing can issue and track invoices without a general-ledger migration.

## Scope and exclusions

Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Evidence / promotion gate

Promote only when pilots need outgoing billing rather than an existing tool; review the exact jurisdiction, tax/document scope and handoff requirements.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `INV-01` — Validate billing scope and close invoice-lifecycle gaps
- [ ] `INV-02` — Prepare invoice drafts from approved operational records
- [ ] `INV-03` — Track invoice delivery, receivables and reviewed reminders
- [ ] `INV-04` — Validate the selected invoice format and accountant handoff

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.
