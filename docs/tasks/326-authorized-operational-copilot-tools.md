# 326. Authorized operational tools in Copilot

## Tracking and outcome

[Issue #326](https://github.com/Corely-AI/corely/issues/326) delivers the first controlled
operational slice for [Connected Operations](https://github.com/Corely-AI/corely/issues/288).
Its prerequisites [#298](https://github.com/Corely-AI/corely/issues/298) and
[#302](https://github.com/Corely-AI/corely/issues/302) are closed. Branch
`326-authorized-operational-copilot-tools` targets `development` from
`87563c1224e89d3f6d52d6fac7181b0ab5b965a8`.

## Reuse and plan

- Resolve actor, tenant and workspace from API request context. Check current workspace
  permissions and app enablement before retrieval and execution.
- Register typed list, preview and apply tools through the existing Copilot registry. Reads
  retain record ID, version and retrieval time. Existing Tasks queries and transition rules
  provide permission-filtered records and the completion preview.
- Use the persisted Copilot approval and existing Daily Work completion command for writes.
  Bind approvals to the scope, task title and version. Owner-side authorization, idempotency,
  outbox and audit apply to the same record.
- Keep list results and streaming tool usage bounded. Redact tool payloads and operational turn
  content from telemetry and tool execution logs.

## Verification

Thirty targeted Copilot and Tasks tests passed. They cover explicit workspace, disabled
assistant, changed or expired proposals, redacted tool provenance, and a paused and resumed
stream with the real AI SDK and an in-process model.

Twelve PostgreSQL lifecycle tests passed on a migrated disposable database. The new preview
regression covers actor and workspace filtering, stale versions, concurrent retries and audit.

`pnpm --filter @corely/api typecheck`, the API build and the Backoffice build passed.
The architecture check reports 57 diagnostics outside the changed files. The Mintlify
checker crashed on Windows. The changed documentation links were checked locally.

## UI/UX evidence

Backoffice `/tasks/copilot` as a staff member with access to their own Tasks.

The rendered route used a synthetic API and SSE fixture. The desktop actor confirmed with
the keyboard and the mobile actor dismissed the approval. Both requests retained the run
and exact approval input. The disabled assistant offered Daily Work and made no chat request.

- [Approval with exact title and version, desktop 1440 × 960, English](./evidence/326/desktop-approval.png)
- [Approval, mobile 390 × 844, German](./evidence/326/mobile-approval.png)
- [Assistant disabled, mobile 390 × 844, English](./evidence/326/mobile-disabled.png)

## Impact and remaining work

The Tasks and AI Assistant capabilities enable this slice. Existing deterministic automation
continues through its configured workflow handlers. This change uses the existing database schema.
The browser evidence uses synthetic records and involves no external model provider.
