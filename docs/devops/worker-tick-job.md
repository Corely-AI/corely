# Worker Runtime Modes & Outbox Semantics

Corely worker has two runtime modes:

1. `background` (default): long-running process that repeatedly calls `tick`.
2. `tick` (`node dist/main.js tick`): runs one tick and exits.

Design rule: `tick` is the single source of truth for scheduled/background work. Background mode only loops `tick` and does not duplicate scheduler logic.

## Runtime behavior

### Tick mode

- Boots worker context.
- Runs configured runners in order (default: `outbox,invoiceReminders,classesBilling`).
- Exits after one pass.

Use this for:

- Cloud Run Job / CronJob / Kubernetes CronJob execution.
- CI/debugging deterministic one-shot runs.

### Background mode

- Immediate first tick at startup.
- Repeats tick with:
  - fast follow-up when work was processed,
  - exponential idle backoff + jitter when no work was processed,
  - error backoff on failed tick.
- Graceful shutdown on `SIGINT`/`SIGTERM`:
  - stop starting new ticks,
  - wait for in-flight tick up to shutdown timeout,
  - close Nest app/resources.
- In-process overlap prevention: only one tick runs at a time per worker process.

Recommended for production low-latency async processing (for example invoice PDF generation and email delivery).

## Outbox processing semantics

Outbox delivery is durable and multi-replica safe.

### Claim strategy

- Claim uses Postgres row locking with `FOR UPDATE SKIP LOCKED`.
- Claim updates rows to `PROCESSING` with lease fields:
  - `lockedBy`
  - `lockedUntil`
- Claim transaction is short-lived; actual handler work runs outside claim transaction.

### Lifecycle

`PENDING -> PROCESSING -> SENT | FAILED`

- `PENDING`: waiting, and `availableAt <= now`.
- `PROCESSING`: claimed by one worker with lease.
- `SENT`: handler completed successfully.
- `FAILED`: terminal failure (non-retryable or attempts exhausted).

### Lease and reclaim

- On claim, worker sets `lockedUntil = now + OUTBOX_LEASE_DURATION_MS`.
- Worker heartbeats lease while handler is running (`OUTBOX_LEASE_HEARTBEAT_MS`).
- If worker crashes and lease expires, another worker can reclaim the event.

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

## Scheduler singleton behavior (multi-replica)

Outbox consumption is allowed on all replicas.

Singleton scheduler runners (`invoiceReminders`, `classesBilling`) are protected by distributed advisory transaction locks:

- `pg_try_advisory_xact_lock` via runner lock key.
- If lock is not acquired, runner is skipped for that tick on that replica.

This allows horizontal outbox scaling while preventing duplicate periodic scheduler execution.

## Config reference

### Tick runner selection and budgets

| Variable                       | Default                                  | Purpose                   |
| ------------------------------ | ---------------------------------------- | ------------------------- |
| `WORKER_TICK_RUNNERS`          | `outbox,invoiceReminders,classesBilling` | CSV list of runners       |
| `WORKER_TICK_OVERALL_MAX_MS`   | `480000`                                 | Max total tick duration   |
| `WORKER_TICK_RUNNER_MAX_MS`    | `60000`                                  | Max per-runner duration   |
| `WORKER_TICK_RUNNER_MAX_ITEMS` | `200`                                    | Max per-runner work items |
| `WORKER_TICK_SHARD_INDEX`      | unset                                    | Optional shard index      |
| `WORKER_TICK_SHARD_COUNT`      | unset                                    | Optional shard count      |

### Background loop timing

| Variable                            | Default | Purpose                                 |
| ----------------------------------- | ------- | --------------------------------------- |
| `WORKER_BUSY_LOOP_DELAY_MS`         | `250`   | Delay when previous tick processed work |
| `WORKER_IDLE_BACKOFF_MIN_MS`        | `1000`  | Idle backoff floor                      |
| `WORKER_IDLE_BACKOFF_MAX_MS`        | `30000` | Idle backoff cap                        |
| `WORKER_IDLE_BACKOFF_JITTER_MS`     | `500`   | Idle/busy jitter                        |
| `WORKER_TICK_LOOP_ERROR_BACKOFF_MS` | `30000` | Delay after failed tick                 |
| `WORKER_TICK_LOOP_MAX_JITTER_MS`    | `2000`  | Extra jitter for error backoff          |
| `WORKER_SHUTDOWN_TIMEOUT_MS`        | `30000` | Graceful shutdown wait cap              |

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

| Variable                   | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `WORKER_API_BASE_URL`      | API base URL for internal scheduler endpoints |
| `WORKER_API_SERVICE_TOKEN` | Internal auth token (`x-service-token`)       |

### Scheduler lock keys

| Runner             | Advisory lock key                   |
| ------------------ | ----------------------------------- |
| `invoiceReminders` | `worker:scheduler:invoiceReminders` |
| `classesBilling`   | `worker:scheduler:classesBilling`   |

## Operational notes

- Prefer adding worker replicas to reduce queue latency before raising per-process concurrency aggressively.
- Increase `OUTBOX_CONCURRENCY` gradually; keep `PDF_RENDER_CONCURRENCY` conservative to avoid Playwright/browser pressure.
- Watch queue health:
  - due pending count,
  - oldest pending age,
  - failure rate and retry churn,
  - per-tick processed count and duration.
- Use `tick` mode for scheduled jobs, but do not rely on cron-only ticks for user-facing low-latency actions (PDF/email); background workers are recommended for near-real-time processing.

## Invoice PDF wait endpoint

- API route: `GET /invoices/:invoiceId/pdf?waitMs=<ms>`.
- API remains async-safe: it does **not** render PDF in-process. It only:
  - ensures `invoice.pdf.render.requested` is enqueued (idempotent),
  - waits on document readiness state (`platform.Document` + `platform.File`),
  - returns once READY/FAILED or wait budget expires.
- Response behavior:
  - `200`: `{ status: "READY", downloadUrl, ... }`
  - `202`: `{ status: "PENDING", retryAfterMs }` with `Retry-After` header
  - `422`: `{ error: "INVOICE_PDF_RENDER_FAILED", ... }`
- Guardrails:
  - default `waitMs=15000`, max `30000`
  - poll backoff is capped (no tight DB loop)
  - wait stops when client disconnects
- Infra guidance:
  - if upstream/proxy timeout is low, keep `waitMs` below timeout margin.
  - recommended request timeout is at least 35s when allowing max `waitMs=30000`.
