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

API -> worker trigger config (required for API-triggered ticks/scheduling):

- `INTERNAL_WORKER_URL` (worker base URL used by API when calling `/internal/schedule` and fallback `/internal/tick`)
- `INTERNAL_WORKER_KEY` (must match worker value when worker auth is enabled)
- `API_BASE_URL` (currently used by invoice PDF worker client adapter for `/internal/invoices/:invoiceId/pdf`)

Workflow queue config (if enabling workflow Cloud Tasks driver):

- `WORKFLOW_QUEUE_DRIVER=cloudtasks`
- `GOOGLE_CLOUD_PROJECT`
- `WORKFLOW_CLOUDTASKS_LOCATION`
- `WORKFLOW_CLOUDTASKS_TARGET_BASE_URL`
- `WORKFLOW_CLOUDTASKS_QUEUE_PREFIX` (optional)
- `WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT` (optional)

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

## Cloud Run + Cloud Tasks Production Checklist

1. Enable Cloud Tasks API:
   `gcloud services enable cloudtasks.googleapis.com`
2. Pick a valid Cloud Tasks location for your project:
   `gcloud tasks locations list`
   Note: Cloud Tasks location availability does not always match Cloud Run regions (for example, `europe-west4` may be unavailable while Cloud Run is in `europe-west4`).
3. Create/verify scheduler queue:
   `gcloud tasks queues create <queue> --location=<tasks-location>`
4. Configure worker service env:
   `JOB_SCHEDULER_DRIVER=cloudtasks`
   `GCP_PROJECT_ID`, `GCP_LOCATION`, `CLOUD_TASKS_QUEUE_NAME`
   `WORKER_BASE_URL`, `INTERNAL_WORKER_KEY`
5. Configure API service env:
   `INTERNAL_WORKER_URL`, `INTERNAL_WORKER_KEY`
   `API_BASE_URL` set to worker base URL for invoice PDF internal calls
6. Ensure worker endpoint is invokable by task/API caller:
   If not using OIDC tokens on task HTTP requests, worker must allow invoker access and rely on `x-worker-key` for internal auth.
7. Size worker for burst/background loads:
   For PDF and outbox-heavy workloads, start with at least `1Gi` memory and low concurrency (`1`) to reduce OOM/`503` during task dispatch.

## Troubleshooting

- Symptom: invoice PDF endpoint keeps returning `202 PENDING`
  - Check API logs for worker scheduling warnings and missing `INTERNAL_WORKER_URL`.
  - Check worker logs for task dispatch and OOM (`503`, malformed response, container killed).
- Symptom: `/internal/schedule` succeeds but no job actually runs
  - Verify `JOB_SCHEDULER_DRIVER` is not `noop`.
  - Verify Cloud Tasks queue exists in configured `GCP_LOCATION`.
- Symptom: Cloud Tasks dispatch returns `403`
  - Verify Cloud Run invoker IAM and/or configure `CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL` with proper permissions.
  - Verify `INTERNAL_WORKER_KEY` value matches between API and worker.
