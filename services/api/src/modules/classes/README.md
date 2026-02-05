# Classes Module

Bounded context for tutoring group classes, sessions, attendance, and monthly billing.

## API Overview

Base path: `/classes`

### Class Groups

- `GET /classes/class-groups` list with standard params `q`, `page`, `pageSize`, `sort`, `filters`
- `POST /classes/class-groups` create (idempotent)
- `GET /classes/class-groups/:id` get
- `PATCH /classes/class-groups/:id` update (including `status`)

### Sessions

- `GET /classes/sessions` list (filters: `classGroupId`, `dateFrom`, `dateTo`, `status`)
- `POST /classes/sessions` create (idempotent)
- `POST /classes/sessions/recurring` create recurring (idempotent; dedupes by `classGroupId+startsAt`)
- `GET /classes/sessions/:id` get
- `PATCH /classes/sessions/:id` update

### Enrollments

- `GET /classes/enrollments` list (filters: `classGroupId`, `clientId`, `isActive`)
- `POST /classes/enrollments` upsert (idempotent)
- `PATCH /classes/enrollments/:id` update

### Attendance

- `GET /classes/sessions/:id/attendance`
- `PUT /classes/sessions/:id/attendance` bulk upsert (idempotent)

### Billing

- `GET /classes/billing/preview?month=YYYY-MM`
- `POST /classes/billing/runs` create billing run + invoices
- `POST /classes/billing/runs/:id/lock` lock a billing month

## Billing Rules

- Billable amount per student = **count of billable attendances for DONE sessions** × **price per session**.
- Price per session resolution:
  1. Enrollment `priceOverridePerSession` (if set)
  2. ClassGroup `defaultPricePerSession`
- Attendance billable defaults:
  - `PRESENT` → billable
  - `MAKEUP` → billable
  - `ABSENT` → not billable
  - `EXCUSED` → not billable
- Month boundaries computed in `Europe/Berlin` timezone, sessions stored as UTC.
- When a month has a billing run in `INVOICES_CREATED` or `LOCKED`, session/attendance edits are blocked.

## Internal Worker Endpoint

The worker scheduler triggers billing runs via an internal endpoint secured by `x-service-token`.

- `POST /internal/classes/billing/runs`
  - Headers: `x-tenant-id`, `x-workspace-id`, optional `x-service-token`, optional `Idempotency-Key`
  - Body: `{ "month": "YYYY-MM", "createInvoices": true, "sendInvoices": false }`

Worker config (env):

- `WORKER_API_BASE_URL`
- `WORKER_API_SERVICE_TOKEN`
- `CLASSES_BILLING_RUN_ENABLED`
- `CLASSES_BILLING_RUN_TIME` (default `02:00`)
- `CLASSES_BILLING_RUN_TIMEZONE` (default `Europe/Berlin`)

## Idempotency Keys

The module accepts `Idempotency-Key` or `X-Idempotency-Key` headers on all write routes.

- `POST /classes/class-groups`: `classes.class-group.create`
- `POST /classes/sessions`: `classes.session.create`
- `POST /classes/sessions/recurring`: `classes.session.recurring.create`
- `POST /classes/enrollments`: `classes.enrollment.upsert`
- `PUT /classes/sessions/:id/attendance`: `classes.attendance.bulk-upsert`
- `POST /classes/billing/runs`: `classes.billing.run.create`
  - Default key if none supplied: `tenantId:YYYY-MM`
  - Per-invoice idempotency: `tenantId:YYYY-MM:clientId` (stored in `ClassBillingInvoiceLink`)
