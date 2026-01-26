# Copilot streaming migration notes

## Phase 0 – Current state

### Backend (services/api/src/modules/ai-copilot)

- Endpoints: `POST /copilot/chat` streams plain text (Nest controller wraps `StreamCopilotChatUseCase`), `POST /copilot/runs` to create a run, `GET /copilot/runs/:id`, `GET /copilot/runs/:id/messages`, `POST /copilot/runs/:id/messages` streams another turn for an existing run. All are guarded by identity + tenant guards and require `X-Idempotency-Key`.
- Streaming: `AiSdkModelAdapter.streamChat` uses `streamText` (OpenAI/Anthropic) with `streamProtocol: "text"` semantics; it writes text deltas directly to the response plus a `[DONE]` sentinel. No UIMessage stream or tool/result events are emitted.
- Persistence: Prisma schema (80_ai.prisma) keeps `AgentRun` (id, tenantId, createdByUserId, status, metadataJson, traceId), `Message` (id, tenantId, runId, role, partsJson, createdAt, traceId), and `ToolExecution` (id, tenantId, runId, toolCallId UNIQUE per tenant/run, toolName, inputJson, outputJson?, status, finishedAt?, errorJson?, traceId). `StreamCopilotChatUseCase` currently stores only the inbound messages; assistant outputs are not persisted after streaming.
- Tools: `ToolRegistry` aggregates DomainToolPort definitions from invoices/party/sales/purchasing/inventory/approvals/engagement. `buildAiTools` only registers tools with `kind: "server"` and executes them immediately, logging to ToolExecution, audit, and outbox. The client-handled `collect_inputs` tool is added but approval/needsApproval semantics do not exist yet.
- Idempotency/audit: `PrismaCopilotIdempotencyAdapter` delegates to the shared `IdempotencyService` (action key `copilot.chat`) using a hash of the request messages. Runs are traced via `OtelObservabilityAdapter`; audit writes `copilot.chat` and `copilot.tool.*` events.

### Frontend (apps/web)

- UI lives under `apps/web/src/modules/*CopilotPage.tsx` (sales, purchasing, inventory) and `modules/assistant` which renders the shared `Chat` component. Routes in `apps/web/src/routes/copilot.tsx` and feature pages all call `useChat` from `@ai-sdk/react`.
- Transport: `useCopilotChatOptions` (apps/web/src/lib/copilot-api.ts) targets either the real API base or mock base depending on `VITE_API_MODE`. It posts to `/copilot/chat` (or `/copilot/runs/:id/messages` when a runId is provided) with `streamProtocol: "text"`, auto-generates an idempotency key, and passes tenant/auth headers. No resume or history loading exists; runId is typically undefined so every page load starts a new run.
- Rendering: Components mostly render `message.parts` when present, with some special handling for `collect_inputs` via `addToolResult`, but because the backend streams plain text there are no live tool-call/result parts arriving from the server.
- Loading status text: `Chat` uses `useRotatingStatusText` and the message lists in `apps/web/src/shared/components/chat/statusTexts.ts`; tool-phase messages appear only when a tool submission/approval is pending in the UI.

### Contracts (packages/contracts)

- The only copilot-specific contracts today are `CollectInputsTool*` schemas in `packages/contracts/src/copilot/collect-inputs.schema.ts`, exported via `packages/contracts/src/index.ts`. There are no shared UIMessage/tool/state contracts yet, so new schemas must be additive to avoid breaking existing imports.

### Identity/persistence mapping

- Chat thread identity = `AgentRun.id` (created in `StreamCopilotChatUseCase` or via `POST /copilot/runs`), scoped by tenant.
- Message identity = `Message.id` rows keyed to `runId` with `partsJson` storing raw UIMessage parts from the request payload.
- Tool call state = `ToolExecution` rows keyed by `(tenantId, runId, toolCallId)`; statuses updated on completion/failure from `buildAiTools`.
- Persistence gaps to address: assistant messages/parts are not saved, and tool approvals/continuations are not modeled beyond the ToolExecution rows.

## Current streaming implementation (in progress)

- **Endpoints**
  - `POST /copilot/chat` streams UIMessage chunks (AI SDK format) via `createUIMessageStream`/`pipeUIMessageStreamToResponse`. Body accepts `id`, `message` (new turn) or `messages` (continuations/approvals), `requestData`, and optional `trigger/messageId`.
  - `GET /copilot/chat/:id/history` returns persisted UI messages for a run, parsed from `partsJson`.
  - `GET /copilot/chat/:id/stream` stub returns 204 (resume not wired yet).
- **Persistence**
  - User/tool/assistant messages saved to Prisma `Message` with `{ parts, metadata, content }` JSON payload; assistant rows upsert on continuation.
  - Tool executions sync from streamed tool parts: pending-approval rows are created, outputs/errors mark ToolExecution as completed/failed, and outbox emits `copilot.tool.completed`.
  - Data parts: a transient `data-run` chunk is emitted to share the canonical `runId` with the client without persisting it.
- **Tool approval**
  - Domain tools may set `needsApproval: true` (e.g., `inventory_anomalyScan`). Approval requests surface as `tool-*` parts with `state: "approval-requested"`; clients respond via `addToolApprovalResponse`, and the transport automatically resubmits when approvals are present.
  - Server-side tools continue to log executions/audit via `buildAiTools`; approval-denied paths update ToolExecution status to `failed`.
- **Frontend transport**
  - `useCopilotChatOptions` now provisions a `DefaultChatTransport` with per-request idempotency keys and a stored `runId` per module/tenant. Normal turns send only the latest message; approval continuations send full `messages`.
  - `fetchCopilotHistory` hydrates `useChat` state on mount so refresh preserves chat history. UI renders text/reasoning/tool states and shows Allow/Deny buttons for approval requests.
- **Adding a tool**
  - Implement `DomainToolPort` with `needsApproval?: boolean` when the call should pause for user consent; register it via the `COPILOT_TOOLS` provider. Ensure the execute handler returns JSON-serializable output so the tool output can be streamed and persisted.
