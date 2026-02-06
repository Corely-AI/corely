# Classes Module

## Overview

The Classes module models tutoring groups, sessions, enrollments, attendance tracking, and monthly billing. It is a backend module under `services/api/src/modules/classes` with corresponding web UI under `apps/web/src/modules/classes`.

## Data Model (Prisma)

Schema file: `packages/data/prisma/schema/79_classes.prisma` (schema `crm`).

- `ClassGroup`
- `ClassSession`
- `ClassEnrollment`
- `ClassAttendance`
- `ClassMonthlyBillingRun`
- `ClassBillingInvoiceLink`

Key fields and relationships:

- `ClassGroup` holds `name`, `subject`, `level`, `defaultPricePerSession`, `currency`, `schedulePattern`, and `status`.
- `ClassSession` belongs to a class group, has `startsAt`, optional `endsAt`, `status`, and notes.
- `ClassEnrollment` links a student and payer (`studentClientId`, `payerClientId`) to a class group with optional `priceOverridePerSession`.
- `ClassAttendance` records per-enrollment attendance for a session with a `status` and `billable` flag.
- `ClassMonthlyBillingRun` stores monthly runs (`month` as `YYYY-MM`) and status.
- `ClassBillingInvoiceLink` maps billing runs to invoices per payer.

## API Surface

Base path: `/classes` (see `services/api/src/modules/classes/http/classes.controller.ts`).

Class groups:

- `GET /classes/class-groups`
- `POST /classes/class-groups`
- `GET /classes/class-groups/:id`
- `PATCH /classes/class-groups/:id`

Sessions:

- `GET /classes/sessions`
- `POST /classes/sessions`
- `POST /classes/sessions/recurring`
- `GET /classes/sessions/:id`
- `PATCH /classes/sessions/:id`

Enrollments:

- `GET /classes/enrollments`
- `POST /classes/enrollments`
- `PATCH /classes/enrollments/:id`

Attendance:

- `GET /classes/sessions/:id/attendance`
- `PUT /classes/sessions/:id/attendance`

Billing:

- `GET /classes/billing/preview?month=YYYY-MM`
- `POST /classes/billing/runs`
- `POST /classes/billing/runs/:id/lock`

## Billing Rules

- Billable amount per student = count of billable attendances for `DONE` sessions × price per session.
- Price per session resolution:
- Enrollment `priceOverridePerSession` if set.
- Otherwise class group `defaultPricePerSession`.
- Attendance billable defaults:
- `PRESENT` and `MAKEUP` are billable.
- `ABSENT` and `EXCUSED` are not billable.
- Month boundaries are computed in `Europe/Berlin` timezone, sessions stored in UTC.
- When a month is in `INVOICES_CREATED` or `LOCKED`, session and attendance edits are blocked.

## Permissions

Permissions enforced by the API controller:

- `classes.read` for read endpoints.
- `classes.write` for create/update endpoints.
- `classes.billing` for preview, run, and lock billing endpoints.

## Idempotency

Write endpoints support `Idempotency-Key` / `X-Idempotency-Key`. See `services/api/src/modules/classes/README.md` for exact keys and defaulting rules.

## Frontend Surface

Routes (see `apps/web/src/app/router/app-shell-routes.tsx`):

- `/class-groups` (list)
- `/class-groups/new`
- `/class-groups/:id`
- `/class-groups/:id/edit`
- `/sessions` (list)
- `/sessions/:id`
- `/billing` (classes billing)

Screens live in `apps/web/src/modules/classes/screens`.
