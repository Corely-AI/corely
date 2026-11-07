---
name: bug-fix
description: Diagnose and fix a Corely defect with reproduction, root-cause analysis and meaningful regression checks. Diagnosis-only requests stop before editing.
---

# Fix a defect

Read [AGENTS](../../../AGENTS.md), the issue's expected/actual behavior, affected owners/contracts,
callers and tests. Use [implement-ticket](../implement-ticket/SKILL.md) for authorized delivery.
Diagnosis-only requests remain read-only and do not create a branch or PR.

1. Establish the intended behavior from the issue and canonical product/domain rules. Distinguish
   requirements from launch hypotheses or historical documentation.
2. Reproduce with the smallest safe fixture or targeted test; record setup and reproduction limits.
   Trace the failing invariant through owning use cases and adapters, including failure paths.
   Do not mask it with a frontend guard, broad catch, unsafe cast or weakened assertion.
3. When a fix is authorized, add meaningful regression coverage where it proves the defect. Show
   the original failure and corrected result when practical. Pure prose or reversible low-impact
   edits do not need tests that only mirror implementation.
4. Correct only the scoped cause. For stateful behavior check tenant/workspace scope, permissions,
   stale/concurrent updates, retries, rollback and audit/outbox effects. Existing baseline debt is
   evidence to record, not permission for a repository-wide rewrite.
5. Run the regression and affected neighboring checks; report unrun/failed checks honestly.
   Use [ui-change](../ui-change/SKILL.md) for visible corrections and
   [prepare-pull-request](../prepare-pull-request/SKILL.md) for the ticket's own draft PR.

Preserve public Booking/OpenBuk routes, shared wire compatibility and existing finance behavior.
A correction does not authorize deployment, production database changes or external delivery.
Return cause, fix, verification and PR/evidence links; do not claim a verified fix without proof.
