# Async PDF Download and Long-Job Pattern

This document describes the current reusable async pattern used for invoice/tax PDF downloads and intended for future long-running jobs.

## Why this exists

- The API can scale independently while background PDF work is triggered asynchronously.
- API stays stateless and does not run heavy jobs inline.
- Frontend can still provide "click and wait" UX with bounded polling.

## Architecture

1. Frontend requests a job result endpoint.
2. API checks durable readiness state.
3. If not ready, API enqueues outbox event (idempotent) and returns `PENDING`.
4. API best-effort wakes background processing with `POST /internal/background/outbox/run`.
5. Background processing handles the outbox event and updates durable state.
6. Frontend polling sees `READY` and opens signed download URL.

## Shared frontend polling primitive

`packages/web-shared/src/shared/lib/async-poll.ts` provides `pollAsyncJob(...)`:

- bounded by `maxTotalWaitMs`
- per-request server wait (`perRequestWaitMs`)
- retry delay clamped from `retryAfterMs`
- abort-aware via `AbortSignal`
- returns `TERMINAL | TIMEOUT | ABORTED`

Current consumers:

- Invoice hook: `packages/web-features/src/modules/invoices/hooks/use-invoice-pdf-download.ts`
- Tax helper: `packages/web-features/src/modules/tax/lib/download-tax-pdf-with-polling.ts`

## API behavior

### Invoice PDF

Endpoint: `GET /invoices/:invoiceId/pdf`

Query params:

- `waitMs` (optional, clamped to max `30000`)
- `forceRegenerate=true` (optional)

Responses:

- `200`: `{ status: "READY", documentId, fileId, downloadUrl, expiresAt }`
- `202`: `{ status: "PENDING", documentId, fileId, retryAfterMs }` + `Retry-After` header
- `422`: `{ error: "INVOICE_PDF_RENDER_FAILED", message }`

### Tax PDF

Endpoints:

- `GET /tax/reports/:id/pdf-url`
- `GET /tax/reports/vat/quarterly/:key/pdf-url`

Responses:

- `READY` with signed URL if PDF already exists
- `PENDING` with `retryAfterMs` (currently `1000`) after enqueue

## Background wakeup for queued PDF generation

API uses a background wakeup helper after enqueue:

- target: `${API_BASE_URL}/internal/background/outbox/run`
- auth header: `x-service-token: WORKER_API_SERVICE_TOKEN` (if configured)
- best effort only; failures are logged and do not fail user request

Background endpoint:

- `POST /internal/background/outbox/run`
- processes due outbox work once

## Required environment

API service:

- `API_BASE_URL` or `INTERNAL_API_URL`
- `WORKER_API_SERVICE_TOKEN`

Deploy workflow wiring is in `.github/workflows/deploy.yml`.

## Durable idempotency model

- Job state is durable (DB + object storage), not in-memory.
- Duplicate clicks/retries are safe:
  - invoice uses deterministic object key per tenant+invoice
  - enqueue path is idempotent on existing `READY`/`PENDING` states
- Polling only reads durable state, so multi-replica processing is safe.

## How to add a new long job

1. Define a response contract with at least `status` and optional `retryAfterMs`.
2. Add an idempotent request endpoint in API:
   - return `READY` immediately when result exists
   - else enqueue outbox event and return `PENDING`
3. After enqueue, trigger `/internal/background/outbox/run` or schedule a Cloud Task.
4. Implement a background outbox handler to produce the artifact and mark durable state `READY`/`FAILED`.
5. Add a feature-level frontend helper around `pollAsyncJob(...)`.
6. In UI, show loading toast/state, handle `TIMEOUT` with non-blocking message, and support abort on unmount/navigation.

## Operational notes

- Cold starts are possible when the API/background capacity is scaled down.
- Wakeup is an optimization; queue-driven processing still works if wakeup call fails.
- Keep request timeout/LB timeout above per-request wait budget (invoice path can hold request up to `waitMs`).
