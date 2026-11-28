# [P2][EXP-04] Prepare receipt extraction and duplicate-review suggestions

<!-- corely-backlog:corely-internal-ops-v1:EXP-04 -->

**Planning key:** `EXP-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI reduces typing while people verify financial facts.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-01`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Extraction preserves the original receipt and proposes fields/categories with source evidence and uncertainty.
- [ ] A claimant/reviewer confirms edits before a draft changes; money/tax calculations use deterministic existing logic.
- [ ] Duplicate suggestions identify supporting records but do not delete claims or declare fraud; access filters apply to comparisons.
- [ ] Malicious receipt text cannot invoke tools or change bank details; manual entry works when extraction fails or AI is disabled.

## Verification

Representative/ambiguous receipt fixtures, false-positive duplicate cases, prompt-injection and manual-fallback tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
