# AI Copilot: connected-app policy and integration

## Target behavior — 2026-11-07

This policy supports [connected operations](../products/corely/README.md) and the
[focused launch proposal](../products/corely/launch-plan.md). It is a target contract,
not a claim that every current tool/endpoint has been audited.

**Authorized request → Permission-filtered context → Structured proposal →
Deterministic validation → Required approval → Execution through application
use cases → Audited result.**

- Authorize before retrieval and again before execution. Maintain actual tenant/
  workspace isolation through retrieval, prompt/tool context, proposals and writes.
- Include source links, data freshness and uncertainty. Treat imported documents,
  messages and tool results as data, not instructions overriding application policy.
- Use deterministic scheduling/conflict checks, calculations, permission decisions
  and state transitions. Revalidate current records and authority before applying
  a proposal; stale approval must not authorize changed inputs.
- Confirm sensitive AI-originated changes and external communications with the
  authorized user. Execute via owning application use cases, never direct model
  database writes. Trace outcomes through audit and existing safe retry/idempotency
  controls; expose failure/recovery instead of silently repeating effects.
- Keep private personnel information out of unrelated operational views, prompts,
  retrieval and notifications. Publish neutral “unavailable” information only when
  authorized. Do not automatically cancel bookings, reassign work or send messages
  in the proposed absence-assistance flow.
- Keep useful manual workflows available when AI is unavailable.
- Evaluate work completed, human review effort, correction rates, time saved and
  prevention of unauthorized actions. Include denied access, stale/concurrent data,
  prompt injection and personnel-data leakage cases; no evaluation passes claimed here.
- Proposed launch excludes autonomous employment decisions, candidate ranking,
  employee productivity scores, lending decisions, bank-detail changes and fund
  release. Record specialist review needs; do not claim GDPR, employment-law,
  accounting/tax or AI-regulation compliance from these requirements alone.

## Existing machinery and verification limits

Reuse `services/api/src/modules/ai-copilot`, its tool registry/factory, shared
contracts/prompts and API-hosted background runtime. Do not add another orchestration
layer to implement product labels. Static inspection found:

- [StreamCopilotChatUseCase](../../services/api/src/modules/ai-copilot/application/use-cases/stream-copilot-chat.usecase.ts)
  has idempotency/replay and pending-approval handling.
- [Tool registry](../../services/api/src/modules/ai-copilot/infrastructure/tools/tool-registry.ts)
  and [tool factory](../../services/api/src/modules/ai-copilot/infrastructure/tools/tools.factory.ts)
  provide existing execution composition; [tool helpers](../../services/api/src/modules/ai-copilot/infrastructure/tools/tool-utils.ts)
  carry tenant/workspace context. A helper’s workspace fallback does not establish
  correct scope for every new tool: callers must resolve authority explicitly.
- [Tool tests](../../services/api/src/modules/ai-copilot/__tests__/tools.factory.spec.ts)
  and [context tests](../../services/api/src/modules/ai-copilot/__tests__/copilot-context.builder.spec.ts)
  are present; they were inspected, not executed for this documentation change.

These facts do not establish universally permission-filtered retrieval, execution
revalidation, confirmation, freshness or privacy controls. Review each owning
use case/tool before exposing it in the focused package.

### Configured deterministic automation is a separate category

Existing workflow execution dispatches configured task types through the
[task runner](../../services/api/src/modules/background/runtime/modules/workflows/task-runner.processor.ts).
The [human handler](../../services/api/src/modules/background/runtime/modules/workflows/handlers/human-task.handler.ts)
refuses automatic completion (“Human tasks must be completed via API”);
the [email handler](../../services/api/src/modules/background/runtime/modules/workflows/handlers/email-task.handler.ts)
calls the configured email port without a separate interactive approval in that
handler. Provider configuration determines actual delivery. Purchasing also has
explicit auto-post settings and deterministic account-mapping validation.

This policy does not disable those configured automations or add confirmations
by prose. Preserve their actual authorization/configuration policies, review scope
and record gaps separately. They do not authorize unrestricted AI-originated
messages or financial/personnel changes. An outbox event is not proof of delivery.

## AI Copilot integration

- **Frontend defaults**: `VITE_API_BASE_URL` now points to the real API (`http://localhost:3000`) and `VITE_API_MODE=real`. Set `VITE_API_MODE=mock` if you explicitly want to point to the mock server (`http://localhost:4000` or `VITE_MOCK_API_BASE_URL`).
- **Shared client**: Use `useCopilotChatOptions` from `apps/web/src/lib/copilot-api.ts` to configure `useChat` across pages. It injects `Authorization`, `X-Workspace-Id`, and `X-Idempotency-Key` headers and targets `/copilot/chat` or `/copilot/runs/:id/messages` for streaming.
- **Backend surface**: NestJS now exposes `POST /copilot/runs` to create a run, `GET /copilot/runs/:id` to fetch metadata, `GET /copilot/runs/:id/messages` to fetch history, and `POST /copilot/runs/:id/messages` to append + stream. Legacy `POST /copilot/chat` remains for compatibility.
- **Chat history + search**: `GET /copilot/threads`, `GET /copilot/threads/:threadId`, `GET /copilot/threads/:threadId/messages`, `POST /copilot/threads`, and `GET /copilot/threads/search` provide recent-chat sidebar and history search support. Aliased `/ai-copilot/*` routes are available for the same endpoints.
- **Running locally**: use root `pnpm dev:api` and `pnpm dev:web` scripts with a configured environment. Ensure valid API mode/base URL. Historical mock-server instructions need a separate restoration: no tracked mock runtime/package is present in this commit.

### Tool Authoring Guardrails

- Use shared helpers from `services/api/src/modules/ai-copilot/infrastructure/tools/tool-utils.ts`:
  - `buildToolCtx(...)` for use-case context creation.
  - `validationError(...)` for standardized input-validation failures.
- Do not define per-file `buildCtx`/`validationError` in tool adapters anymore; this avoids tenant/workspace drift.
- In `execute(...)`, pass both `tenantId` and `workspaceId` into `buildToolCtx`.
  - `workspaceId` falls back to `tenantId` by default in `buildToolCtx`.
- Keep tool adapters thin:
  - validate with contracts (Zod),
  - build context via `buildToolCtx`,
  - call application use cases (no direct Prisma in tools).

### Model provider config

- Set `AI_MODEL_PROVIDER=openai` or `anthropic`.
- OpenAI default: `AI_MODEL_ID=gpt-4o-mini` and `OPENAI_API_KEY=<your-key>`.
- Anthropic sample: `AI_MODEL_PROVIDER=anthropic`, `AI_MODEL_ID=claude-3-5-sonnet-20240620`, `ANTHROPIC_API_KEY=sk-ant-...`.

### Interactive collect_inputs tool

- The backend registers a client-handled `collect_inputs` tool (AI SDK) so the model can request structured fields mid-conversation.
- Frontend renders the tool call as a `QuestionForm` and replies via `addToolResult` to continue the run automatically.

### Classes Copilot Tools v1

- `classes_listClassGroups` (READ): list class groups with optional active/search filters.
- `classes_listSessions` (READ): list sessions in a date range, optionally filtered by class/status.
- `classes_getSessionDetail` (READ): fetch one session and attendance health indicators.
- `classes_listNeedsAttentionSessions` (READ): show missing-attendance and unfinished-past session issues.
- `classes_getClassRoster` (READ): class roster with payer-health flags (missing/self payer).
- `classes_getTeacherDashboardSummary` (READ): teacher dashboard summary metrics in a range.
- `classes_getTeacherDashboardUnpaidInvoices` (READ): count unpaid class-related invoices.
- `classes_markSessionDone` (WRITE): mark a session done; requires explicit user confirmation.
- `classes_bulkUpsertAttendance` (WRITE): bulk attendance updates; requires explicit user confirmation.

### Cash Management Workflow

- The assistant must use the conversational workflow: "Chat -> Clarify -> Confirm -> Save -> HTML Kassenbericht Preview".
- When dealing with cash amounts, the assistant must never guess the destination or purpose of withdrawn money. Always clarify ambiguity with the user.
- **Do not let the model calculate official cash sales.** The model must call `get_cash_report_preview` first, which calculates the official retrograde calculation based on persisted domain records.
- Write tools like `create_cash_entry`, `submit_counted_cash`, and `close_cash_day` MUST only be called AFTER explicit user confirmation of the extracted details or the preview.
