# [P2][HELP-04] Draft support responses using authorized Knowledge

<!-- corely-backlog:corely-internal-ops-v1:HELP-04 -->

**Planning key:** `HELP-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI assists resolution without inventing policies or exposing private notes.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-02`, `KNOW-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Suggest category and response from permitted approved procedures with source links and uncertainty.
- [ ] Sensitive or outgoing replies require review; unsupported answers explicitly defer to an authorized human.
- [ ] Private notes and HR details cannot leak to a requester through retrieval, generated summaries or tools.
- [ ] Manual support remains available and evaluations track useful resolution/correction rather than chatbot volume.

## Verification

Grounded-response, unsupported-question and cross-role leakage evaluations; explicit-send and AI-off checks.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
