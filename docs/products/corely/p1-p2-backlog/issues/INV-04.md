# [P2][INV-04] Validate the selected invoice format and accountant handoff

<!-- corely-backlog:corely-internal-ops-v1:INV-04 -->

**Planning key:** `INV-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Deliver documents the chosen customer/accountant workflow can actually use.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`, `INV-03`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Define the exact supported recipient/jurisdiction/document format and verify current official requirements with qualified review at implementation time.
- [ ] For any chosen structured e-invoice format, validate representative outputs and negative fixtures using the relevant specification/tooling; do not label a PDF alone compliant.
- [ ] Preserve source/export versions, originals and error reports; unsupported cases fail visibly rather than silently emitting an invalid document.
- [ ] Record accountant/provider acceptance and limitations; no blanket tax/compliance guarantee or full DATEV integration claim without actual verification.

## Verification

Format validator fixtures, export reconciliation, unsupported-format behavior and documented accountant acceptance.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
