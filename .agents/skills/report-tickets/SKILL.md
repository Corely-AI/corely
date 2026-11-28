---
name: report-tickets
description: Report Corely GitHub issues and Project status with accountable owner counts and optional snapshot comparisons. Reporting is read-only unless ticket changes or publication are explicitly requested.
---

# Report Corely tickets

Read [AGENTS](../../../AGENTS.md), the reporting request and current repository/Project tools.
Default this repository's engineering scope to `Corely-AI/corely` and organization Project #1;
verify identity, membership, fields and pagination. State whether scope is the board or repository.

## Collect and interpret

- Read [collection/statistics](references/evidence.md) for normalized records and the offline helper.
  Keep issue state, exact recorded Project status, assignees and source time distinct from code,
  review, test, merge, deployment and acceptance evidence. Exclude PRs/drafts/redacted records from
  issue counts and disclose collection limits, archived content and missing status.
- Inspect criteria and relevant linked PR/check/review evidence for claims about progress. A mention,
  issue closure, updated timestamp or green historical run is not proof of completion/deployment.
  Preserve conditional P2 and completed STR-02 coverage from the existing backlog map; do not
  reinterpret roadmap scope labels as incident urgency or count epics as extra product apps.
- Count unique tickets once overall and once for each distinct assignee. Keep unassigned tickets
  visible separately. Use verified alias mappings only; familiar logins do not prove one person.
  Report raw account totals unless an explicit person mapping exists.
- For saved reports or requested comparisons use [snapshot rules](references/snapshots.md).
  Compare only equivalent complete scopes, and verify missing old issues before calling them closed.
  A one-off chat answer need not create repository files or commit a snapshot.

## Alerts and delivery

Read [alert/publication rules](references/alerts.md) only when alerts or delivery are requested.
Corely has no imported workload thresholds, exempt users, Slack destination or scheduled report
policy. Return reports in chat by default. Do not send messages, tag people, create channels or
schedule reports from this skill alone. When publication is explicitly authorized, prepare the full
report, verify destination and tool limits, send sequentially, retain read-back receipts, and inspect
an ambiguous result before retrying.

## Output

State scope/time/completeness, counts by recorded status, assignee totals, unassigned count, relevant
movement and a few linked next actions with limits. For detailed requests include each ticket's
exact title/link, owner/status, observed PR evidence and remaining work. Keep raw bodies, credentials,
private personnel data and logs out of reports. Return a saved snapshot or publication link only
when it exists and was verified. Reporting never silently changes issue ownership/status or urgency.
