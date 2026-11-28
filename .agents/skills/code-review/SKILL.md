---
name: code-review
description: Review a Corely PR or diff for concrete correctness, architecture, access, data-integrity and UX regressions. Review requests do not authorize fixes or posting comments.
---

# Review a change

Read [AGENTS](../../../AGENTS.md), issue criteria, the full current diff and affected callers/tests.
Use [boundaries](../../../docs/architecture/BOUNDARIES.md),
[persistence](../../../docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md), and relevant owner docs.
A task record or PR description is a claim to verify, not architectural authority.

1. Verify repository, actual head/base and the intended review scope. Check dependency inclusion,
   compatible intermediate behavior and whether the diff contains only the ticket's work. Never
   assume `main`, default-branch ancestry, or completion from parentage/status alone.
2. Trace concrete failure paths. Prioritize business invariants, strict typing, API compatibility,
   backend permissions, distinct tenant/workspace identities, trusted public workspace resolution,
   private-data access and state/event atomicity. Inspect retries, duplicate submissions, races,
   revocation, stale approvals and partial failures where relevant.
3. Check ownership: wire types in contracts, controller/tool delegation, pure domains, persistence
   behind owning adapters, no cross-module table access or OSS import of `ee`. Reuse Booking,
   Party, Documents, approvals and existing finance instead of duplicating app-named records.
4. For visible changes inspect the PR's UI/UX evidence and meaningful states using
   [ui-change](../ui-change/SKILL.md). Name the concrete unverified behavior if evidence is missing;
   a generic screenshot demand is not a code defect. Check source-linked AI proposals, execution
   revalidation, confirmation and useful manual workflows where the change touches them.
5. Confirm findings against actual code/tests. Safe focused checks may support a finding; identify
   checks actually run. Separate new violations from unrelated baseline failures and unverified
   questions. Do not flag generic style, speculative scaling, or coincidental similarity as DRY debt.

Return prioritized actionable findings with tight locations, a reachable trigger, impact and a
recommended direction. If no material findings exist, say so and state material verification limits.
Review alone does not authorize edits, status changes, approval, posting, merge or deployment.
