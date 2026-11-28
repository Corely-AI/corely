# [P2][INV-01] Validate billing scope and close invoice-lifecycle gaps

<!-- corely-backlog:corely-internal-ops-v1:INV-01 -->

**Planning key:** `INV-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Issue correct documents using existing billing capabilities.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach demand and build-versus-integrate decision; inspect existing Invoices/Tax/Party code and document the supported scope and specialist-review gaps.
- [ ] Draft/issue/correct or credit uses current domain rules, unique numbering, deterministic decimal money and explicit currency/tax validation.
- [ ] Issued records preserve history; corrections follow an auditable supported path rather than silently editing the original.
- [ ] Customer billing is distinct from Corely SaaS subscription billing and does not require native Accounting activation.

## Verification

Existing invoice regression, numbering race/retry, currency/rounding and correction tests with reviewed fixtures.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
