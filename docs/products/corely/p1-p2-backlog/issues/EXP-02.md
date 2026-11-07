# [P2][EXP-02] Route claims for review and resolve policy exceptions

<!-- corely-backlog:corely-internal-ops-v1:EXP-02 -->

**Planning key:** `EXP-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers make traceable decisions without equating approval with payment.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Reuse existing approval services for configured reviewer and amount/policy routing; no second approval engine.
- [ ] Approve/reject/return checks current claim version, reviewer authority and explicit self-approval rules.
- [ ] Corrections, missing receipts and policy exceptions have visible reasons and resubmission history.
- [ ] Approval records a claim decision only, not tax deductibility, reimbursement or a ledger posting; state/events are idempotent.

## Verification

Routing threshold, stale/concurrent decisions, resubmission and authorization tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
