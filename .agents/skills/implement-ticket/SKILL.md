---
name: implement-ticket
description: Implement a Corely issue as a scoped, tested change with its own branch and draft PR. Use for ticket delivery; read-only questions and reviews do not start implementation.
---

# Implement a Corely ticket

Read [AGENTS](../../../AGENTS.md), the actual issue and applicable nested instructions.
Use the [product strategy](../../../docs/products/corely/README.md),
[launch proposal](../../../docs/products/corely/launch-plan.md),
[repository evidence](../../../docs/products/corely/repository-alignment.md), and
[boundaries](../../../docs/architecture/BOUNDARIES.md) to resolve scope and reuse.

## Delivery

1. Read the issue's outcome, exclusions, acceptance criteria, parent, prerequisites and linked PRs.
   For this repository use `Corely-AI/corely` and organization Project #1, verified live.
   Existing app code may already satisfy part of the request; extend only the residual gap.
   P2 implementation needs its recorded promotion decision; P2 discovery can still proceed.
   Resolve genuine product ambiguity while continuing independent work. Do not invent an issue,
   assign a person, or rewrite existing scope merely to satisfy workflow bookkeeping.
2. Verify the working tree, repository, remote and intended base. The observed remote is `corely`
   and default branch `development`; rediscover them before branching or publishing. Use a separate
   `<issue-number>-<short-summary>` branch per implemented ticket, from the approved current base.
   Never use `codex/` as a branch prefix. Preserve unrelated changes; use an isolated worktree
   when needed. Parentage alone does not authorize an epic integration branch or a different base.
3. For substantial work keep `docs/tasks/<issue-number>-<short-summary>.md` using the
   [task record](references/task-template.md). Record the actual issue, parent/dependencies, branch,
   intended PR base, scoped plan and actual verification. A PR number is not an issue number.
4. Inspect the owning contracts, use cases/ports, adapters, UI, manifests, models and tests before
   editing. Follow the [module guide](../../../docs/guides/MODULE_IMPLEMENTATION_GUIDE.md) and
   [persistence policy](../../../docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md).
   Booking owns Appointments; focused clients use shared package exports. A catalog app name
   does not authorize a service, schema, new frontend deployment or duplicate master records.
5. Implement the bounded outcome. Use [bug-fix](../bug-fix/SKILL.md) for defects,
   [ui-change](../ui-change/SKILL.md) for visible changes, and
   [create-e2e-test](../create-e2e-test/SKILL.md) when authoring browser/system tests.
   Keep strict TypeScript, trusted tenant/workspace context, backend authorization and applicable
   audit/outbox/idempotency invariants. Reuse the API-hosted background runtime.
6. Run checks appropriate to the change and current scripts. Root commands include `pnpm lint`,
   `pnpm typecheck`, `pnpm test:unit`, `pnpm test:int` and `pnpm arch:check`; inspect their effective
   commands and environment needs before running. For prose-only changes use installed Prettier
   and targeted links, not migrations or tooling installation. Separate actual runs, skips and
   baseline failures; scope fixes to this ticket. Use [split-ticket](../split-ticket/SKILL.md)
   when a coherent outcome cannot fit the agreed scope.
7. Deliver every implemented ticket through its own draft PR using
   [prepare-pull-request](../prepare-pull-request/SKILL.md). Commit with DCO sign-off and publish the
   ticket branch as part of requested ticket delivery, honoring explicit local-only/no-push limits.
   Include UI/UX evidence for interface changes; backend/docs changes explain why it is N/A.
   Planning-only or read-only work does not create an empty PR. A draft PR with real scoped work
   may expose remaining verification limits; it is not ready for review until material gates pass.

Return the issue, branch/PR, concrete change, actual checks, UI/UX evidence when applicable and
remaining limits. Keep the issue/project status aligned with observed progress. Do not equate a
PR, successful checks or a merge with deployment or pilot acceptance; do not auto-merge or deploy.
