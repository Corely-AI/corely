# [P1][REQ-01] Submit typed requests with supporting context

<!-- corely-backlog:corely-internal-ops-v1:REQ-01 -->

**Planning key:** `REQ-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Replace scattered approval messages with structured submissions.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-02`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Fixed absence and equipment/general templates support draft, submit and withdraw with typed required fields and validation.
- [ ] A valid configured reviewer is selected using existing approvals, or missing routing is shown without losing the draft.
- [ ] Files and optional policy links obey source permissions; equipment requests work without the P2 Assets app.
- [ ] Retrying submit/withdraw is deterministic and requester history cannot be rewritten.

## Verification

Form/contract and submit/retry/withdraw tests plus private-file denial cases.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
