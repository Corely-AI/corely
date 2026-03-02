# Scheduling

This repo now uses a replaceable scheduling port for delayed/background job triggers.

## Job Scheduler Port

Worker scheduling abstractions live in:

- `services/worker/src/shared/scheduling/job-scheduler.port.ts`
- `services/worker/src/shared/scheduling/job-scheduler.module.ts`

Current supported jobs:

- `worker.tick`
- `crm.sequence.executeStep`

Port contract (simplified):

- `schedule(job, payload, { runAt?, idempotencyKey?, traceId? })`
- optional `cancel(externalRef)`

## Drivers

### Cloud Tasks driver

File: `services/worker/src/shared/scheduling/drivers/cloudtasks.job-scheduler.ts`

Maps jobs to worker internal endpoints:

- `worker.tick` -> `POST /internal/tick`
- `crm.sequence.executeStep` -> `POST /internal/crm/sequences/execute-step`

For `crm.sequence.executeStep`, if `runAt` is beyond Cloud Tasks horizon, the driver schedules a checkpoint delivery at ~29 days. The checkpoint payload causes worker to re-schedule at the original target time.

### Noop driver

File: `services/worker/src/shared/scheduling/drivers/noop.job-scheduler.ts`

Used for local/test mode when durable scheduling is not desired.

## Environment Variables

Scheduler selection:

- `JOB_SCHEDULER_DRIVER=cloudtasks|noop`

Cloud Tasks driver config:

- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `CLOUD_TASKS_QUEUE_NAME`
- `WORKER_BASE_URL` (public worker base URL)
- `CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL` (optional but recommended)
- `INTERNAL_WORKER_KEY` (optional header auth for worker internal endpoints)

## Internal Endpoints

Worker:

- `POST /internal/schedule`
  - durable scheduler entrypoint used by API
  - body: `{ jobName, payload, runAt?, idempotencyKey?, traceId? }`
- `POST /internal/tick`
- `POST /internal/crm/sequences/execute-step`

API:

- `POST /internal/crm/sequences/execute-step`
  - executes a single step idempotently and schedules next step

## CRM Sequence Model

Primary flow:

1. Enrollment creation schedules first `crm.sequence.executeStep` job.
2. Step execution endpoint is idempotent (safe under retries/parallel delivery).
3. On success, next step is scheduled.

Safety net:

- Worker runner `sequences_sweep` scans due enrollments and schedules missing jobs.
- Sweeper is bounded by row/time limits.

## Cloud Scheduler (sweeper) example

Use Cloud Scheduler to trigger periodic sweeps:

- Cron: `*/5 * * * *`
- HTTP target: `POST https://<worker-base-url>/internal/tick`
- Body: `{ "runnerNames": ["sequences_sweep"] }`
- Header: `x-worker-key: <INTERNAL_WORKER_KEY>` (if configured)

This runner should be treated as a safety net, not the primary execution path.
