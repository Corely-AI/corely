# Validate and report findings

For each lead retain the principal/input, intended invariant, reachable path, actual result,
source revision and precise evidence. Check alternate writers, callers and lifecycle states before
declaring a missing guard. Reject leads whose only evidence is a naming convention, annotation,
unexecuted test or absent best-practice header without a reachable adverse result.

Use bounded local checks with synthetic fixtures and disposable resources where safe. Inspect
untrusted build/test hooks before execution; do not run arbitrary target code with ambient secrets,
live credentials, shared database access or external delivery. Missing safe isolation or external
provider/runtime facts means a named validation limit, not assumed exploitability.

Classify results explicitly:

- **Confirmed:** the full reachable boundary failure and meaningful result are established by
  source and safe bounded validation; label exactly which part was reproduced.
- **Needs validation:** a concrete source-grounded lead has a specific missing fact or unavailable
  runtime check. State the smallest safe check and who/environment can supply it.
- **Rejected:** the traced invariant holds or impact/reachability was disproved; retain a brief
  reason to avoid repeatedly raising the same lead.

Prioritize by demonstrated impact, reachability, prerequisite authority and uncertainty. A roadmap
P1/P2 scope label is not a security severity. Deduplicate shared root causes and preserve meaningful
variant paths rather than inflate finding counts.

A report gives scope/ref/date and coverage limits first, then findings with location, trigger,
affected principal/data, actual evidence, remaining uncertainty and remediation direction. Separate
source review, local reproduction and deployment verification. Keep payloads harmless and concise;
redact credentials, access-bearing links and personal data. Do not publish issues, make fixes or
send reports elsewhere unless that action is authorized. No findings does not mean complete audit
coverage, compliance or production readiness.
