---
name: security-audit
description: Audit requested Corely trust boundaries with source-grounded findings and bounded safe validation. Use for explicit security review or a concrete security concern, not every implementation task.
---

# Audit Corely security

Read [AGENTS](../../../AGENTS.md), [Corely trust boundaries](references/corely.md) and the requested
scope. Select only relevant [attack classes](references/attack-classes.md) and domain references;
do not load or audit unrelated surfaces because they are cataloged.

1. Record repository/ref/date, scoped routes/modules/data and excluded surfaces. Trace reachability
   from actual composition/route registration. Inspect effective guards, authenticated context,
   contracts, owning use cases, persistence adapters, events and relevant tests/configuration.
   A folder, manifest or stale runbook is not proof that a path is reachable or protected.
2. For each candidate identify the lower-trust principal/input, intended invariant, actual path,
   accepted invalid operation or disclosure, affected principal/resource and meaningful impact.
   Follow the whole path and alternate/retry/revocation cases. A missing annotation or best-practice
   flag alone is not a vulnerability.
3. Validate with source evidence and narrowly bounded local fixtures using synthetic disposable data.
   Keep production systems, live credentials, real messages/financial actions and availability tests
   outside ordinary source-audit authorization. Review target build/test hooks before running them;
   where untrusted code cannot be safely isolated, record the exact validation limit instead.
4. Distinguish confirmed boundary failures, concrete candidates needing a named missing fact, and
   rejected leads. Do not invent exploitability from assumed cloud/identity/provider behavior.
   Use [validation/reporting](references/validation-and-reporting.md) for evidence and severity.
5. Deduplicate by root cause and maintain a concise coverage record of reviewed, blocked and
   unreviewed boundaries. Honor any explicit time/scope budget; incomplete coverage stays explicit.
   Independent review can help when available and authorized, but this skill does not require or
   authorize spawning agents or a repository-wide audit for a narrow request.

## Select domain guidance

- [HTTP/authentication](references/web-protocol-and-auth.md): sessions, headers, public routing.
- [Data isolation/lifecycle](references/data-isolation-and-lifecycle.md): tenant/workspace, caches, files, exports.
- [AI/tools](references/ai-and-llm.md): retrieval, context, tool authorization, approval and side effects.
- [Browser](references/client-side.md): rendering, storage, cross-origin messaging and navigation.
- [RPC/messaging](references/protocols-rpc-and-messaging.md): outbox/jobs/webhooks, replay and schema interpretation.
- [Cloud](references/cloud-and-deployment.md) and [supply chain](references/supply-chain-and-release.md): actual config, workflows and artifacts.
- [Availability](references/resource-exhaustion-and-availability.md): bounded accounting, not live exhaustion.
- [Mobile/IPC](references/desktop-mobile-and-local-ipc.md) or [native/binary](references/memory-safety-and-binary.md): only when the selected POS/native integration exposes that boundary.

Return prioritized evidence-backed findings, coverage and limits. Auditing alone does not authorize
remediation, external issue publication, deployment or sensitive operational changes. Do not claim
legal compliance, production readiness or universal tenant/authorization coverage from static review.
