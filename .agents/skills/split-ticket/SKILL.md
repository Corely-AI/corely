---
name: split-ticket
description: Decompose a Corely ticket or epic into coherent testable outcomes and safe dependencies, or review scope growth. Planning does not authorize implementation or remote issue changes.
---

# Split a ticket

Read [AGENTS](../../../AGENTS.md), the parent goal, criteria, children/dependencies, existing PRs
and the affected owners. Use the [launch proposal](../../../docs/products/corely/launch-plan.md),
[connected-app boundaries](../../../docs/architecture/connected-apps.md), and
[backlog mapping](../../../docs/products/corely/p1-p2-backlog/README.md) for reuse and scope.

1. Separate completed work, residual gaps, unresolved decisions and explicit exclusions. Distinguish
   a requested proposal from authorization to create/update issues. Do not invent a delivery date,
   fixed day/point allocation, owner or customer decision.
2. Prefer independently useful vertical slices that can be tested, reviewed and merged safely.
   Keep tests and UI/UX evidence with their behavior. A foundation/investigation slice needs its
   own concrete outcome, not just a layer name or administrative branch/merge activity.
3. Map each parent criterion to a child, retained parent scope, verified existing coverage or an
   explicit proposed deferral. Reuse equivalent open/closed work with evidence; closed/not_planned
   does not establish implementation. Preserve human scope, urgency and existing parentage.
4. Describe ownership, shared contracts, persistence impact, compatibility, migration/activation
   order and rollback at each boundary. Product-app names do not establish modules or schemas.
   Keep the hard dependency graph acyclic. Parentage is not a prerequisite, P2 promotion is a
   conditional implementation decision, and alternative transaction sources are not an AND gate.
5. Each child states outcome, bounded scope, current owner/reuse evidence, acceptance checks,
   dependencies, UI/UX review need and verification limits. Each implemented child has its own
   branch and draft PR through [implement-ticket](../implement-ticket/SKILL.md).
6. Apply only authorized GitHub changes. Re-read related records, preserve existing content/status,
   use stable keys to avoid duplicates, then verify issue URLs, Project membership and native
   parent/dependency relationships. Keep roadmap P1/P2 separate from incident Priority.

Return the proposal or verified applied breakdown, parent coverage, dependency order and remaining
decisions. No split authorizes catalog scaffolding, a generic orchestration layer, deployment or
completion of unfinished parent acceptance.
