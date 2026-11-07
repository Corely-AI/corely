# [P2][INV-02] Prepare invoice drafts from approved operational records

<!-- corely-backlog:corely-internal-ops-v1:INV-02 -->

**Planning key:** `INV-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Reduce billing entry without assuming every appointment is billable.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`, `APT-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized users select confirmed billable source work and recipient; source references are retained and reviewed.
- [ ] AI proposes descriptions/fields with provenance but never invents tax rates, changes bank details or issues an invoice unconfirmed.
- [ ] Source reuse follows explicit partial/rebilling rules and flags duplicate billing; completed appointments are not automatically charged.
- [ ] Amounts and tax use deterministic logic; manual drafting works without AI or Appointments integration.

## Verification

Duplicate-source, partial billing, authorization, AI proposal review and manual-fallback tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
