# [P2][BILL-02] Extract bill fields and review duplicate or matching suggestions

<!-- corely-backlog:corely-internal-ops-v1:BILL-02 -->

**Planning key:** `BILL-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI reduces data entry while reviewers check the source.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-01`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Extraction proposes fields with original-document provenance and uncertainty; structured originals are preserved.
- [ ] Duplicate suggestions use visible supporting identifiers/amounts without auto-deletion or unsupported fraud claims.
- [ ] Purchase matching is optional when existing purchase records are present, with partial/mismatch exceptions; P3 Purchasing expansion is not required.
- [ ] Reviewers confirm changes and calculations are deterministic; malicious supplier instructions cannot change payment details or invoke privileged tools.

## Verification

Ambiguous/duplicate/partial-match fixtures, prompt injection, permissions and extraction-off manual entry.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
