# Scheduling

This repo uses:

- Cloud Scheduler for recurring work
- Cloud Tasks for delayed and event-driven work
- API-hosted internal endpoints for execution

Background scheduling abstractions live in:

- `services/api/src/modules/background/runtime/shared/scheduling/job-scheduler.port.ts`
- `services/api/src/modules/background/runtime/shared/scheduling/job-scheduler.module.ts`

Current supported jobs include the outbox wakeup job and delayed CRM sequence-step execution.

## Drivers

### Cloud Tasks driver

File:

- `services/api/src/modules/background/runtime/shared/scheduling/drivers/cloudtasks.job-scheduler.ts`

Job mapping:

- outbox wakeup -> `POST /internal/background/outbox/run`
- CRM sequence step -> `POST /internal/crm/sequences/execute-step`

For `crm.sequence.executeStep`, if `runAt` is beyond the Cloud Tasks scheduling horizon, the driver schedules a checkpoint delivery at about 29 days and re-schedules closer to the true target time.

### Noop driver

File:

- `services/api/src/modules/background/runtime/shared/scheduling/drivers/noop.job-scheduler.ts`

Used for local/test mode when durable scheduling is not desired.

## Environment variables

Scheduler selection:

- `JOB_SCHEDULER_DRIVER=cloudtasks|noop`

Cloud Tasks config:

- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `CLOUD_TASKS_QUEUE_NAME`
- `API_BASE_URL` or `INTERNAL_API_URL`
- `CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL` (optional but recommended)
- `WORKER_API_SERVICE_TOKEN` (optional internal auth token)

Compatibility fallbacks exist in code for older internal URLs/tokens, but new deployments should use the API base URL plus `WORKER_API_SERVICE_TOKEN`.

Workflow queue config:

- `WORKFLOW_QUEUE_DRIVER=cloudtasks`
- `GOOGLE_CLOUD_PROJECT`
- `WORKFLOW_CLOUDTASKS_LOCATION`
- `WORKFLOW_CLOUDTASKS_TARGET_BASE_URL`
- `WORKFLOW_CLOUDTASKS_QUEUE_PREFIX` (optional)
- `WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT` (optional)

## Internal endpoints

API:

- `POST /internal/background/outbox/run`
- `POST /internal/invoices/:invoiceId/pdf`
- `POST /internal/crm/sequences/execute-step`

## CRM sequence model

Primary flow:

1. Enrollment creation schedules the first `crm.sequence.executeStep` job.
2. The step execution endpoint is idempotent.
3. On success, the next step is scheduled.

Safety net:

- Sequence sweeps scan due enrollments and schedule missing jobs.
- The sweeper is bounded by row/time limits.

## Cloud Scheduler example

Use Cloud Scheduler to trigger recurring sequence sweeps:

- Cron: `*/5 * * * *`
- HTTP target: `POST https://<api-base-url>/internal/crm/sequences/run`
- Header: `x-service-token: <WORKER_API_SERVICE_TOKEN>` when configured

Treat this as a safety net, not the primary execution path.

## Cloud Run + Cloud Tasks checklist

1. Enable Cloud Tasks API:
   `gcloud services enable cloudtasks.googleapis.com`
2. Pick a valid Cloud Tasks location:
   `gcloud tasks locations list`
3. Create or verify the queue:
   `gcloud tasks queues create <queue> --location=<tasks-location>`
4. Configure API env:
   `JOB_SCHEDULER_DRIVER=cloudtasks`
   `GCP_PROJECT_ID`, `GCP_LOCATION`, `CLOUD_TASKS_QUEUE_NAME`
   `API_BASE_URL` or `INTERNAL_API_URL`
   `WORKER_API_SERVICE_TOKEN`
5. Ensure API internal endpoints are invokable by Cloud Tasks:
   use OIDC where possible; otherwise rely on `x-service-token`
6. Size API/background capacity for burst loads:
   for PDF/outbox-heavy workloads, start conservatively on concurrency

## Troubleshooting

- Symptom: invoice PDF endpoint keeps returning `202 PENDING`
  - Check API logs for missing `API_BASE_URL` / `INTERNAL_API_URL`
  - Check API logs for task dispatch errors or OOMs
- Symptom: Cloud Task is created but nothing runs
  - Verify `JOB_SCHEDULER_DRIVER` is not `noop`
  - Verify the queue exists in `GCP_LOCATION`
- Symptom: Cloud Tasks dispatch returns `403`
  - Verify Cloud Run invoker IAM and `CLOUD_TASKS_INVOKER_SERVICE_ACCOUNT_EMAIL`
  - Verify `WORKER_API_SERVICE_TOKEN` matches between caller and API
