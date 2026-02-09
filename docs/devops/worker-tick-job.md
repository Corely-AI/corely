# Worker Runtime Modes

Corely worker has two runtime modes:

1. Background mode (default): long-running process that repeatedly executes tick.
2. Tick mode (`node dist/main.js tick`): executes one tick and exits.

Design rule: tick is the single source of truth for scheduled work. Background mode must only loop tick and must not implement separate polling logic.

## What a Tick Does

Each tick run:

1. Boots the worker application context.
2. Acquires a global advisory lock (`pg_try_advisory_lock`) to ensure only one tick runs at a time.
3. Executes a configured list of runners sequentially (default: `outbox,invoiceReminders,classesBilling`).
4. Each runner respects a time and item budget.
5. Logs a summary and exits (tick mode) or sleeps before next iteration (background mode).

Background loop behavior:

- Immediate first tick on startup.
- Delay + jitter between iterations.
- Error backoff on failed tick.
- Graceful shutdown on `SIGINT`/`SIGTERM` (no new tick starts; in-flight tick finishes).
- No overlapping ticks within one process.

## Deployment

### 1. Create Cloud Run Job

Create a Cloud Run Job named `corely-worker-tick`.

**Command:**

```bash
node dist/main.js tick
```

**Environment Variables:**

| Variable                            | Default                                  | Description                                                |
| :---------------------------------- | :--------------------------------------- | :--------------------------------------------------------- |
| `WORKER_TICK_RUNNERS`               | `outbox,invoiceReminders,classesBilling` | CSV list of runners to execute.                            |
| `WORKER_TICK_OVERALL_MAX_MS`        | `480000` (8m)                            | Max duration for the entire tick.                          |
| `WORKER_TICK_RUNNER_MAX_MS`         | `60000` (1m)                             | Max duration per runner.                                   |
| `WORKER_TICK_RUNNER_MAX_ITEMS`      | `200`                                    | Max items (e.g. messages, workspaces) per runner.          |
| `WORKER_TICK_SHARD_INDEX`           | -                                        | (Optional) Shard index for multi-tenant scaling (0-based). |
| `WORKER_TICK_SHARD_COUNT`           | -                                        | (Optional) Total shards.                                   |
| `WORKER_TICK_LOOP_INTERVAL_MS`      | `10000` (10s)                            | Base delay between ticks in background mode.               |
| `WORKER_TICK_LOOP_MAX_JITTER_MS`    | `2000` (2s)                              | Additional random delay added to each background loop.     |
| `WORKER_TICK_LOOP_ERROR_BACKOFF_MS` | `30000` (30s)                            | Base delay after a failed tick in background mode.         |

**Resources:**

- CPU: 1
- Memory: 512MiB (Adjust based on load)
- Timeout: 600s (10 minutes) - Must be > `WORKER_TICK_OVERALL_MAX_MS`.

### 2. Schedule

Create a Cloud Scheduler trigger to invoke the Cloud Run Job.

- **Schedule**: `*/10 * * * *` (Every 10 minutes)
- **Timezone**: `Europe/Berlin`
- **Target**: HTTP (via Cloud Run Job integration or direct invocation)

## Migration

1.  Deploy the new `corely-worker-tick` job.
2.  Verify logs to ensure it runs successfully and processes items.
3.  **Disable** old specific schedulers:
    - Invoice Reminder Scheduler (`0 8 * * *`)
    - Any other ad-hoc worker triggers.

## Adding New Runners

1. Implement `Runner` interface in `services/worker/src/application/runner.interface.ts`.
2. Inject the service into `TickOrchestrator`.
3. Add the runner name to `WORKER_TICK_RUNNERS` env var.

## When to Use Which Mode

- Production recurring jobs (Cloud Run Job / CronJob): tick mode (`node dist/main.js tick`).
- Long-running worker deployment: background mode (default command without `tick` argument).
- Local development (`pnpm dev:worker`): background mode for continuous execution.
- Debugging one iteration: tick mode to run once and inspect logs deterministically.
