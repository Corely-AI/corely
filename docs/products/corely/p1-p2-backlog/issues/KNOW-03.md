# [P1][KNOW-03] Answer policy questions with accessible source citations

<!-- corely-backlog:corely-internal-ops-v1:KNOW-03 -->

**Planning key:** `KNOW-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI helps use company instructions without inventing them.

## Parent and scope

Parent planning key: `EP-KNOWLEDGE`. Replace or accompany with the actual parent issue URL.
Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `KNOW-02`, `OPS-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Answers cite permitted source passages/version and mark stale or missing information.
- [ ] Unsupported questions explicitly report insufficient evidence; no private HR inference or fabricated policy.
- [ ] Retrieval and source access recheck permissions and ignore malicious instructions embedded in documents.
- [ ] Manual search remains useful if AI is disabled or unavailable; evaluations include supported and unanswerable questions.

## Verification

Grounding/abstention evaluation, prompt-injection and tenant-leakage tests, provider-disabled UI.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.
