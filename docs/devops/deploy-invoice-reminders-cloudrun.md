# Scheduled invoice reminders on Cloud Run (Tick mode)

This document describes how to run invoice reminders through the worker **tick** job when your worker runtime is **Google Cloud Run**.

Invoice reminder processing runs inside `node dist/main.js tick` via the `invoiceReminders` runner.

## Recommended deployment option

Use a **Cloud Run Job** for the worker tick, executed on a schedule via **Cloud Scheduler trigger** (Cloud Run console “Triggers” tab).

---

## What runs on the schedule

A single job run executes the use case:

- Load reminder policy from Settings (tenant/workspace):
  - startAfterDays, maxReminders, sendOnlyOnWeekdays
- Find `InvoiceReminderState` rows due: `nextReminderAt <= now`
- For each, re-check invoice status is not PAID/CANCELED
- Send reminder email to payer
- Update state (increment count, set lastReminderAt, compute nextReminderAt or stop)
- Idempotent + safe to retry (per-invoice lock + idempotency key)

---

## Prerequisites

1. Enable APIs (project-wide):

- Cloud Run
- Cloud Scheduler

2. Service account(s):

- A **job runtime** service account for the Job container.
- A **Scheduler caller** service account if you create Scheduler jobs manually (not needed when using the Cloud Run “Triggers” UI).

3. Required IAM roles depend on your org policy, but Google’s docs call out:

- **Execute Cloud Run Jobs**: `roles/run.invoker` (CLI) or `roles/run.developer` (console) citeturn0search7turn0search4
- **Create schedules**: `roles/cloudscheduler.admin` (includes `cloudscheduler.jobs.create`) citeturn0search1turn0search3
- **Attach service accounts**: `roles/iam.serviceAccountUser` (needed to attach a service identity) citeturn0search0turn0search11

---

## Deploy as a Cloud Run Job

### Inputs you need

- `PROJECT_ID`
- `REGION` (e.g., `europe-west1`)
- container image URI (Artifact Registry), e.g. `REGION-docker.pkg.dev/PROJECT_ID/corely/worker:SHA`
- runtime service account (e.g., `corely-worker@PROJECT_ID.iam.gserviceaccount.com`)

### Create / update the Job (gcloud)

> Adjust the command/args to match your repo (Node, Python, etc.). The key idea is: **run a single tick and exit**.

Example pattern:

```bash
gcloud run jobs create corely-worker-tick \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_URI" \
  --service-account="corely-worker@$PROJECT_ID.iam.gserviceaccount.com" \
  --command="node" \
  --args="dist/main.js,tick" \
  --set-env-vars="NODE_ENV=production,WORKER_TICK_RUNNERS=outbox,invoiceReminders"
```

To update later:

```bash
gcloud run jobs update corely-worker-tick \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_URI"
```

> If you already use Cloud Run Jobs for other tasks, reuse the same job runner conventions.

---

## Schedule the Job

### Method A (recommended): Cloud Run console trigger

1. Go to **Cloud Run → Jobs**
2. Select `corely-worker-tick`
3. Open the **Triggers** tab
4. Click **Add Scheduler Trigger**
5. Set schedule:
   - e.g. daily at 08:00 Berlin:
     - Cron: `0 8 * * *`
     - Time zone: `Europe/Berlin`
6. Save

This uses Cloud Scheduler under the hood.

### Method B: Cloud Scheduler directly (advanced)

If you must manage schedules centrally in Cloud Scheduler, you can create a Scheduler job that triggers execution.

---

## Recommended schedule

- **Daily** is enough even if reminders are “every 7 days”:
  - Your job sends only when `nextReminderAt <= now`.
- Suggested: `0 8 * * *` with timezone `Europe/Berlin`.

---

## Observability

- Log one structured line per reminder attempt:
  - tenantId, invoiceId, reminderCount, result
- Add metrics if you have them:
  - reminders_sent_total, reminders_failed_total, reminders_due_count

---

## Operational safety checklist

- ✅ Scheduler runner advisory lock (`pg_try_advisory_xact_lock`) so only one replica executes reminders per tick
- ✅ Row-level locking (or atomic updates) when claiming due reminder states
- ✅ Idempotency key per (tenantId, invoiceId, reminderCount)
- ✅ Stops automatically on PAID/CANCELED
- ✅ “Send reminder now” UI uses same sending pipeline and updates `InvoiceReminderState`

---

## Troubleshooting

- If no reminders are sent:
  - Verify invoices have `sentAt` set and `InvoiceReminderState.nextReminderAt` is populated
  - Verify reminder policy `enabled=true`
  - Check Cloud Run Job logs for “due count”
- If duplicates are sent:
  - Ensure row claiming uses locking and the send operation is idempotent

---

## Required env vars for reminders in tick

- `WORKER_API_BASE_URL`: Base URL for the API service (used to call the internal reminders endpoint).
- `WORKER_API_SERVICE_TOKEN`: Service token passed as `x-service-token` to authorize internal calls.
- `WORKER_TICK_RUNNERS`: should include `invoiceReminders` (for example `outbox,invoiceReminders`).

---

## Reminder policy storage

Reminder policy is stored in `Workspace.invoiceSettings.reminderPolicy`:

- `startAfterDays`: days after `sentAt` before the first reminder
- `maxReminders`: max number of reminders to send
- `sendOnlyOnWeekdays`: if true, schedule reminders on weekdays only

Set `maxReminders=0` or `startAfterDays=0` to disable reminders for a workspace.
