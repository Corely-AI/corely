# 309 typed operational requests

[Issue #309](https://github.com/Corely-AI/corely/issues/309) belongs to
[Corely Requests #284](https://github.com/Corely-AI/corely/issues/284). The delivery
branch `309-typed-operational-requests` starts from `development` at `87563c122`.
[Shared access #302](https://github.com/Corely-AI/corely/issues/302) and the
[staff directory #305](https://github.com/Corely-AI/corely/issues/305) are integrated.

## Scope and decisions

Backoffice staff can save, submit and withdraw fixed absence, equipment and
general requests. Requests owns the typed lifecycle and extends the existing
Approvals, People, Documents, Identity and Workspaces interfaces. Reviewer
decision processing, domain handoff and inbox reminders follow in #310 and #311.

The workspace admin selects one named and eligible reviewer for each template.
Optional policy references use the existing tenant-scoped Documents permissions.
Request details and files require the current tenant, workspace and requester.

See the [operating guide](../backend/operational-requests.md) for permissions,
storage and lifecycle behavior.

## Verification

- API and Backoffice builds and scoped type checks succeeded.
- Five Approvals and Requests tests passed, including three with disposable
  PostgreSQL. The 10 API dependency-injection smoke tests passed with a synthetic
  mail configuration.
- Changed TypeScript files passed ESLint with existing warnings in shared files.
- The repository-wide architecture and locale checks reported existing failures
  outside this change. Added navigation strings use the established locale catalog.
- Rendered Backoffice used synthetic API responses to exercise empty list, file
  selection, missing routing, reviewer assignment, submission, keyboard dismissal
  of withdrawal confirmation, withdrawn history and access denied. Verified at
  390 × 844 and 1280 × 900 in English, with German and Vietnamese headings checked.

## UI evidence

- [Draft retained when reviewer routing is missing](309-assets/draft-routing-missing-mobile.jpg)
- [Reviewer routing saved](309-assets/reviewer-routing-desktop.jpg)
- [Submitted and withdrawn history](309-assets/history-desktop.jpg)
