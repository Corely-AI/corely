# [P1][KNOW-02] Find procedures and link them from operational work

<!-- corely-backlog:corely-internal-ops-v1:KNOW-02 -->

**Planning key:** `KNOW-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff open the relevant instructions from a task or request.

## Parent and scope

Parent planning key: `EP-KNOWLEDGE`. Replace or accompany with the actual parent issue URL.
Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `KNOW-01`, `TASK-04`, `REQ-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Permission-filtered search/list/detail returns published content with ownership and stale-review warnings.
- [ ] Task/request references follow an explicit current-versus-versioned link policy and recheck permissions on previews.
- [ ] Archiving, deletion or revocation removes cached/search excerpts without leaking titles or private text.
- [ ] No-results and failure states differ and the manual reading path works on mobile and keyboard.

## Verification

Search ACL/cache invalidation and task-to-procedure E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
