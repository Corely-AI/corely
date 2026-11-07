# [P2][HELP-01] Validate the support function and deliver ticket intake

<!-- corely-backlog:corely-internal-ops-v1:HELP-01 -->

**Planning key:** `HELP-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Turn a repeated internal support problem into a bounded queue.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach observed ticket volume/problem and choose one function; inspect existing Issues/forms capabilities before creating another ticket model.
- [ ] Employees submit a category, description and permitted files; requester identity and workspace are trusted server context.
- [ ] Tickets remain distinct from Tasks and authorization Requests, with clear ownership and a small initial lifecycle.
- [ ] The requester sees their own ticket and safe status; confidential HR-style content is restricted according to the chosen function.

## Verification

Intake validation, tenant/requester privacy and existing-Issues regression tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
