# Shared SSE Streaming

This document describes the shared Server-Sent Events (SSE) infrastructure for API modules and web clients.

## Goals

- Reuse one SSE implementation across modules.
- Keep module layering intact (controller -> use case -> repository).
- Support authenticated streams (`Authorization`, `X-Workspace-Id`) with tenant/workspace isolation.
- Provide heartbeat + timeout handling so streams survive proxies and cleanly terminate.
- Allow polling-based streams that emit only when data changes.

## Server Infrastructure

### Location

- `services/api/src/shared/sse/create-polling-sse-stream.ts`
- `services/api/src/shared/sse/sse-stream.factory.ts`
- `services/api/src/shared/sse/sse.types.ts`

### Core API

- `createPollingSseStream<TSnapshot, TPayload>(options)`
  - immediately fetches and emits initial snapshot
  - polls at `intervalMs`
  - emits heartbeats at `heartbeatMs`
  - emits a timeout event and completes at `timeoutMs`
  - can emit only on change via `equals`/`hash`
- `SseStreamFactory.createPollingStream(req, options)`
  - wraps stream with request disconnect cleanup (`takeUntil(req.close)`)

### Controller pattern

1. Resolve request context with `buildUseCaseContext(req)`.
2. Use a use case to fetch stream snapshots (no Prisma in controller).
3. Return `SseStreamFactory.createPollingStream(...)` from `@Sse()` endpoint.

## Client Infrastructure

### Location

- `packages/api-client/src/sse/subscribe-sse.ts`
- `packages/auth-client/src/api-client.ts` (`ApiClient.subscribeSse`)

### Core API

- `subscribeSse(url, options)` in `@corely/api-client`
  - fetch-based SSE parser (works with auth headers)
  - typed event callbacks
  - reconnect with backoff
- `ApiClient.subscribeSse(endpoint, options)` in `@corely/auth-client`
  - injects `Authorization` + `X-Workspace-Id`
  - reuses shared SSE parser

## Example: Classes Billing Send Progress

- Endpoint: `GET /classes/billing/runs/:billingRunId/send-progress/stream`
- Event name: `billing.invoice-send-progress`
- Payload contract: `BillingInvoiceSendProgressEvent` in `packages/contracts/src/classes/billing.schema.ts`

Web flow:

1. Create billing run with `sendInvoices: true`.
2. Subscribe to run-scoped SSE stream.
3. Update progress UI on each event.
4. On SSE failure, fallback to existing polling (`getBillingPreview` loop).
