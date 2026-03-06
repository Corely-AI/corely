# Scheduled invoice reminders on Cloud Run

This document describes how to run invoice reminders as a scheduled background task when the API runtime is deployed on **Google Cloud Run**.

Invoice reminder processing should be triggered by a scheduler and handled by the API's internal reminders endpoint.

## Recommended deployment option

Use **Cloud Scheduler** to call the API internal reminders endpoint on a schedule.

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

## Deploy as a scheduled API call

### Inputs you need

- `PROJECT_ID`
- `REGION` (e.g., `europe-west1`)
- API base URL
- scheduler caller service account

### Create the Scheduler job (gcloud)

```bash
gcloud scheduler jobs create http corely-invoice-reminders \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --schedule="0 8 * * *" \
  --time-zone="Europe/Berlin" \
  --uri="https://<api-host>/internal/invoices/reminders/run" \
  --http-method=POST \
  --headers="Content-Type=application/json,x-service-token=${WORKER_API_SERVICE_TOKEN}" \
  --message-body='{}'
```

---

## Schedule the Job

You can also configure the same job from the Cloud Scheduler UI.

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

## Required env vars

- `API_BASE_URL`: Base URL for the API service.
- `WORKER_API_SERVICE_TOKEN`: Service token passed as `x-service-token` to authorize internal calls.

---

## Reminder policy storage

Reminder policy is stored in `Workspace.invoiceSettings.reminderPolicy`:

- `startAfterDays`: days after `sentAt` before the first reminder
- `maxReminders`: max number of reminders to send
- `sendOnlyOnWeekdays`: if true, schedule reminders on weekdays only

Set `maxReminders=0` or `startAfterDays=0` to disable reminders for a workspace.
