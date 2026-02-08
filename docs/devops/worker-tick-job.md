# Worker Tick Job & Scheduling

We have moved to a single "Tick" based worker execution model for scheduled tasks.
Instead of maintaining multiple Cloud Scheduler triggers for different tasks (e.g. invoice reminders, outbox polling fallback, etc.), we now run a single **Cloud Run Job** that executes a "tick".

## Architecture

The `worker tick` command:

1.  Boots the worker application context.
2.  Acquires a global advisory lock (`pg_try_advisory_lock`) to ensure only one tick runs at a time.
3.  Executes a configured list of runners sequentially (e.g. `outbox`, `invoiceReminders`).
4.  Each runner respects a time and item budget to ensure the Cloud Run Job completes within limits.
5.  Logs a summary and exits.

## Deployment

### 1. Create Cloud Run Job

Create a Cloud Run Job named `corely-worker-tick`.

**Command:**

```bash
node dist/main.js tick
```

**Environment Variables:**

| Variable                       | Default                   | Description                                                  |
| :----------------------------- | :------------------------ | :----------------------------------------------------------- |
| `WORKER_TICK_RUNNERS`          | `outbox,invoiceReminders` | CSV list of runners to execute.                              |
| `WORKER_TICK_OVERALL_MAX_MS`   | `480000` (8m)             | Max duration for the entire tick.                            |
| `WORKER_TICK_RUNNER_MAX_MS`    | `60000` (1m)              | Max duration per runner.                                     |
| `WORKER_TICK_RUNNER_MAX_ITEMS` | `200`                     | Max items (e.g. messages, workspaces) per runner.            |
| `WORKER_TICK_SHARD_INDEX`      | -                         | (Optional) Shard index for multi-tenant scaling (0-based).   |
| `WORKER_TICK_SHARD_COUNT`      | -                         | (Optional) Total shards.                                     |
| `WORKER_DISABLE_POLLING`       | `true`                    | Should be set to `true` to prevent background polling loops. |

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
