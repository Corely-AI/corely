# Background Runtime & Outbox Semantics

Corely runs background work inside `services/api` under `src/modules/background`.

Recurring jobs should be triggered by Cloud Scheduler (or equivalent). Event-driven and delayed jobs should be triggered by Cloud Tasks hitting API internal endpoints.

## Internal endpoints

- `POST /internal/background/outbox/run`
- `POST /internal/invoices/:invoiceId/pdf`
- workflow queue endpoints under `/internal/queues/*`

Auth:

- `x-service-token` when `WORKER_API_SERVICE_TOKEN` is configured

## On-demand outbox wakeup

After enqueueing outbox work, API schedules or directly triggers:

- `POST /internal/background/outbox/run`

API-side trigger helper:

- the API background wakeup helper under `services/api/src/shared/infrastructure/`
- prefers `API_BASE_URL` or `INTERNAL_API_URL`
- optional legacy fallback: `INTERNAL_WORKER_URL`
- best-effort call: failures are logged but do not fail the originating API request

## Outbox processing semantics

Outbox delivery is durable and multi-replica safe.

### Claim strategy

- Claim uses Postgres row locking with `FOR UPDATE SKIP LOCKED`.
- Claim updates rows to `PROCESSING` with lease fields:
  - `lockedBy`
  - `lockedUntil`
- Claim transaction is short-lived; actual handler work runs outside the claim transaction.

### Lifecycle

`PENDING -> PROCESSING -> SENT | FAILED`

- `PENDING`: waiting, and `availableAt <= now`.
- `PROCESSING`: claimed by one API background run with lease.
- `SENT`: handler completed successfully.
- `FAILED`: terminal failure (non-retryable or attempts exhausted).

### Lease and reclaim

- On claim, processing sets `lockedUntil = now + OUTBOX_LEASE_DURATION_MS`.
- Processing heartbeats the lease while the handler is running (`OUTBOX_LEASE_HEARTBEAT_MS`).
- If a process crashes and the lease expires, another run can reclaim the event.

### Retry/backoff

- Failures are retried with exponential backoff + jitter:
  - `OUTBOX_RETRY_BASE_MS`
  - `OUTBOX_RETRY_MAX_MS`
  - `OUTBOX_RETRY_JITTER_MS`
- Max attempts capped by `OUTBOX_MAX_ATTEMPTS`.
- Non-retryable errors (`retryable=false`) fail immediately.

### Idempotency requirements

Outbox is at-least-once. Handlers must be idempotent.

Current safeguards include:

- Invoice email sends: delivery record + idempotency key + sent-status short-circuit.
- Invoice PDF generation: deterministic storage key and ready-state short-circuit.
- Tax snapshot handler: upsert by domain-unique key.

## Scheduler singleton behavior

Outbox consumption is allowed on all replicas.

Singleton recurring runners such as `invoiceReminders` and `classesBilling` still use distributed advisory transaction locks when executed.

## Config reference

### Outbox concurrency, lease, and retry

| Variable                    | Default  | Purpose                           |
| --------------------------- | -------- | --------------------------------- |
| `OUTBOX_BATCH_SIZE`         | `50`     | Events claimed per batch          |
| `OUTBOX_CONCURRENCY`        | `10`     | Max concurrent event handlers     |
| `PDF_RENDER_CONCURRENCY`    | `2`      | Max concurrent heavy PDF handlers |
| `OUTBOX_LEASE_DURATION_MS`  | `60000`  | Lease/visibility timeout          |
| `OUTBOX_LEASE_HEARTBEAT_MS` | `15000`  | Lease extension interval          |
| `OUTBOX_MAX_ATTEMPTS`       | `3`      | Retry cap before terminal failure |
| `OUTBOX_RETRY_BASE_MS`      | `5000`   | Retry base delay                  |
| `OUTBOX_RETRY_MAX_MS`       | `120000` | Retry max delay                   |
| `OUTBOX_RETRY_JITTER_MS`    | `500`    | Retry jitter                      |

### Internal scheduler calls

| Variable                   | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `API_BASE_URL`             | Public API base URL for task targets    |
| `INTERNAL_API_URL`         | Optional internal API base URL override |
| `WORKER_API_SERVICE_TOKEN` | Internal auth token (`x-service-token`) |

## Operational notes

- Prefer Cloud Tasks for near-real-time PDF/email/background handling.
- Prefer Cloud Scheduler only for recurring safety-net or sweep jobs.
- Increase `OUTBOX_CONCURRENCY` gradually; keep `PDF_RENDER_CONCURRENCY` conservative to avoid Playwright/browser pressure.

## Invoice PDF wait endpoint

- API route: `GET /invoices/:invoiceId/pdf?waitMs=<ms>`.
- API remains async-safe: it does not render PDF inline with the request path that waits.
- It enqueues `invoice.pdf.render.requested`, waits on readiness state, and returns once READY/FAILED or the wait budget expires.
