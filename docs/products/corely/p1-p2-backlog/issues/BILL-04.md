# [P2][BILL-04] Export supplier documents and reconcile handoff corrections

<!-- corely-backlog:corely-internal-ops-v1:BILL-04 -->

**Planning key:** `BILL-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An accountant or external payment process receives dependable payable records.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-03`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Export an agreed format with original files, stable bill/supplier IDs, amounts/status and batch provenance under authorized access.
- [ ] Replay does not duplicate postings/exports downstream; acknowledgments and rejection errors are explicit where an integration supports them.
- [ ] Post-export correction/cancellation creates a linked adjustment trail rather than silently replacing prior handed-off data.
- [ ] Document actual accountant/provider acceptance and unsupported scenarios; do not claim a connector or compliance capability not tested.

## Verification

Batch replay/reconciliation, rejected-row and post-export correction fixtures plus recipient review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
